import { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ConversationsList } from "@/components/omnichannel/ConversationsList";
import { ConversationView } from "@/components/omnichannel/ConversationView";
import { CaseInfoPanel } from "@/components/omnichannel/CaseInfoPanel";
import { useServiceSession } from "@/hooks/useServiceSession";
import { useServiceQueue } from "@/hooks/useServiceQueue";
import { useComplaint } from "@/hooks/useComplaints";
import { useSlaSettingByKey } from "@/hooks/useSlaSettings";
import { useActiveSession } from "@/contexts/ActiveSessionContext";
import { toast } from "sonner";


export default function Atendimento() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState<"positive" | "neutral" | "frustrated" | "angry" | null>("neutral");

  const tmaSla = useSlaSettingByKey("tma");

  // Buscar fila de atendimento
  const { data: queueItems = [] } = useServiceQueue({ excludeCompleted: true });

  const {
    currentSession,
    isLoading: sessionLoading,
    formattedDuration,
    startSession,
    endSession,
    forwardToStep,
  } = useServiceSession(selectedConversation);

  const { setHasActiveSession } = useActiveSession();
  const isSessionActive = currentSession?.status === "active";

  // Sync active session state to context (for sidebar navigation blocking)
  useEffect(() => {
    setHasActiveSession(!!isSessionActive);
    return () => setHasActiveSession(false);
  }, [isSessionActive, setHasActiveSession]);

  // Block browser close/refresh when session is active
  useEffect(() => {
    if (!isSessionActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isSessionActive]);

  const handleSelectConversation = useCallback(async (id: string) => {
    if (id === selectedConversation) return;
    setSelectedConversation(id);

    // Zerar contador de não lidas ao entrar na conversa
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase
      .from("service_queue" as any)
      .update({ unread_count: 0 })
      .eq("id", id);
  }, [selectedConversation]);

  const handleStartSession = useCallback(() => {
    if (selectedConversation) {
      startSession(selectedConversation);
    }
  }, [selectedConversation, startSession]);

  // Get linked complaint for AI triage
  const selectedQueueItem = queueItems.find(item => item.id === selectedConversation);
  const { data: linkedComplaint } = useComplaint(selectedQueueItem?.complaint_id || null);

  // Dados do caso atual baseado na fila
  const currentCase = useMemo(() => {
    if (!selectedConversation) return null;
    
    const queueItem = queueItems.find(item => item.id === selectedConversation);
    if (!queueItem) return null;

    const aiTriage = (linkedComplaint as any)?.ai_triage || null;

    return {
      id: queueItem.id,
      protocol: queueItem.complaint_id ? `REC-${queueItem.created_at.slice(0, 10).replace(/-/g, '')}` : undefined,
      type: queueItem.channel === 'web' ? 'Reclamação' : 
            queueItem.channel === 'voice' ? 'Atendimento por Voz' : 
            queueItem.channel,
      category: queueItem.subject,
      description: queueItem.last_message,
      status: queueItem.status,
      aiTriage,
      client: {
        name: queueItem.customer_name || "Anônimo",
        email: queueItem.customer_email,
        phone: queueItem.customer_phone,
        avatar: queueItem.customer_avatar,
      },
    };
  }, [selectedConversation, queueItems, linkedComplaint]);

  const handleForward = async (stepId: string, notes: string, summary?: string, complaintType?: string) => {
    // Se já tem complaint, atualizar tipo se necessário
    if (complaintType && selectedQueueItem?.complaint_id) {
      await import("@/integrations/supabase/client").then(async ({ supabase }) => {
        await supabase
          .from("complaints")
          .update({ type: complaintType, updated_at: new Date().toISOString() })
          .eq("id", selectedQueueItem.complaint_id!);
      });
    }

    const success = await forwardToStep(
      stepId,
      notes,
      summary,
      selectedConversation || undefined,
      selectedQueueItem?.complaint_id || undefined,
      complaintType,
      selectedQueueItem
        ? {
            customer_name: selectedQueueItem.customer_name,
            customer_email: selectedQueueItem.customer_email,
            customer_phone: selectedQueueItem.customer_phone,
            subject: selectedQueueItem.subject,
            last_message: selectedQueueItem.last_message,
            channel: selectedQueueItem.channel,
            whatsapp_conversation_id: selectedQueueItem.whatsapp_conversation_id,
          }
        : undefined,
    );
    if (success) {
      toast.success("Atendimento encaminhado com sucesso!");
      setSelectedConversation(null);
    } else {
      toast.error("Erro ao encaminhar atendimento");
    }
    return success;
  };

  const handleEndSession = async () => {
    const success = await endSession();
    // Sem sessão iniciada, endSession() retorna false — ConversationView já marca fila completed; mesmo assim fechamos
    if (success || !isSessionActive) {
      toast.success("Atendimento finalizado com sucesso!");
      setSelectedConversation(null);
    } else {
      toast.error("Erro ao finalizar atendimento");
    }
  };

  return (
    <MainLayout mainClassName="flex-1 overflow-hidden flex flex-col min-h-0 p-0">
      {/* main sem p-6: preenche área útil até a borda do content */}
      <div className="flex-1 min-h-0 h-full overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-hidden flex border rounded-lg bg-background">
        {/* Lista de conversas */}
        <div className="w-[350px] flex-shrink-0">
          <ConversationsList
            onSelect={handleSelectConversation}
            selectedId={selectedConversation}
          />
        </div>

        {/* Área de conversa */}
        <div className="flex-grow flex flex-col">
          {selectedConversation ? (
            <>
              <ConversationView
                conversationId={selectedConversation}
                onForward={handleForward}
                onEndSession={handleEndSession}
                hasActiveSession={isSessionActive}
                onStartSession={handleStartSession}
              />
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>Selecione um atendimento para começar</p>
            </div>
          )}
        </div>

        {/* Painel do Caso (sem botão fechar — sempre visível quando há conversa) */}
        <CaseInfoPanel
          caseData={currentCase}
          formattedDuration={formattedDuration}
          isSessionActive={currentSession?.status === "active"}
          sentiment={currentSentiment}
          tmaSla={tmaSla ? { target: tmaSla.target_value, warning: tmaSla.warning_threshold, critical: tmaSla.critical_threshold } : undefined}
        />
        </div>
      </div>
    </MainLayout>
  );
}
