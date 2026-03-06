import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ServiceSession = {
  id: string;
  complaint_id: string | null;
  conversation_id: string | null;
  attendant_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  forwarded_to_step_id: string | null;
  forward_notes: string | null;
  status: "active" | "completed" | "forwarded";
};

export function useServiceSession(conversationId?: string | null) {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<ServiceSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const loadedConvRef = useRef<string | null>(null);

  // Carregar sessão ativa da conversa selecionada
  useEffect(() => {
    if (!conversationId || !user) {
      setCurrentSession(null);
      setElapsedSeconds(0);
      loadedConvRef.current = null;
      return;
    }

    if (loadedConvRef.current === conversationId && currentSession?.conversation_id === conversationId) {
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      const { data } = await supabase
        .from("service_sessions")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;

      loadedConvRef.current = conversationId;

      if (data) {
        setCurrentSession(data as ServiceSession);
        const startTime = new Date(data.started_at).getTime();
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      } else {
        setCurrentSession(null);
        setElapsedSeconds(0);
      }
    };

    loadSession();

    return () => { cancelled = true; };
  }, [conversationId, user]);

  // Timer para calcular tempo decorrido
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (currentSession && currentSession.status === "active") {
      const startTime = new Date(currentSession.started_at).getTime();

      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));

      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSession]);

  const startSession = useCallback(
    async (convId: string, complaintId?: string) => {
      if (!user) return null;

      setIsLoading(true);
      try {
        // Verificar se já existe sessão ativa para esta conversa
        const { data: existingSession } = await supabase
          .from("service_sessions")
          .select("*")
          .eq("conversation_id", convId)
          .eq("status", "active")
          .maybeSingle();

        if (existingSession) {
          await supabase
            .from("service_queue")
            .update({ status: "in_progress" })
            .eq("id", convId);
          setCurrentSession(existingSession as ServiceSession);
          loadedConvRef.current = convId;
          return existingSession as ServiceSession;
        }

        // Criar nova sessão
        const { data, error } = await supabase
          .from("service_sessions")
          .insert({
            conversation_id: convId,
            complaint_id: complaintId || null,
            attendant_id: user.id,
            status: "active",
          })
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from("service_queue")
          .update({ status: "in_progress" })
          .eq("id", convId);

        setCurrentSession(data as ServiceSession);
        loadedConvRef.current = convId;
        setElapsedSeconds(0);
        return data as ServiceSession;
      } catch (error) {
        console.error("Erro ao iniciar sessão:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const endSession = useCallback(async () => {
    if (!currentSession) return false;

    setIsLoading(true);
    try {
      const endedAt = new Date().toISOString();
      const startedAt = new Date(currentSession.started_at).getTime();
      const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

      const { error } = await supabase
        .from("service_sessions")
        .update({
          ended_at: endedAt,
          duration_seconds: durationSeconds,
          status: "completed",
        })
        .eq("id", currentSession.id);

      if (error) throw error;

      setCurrentSession(null);
      setElapsedSeconds(0);
      return true;
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  const forwardToStep = useCallback(
    async (
      stepId: string,
      notes: string,
      summary?: string,
      fallbackConversationId?: string,
      fallbackComplaintId?: string,
      complaintType?: string,
      queueItemData?: {
        customer_name?: string | null;
        customer_email?: string | null;
        customer_phone?: string | null;
        subject?: string | null;
        last_message?: string | null;
        channel?: string | null;
        whatsapp_conversation_id?: string | null;
      },
    ) => {
      setIsLoading(true);
      try {
        // Encerrar sessão ativa se existir
        if (currentSession) {
          const endedAt = new Date().toISOString();
          const startedAt = new Date(currentSession.started_at).getTime();
          const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

          const { error } = await supabase
            .from("service_sessions")
            .update({
              ended_at: endedAt,
              duration_seconds: durationSeconds,
              status: "forwarded",
              forwarded_to_step_id: stepId,
              forward_notes: notes,
              ai_summary: summary || null,
            })
            .eq("id", currentSession.id);

          if (error) throw error;
        }

        let complaintId = currentSession?.complaint_id || fallbackComplaintId || null;
        const conversationId = currentSession?.conversation_id || fallbackConversationId || null;

        // Se não tem complaint linkada, criar uma nova
        if (!complaintId && conversationId) {
          const { data: protocolData, error: protocolError } = await supabase.rpc(
            "generate_complaint_protocol"
          );
          if (protocolError) throw protocolError;

          const { data: newComplaint, error: complaintError } = await supabase
            .from("complaints")
            .insert({
              protocol_number: protocolData as string,
              is_anonymous: false,
              reporter_name: queueItemData?.customer_name || null,
              reporter_email: queueItemData?.customer_email || null,
              reporter_phone: queueItemData?.customer_phone || null,
              type: complaintType || "reclamacao",
              category: queueItemData?.subject || "Atendimento",
              description: notes || queueItemData?.last_message || "Encaminhado via atendimento ao cliente.",
              channel: queueItemData?.channel || "whatsapp",
              status: "em_analise",
              current_workflow_step_id: stepId,
            })
            .select()
            .single();

          if (complaintError) throw complaintError;
          complaintId = newComplaint.id;

          // Linkar a complaint ao item da fila
          await supabase
            .from("service_queue" as any)
            .update({ complaint_id: complaintId })
            .eq("id", conversationId);

          // Audit log de criação
          await supabase.from("complaint_audit_log" as any).insert({
            complaint_id: complaintId,
            action: "created",
            field_changed: "status",
            old_value: null,
            new_value: "em_analise",
            notes: "Solicitação criada a partir do atendimento via chat",
            user_id: user?.id || null,
          });
        }

        // Atualizar complaint existente com workflow step
        if (complaintId && (currentSession?.complaint_id || fallbackComplaintId)) {
          const oldStepId = await supabase
            .from("complaints")
            .select("current_workflow_step_id")
            .eq("id", complaintId)
            .maybeSingle();

          await supabase
            .from("complaints")
            .update({
              current_workflow_step_id: stepId,
              status: "em_analise",
              updated_at: new Date().toISOString(),
            })
            .eq("id", complaintId);

          await supabase.from("complaint_audit_log" as any).insert({
            complaint_id: complaintId,
            action: "workflow_step_advanced",
            field_changed: "current_workflow_step_id",
            old_value: oldStepId?.data?.current_workflow_step_id || null,
            new_value: stepId,
            notes: notes || "Encaminhado via atendimento",
            user_id: user?.id || null,
          });
        }

        // Marcar item na fila como encaminhado
        if (conversationId) {
          await supabase
            .from("service_queue" as any)
            .update({ status: "forwarded" })
            .eq("id", conversationId);
        }

        setCurrentSession(null);
        setElapsedSeconds(0);
        return true;
      } catch (error) {
        console.error("Erro ao encaminhar sessão:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession, user]
  );

  const updateSentiment = useCallback(
    async (sentiment: string) => {
      if (!currentSession) return false;

      try {
        const { error } = await supabase
          .from("service_sessions")
          .update({ ai_sentiment: sentiment })
          .eq("id", currentSession.id);

        if (error) throw error;

        setCurrentSession((prev) =>
          prev ? { ...prev, ai_sentiment: sentiment } : null
        );
        return true;
      } catch (error) {
        console.error("Erro ao atualizar sentimento:", error);
        return false;
      }
    },
    [currentSession]
  );

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    currentSession,
    isLoading,
    elapsedSeconds,
    formattedDuration: formatDuration(elapsedSeconds),
    startSession,
    endSession,
    forwardToStep,
    updateSentiment,
  };
}
