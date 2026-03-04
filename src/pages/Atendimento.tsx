import { useState, useEffect, useMemo, useCallback } from "react";
import { PanelRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ConversationsList } from "@/components/omnichannel/ConversationsList";
import { ConversationView } from "@/components/omnichannel/ConversationView";
import { CaseInfoPanel } from "@/components/omnichannel/CaseInfoPanel";
import { ServiceCountdownDialog } from "@/components/omnichannel/ServiceCountdownDialog";
import { AttendantStatusToggle } from "@/components/omnichannel/AttendantStatusToggle";
import { useServiceSession } from "@/hooks/useServiceSession";
import { useServiceQueue, ServiceQueueItem } from "@/hooks/useServiceQueue";
import { useComplaint } from "@/hooks/useComplaints";
import { useSlaSettingByKey } from "@/hooks/useSlaSettings";
import { useActiveSession } from "@/contexts/ActiveSessionContext";
import { toast } from "sonner";


export default function Atendimento() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showCasePanel, setShowCasePanel] = useState(true);
  const [currentSentiment, setCurrentSentiment] = useState<"positive" | "neutral" | "frustrated" | "angry" | null>("neutral");
  const [showCountdown, setShowCountdown] = useState(false);
  const [pendingConversation, setPendingConversation] = useState<string | null>(null);

  // SLA para countdown
  const countdownSla = useSlaSettingByKey("countdown_seconds");
  const countdownSeconds = countdownSla?.target_value ?? 10;
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
  } = useServiceSession();

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

  // Don't auto-select — let the attendant choose manually after finalizing

  // Quando o countdown termina ou usuário clica "Iniciar Agora"
  const handleCountdownStart = useCallback(() => {
    if (pendingConversation) {
      setSelectedConversation(pendingConversation);
      startSession(pendingConversation);
      setPendingConversation(null);
    }
  }, [pendingConversation, startSession]);

  const handleSelectConversation = useCallback((id: string) => {
    if (id === selectedConversation) return;
    // Mostrar countdown ao trocar de conversa
    setPendingConversation(id);
    setShowCountdown(true);
  }, [selectedConversation]);

  const handleCountdownClose = useCallback(() => {
    setShowCountdown(false);
    // Se não iniciou via botão, o countdown já chamou onStart
    if (pendingConversation && !selectedConversation) {
      setSelectedConversation(pendingConversation);
      startSession(pendingConversation);
    }
    setPendingConversation(null);
  }, [pendingConversation, selectedConversation, startSession]);

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
    // Update complaint type if changed
    if (complaintType && selectedQueueItem?.complaint_id) {
      await import("@/integrations/supabase/client").then(async ({ supabase }) => {
        await supabase
          .from("complaints")
          .update({ type: complaintType, updated_at: new Date().toISOString() })
          .eq("id", selectedQueueItem.complaint_id!);
      });
    }

    const success = await forwardToStep(stepId, notes, summary);
    if (success) {
      toast.success("Atendimento encaminhado com sucesso!");
    } else {
      toast.error("Erro ao encaminhar atendimento");
    }
    return success;
  };

  const handleEndSession = async () => {
    const success = await endSession();
    if (success) {
      toast.success("Atendimento finalizado com sucesso!");
      // Close the chat view after finalizing
      setSelectedConversation(null);
    } else {
      toast.error("Erro ao finalizar atendimento");
    }
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-130px)] overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <h2 className="text-sm font-medium text-muted-foreground">Atendimento</h2>
          <AttendantStatusToggle />
        </div>
        
        <div className="flex-1 overflow-hidden flex border rounded-lg bg-background">
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
              {!showCasePanel && (
                <div className="flex justify-end px-2 pt-2">
                  <button
                    onClick={() => setShowCasePanel(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                    title="Exibir painel de informações do caso"
                  >
                    <PanelRight className="h-4 w-4" />
                    <span>Exibir painel</span>
                  </button>
                </div>
              )}
              <ConversationView
                conversationId={selectedConversation}
                onForward={handleForward}
                onEndSession={handleEndSession}
                hasActiveSession={isSessionActive}
              />
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>Selecione um atendimento para começar</p>
            </div>
          )}
        </div>

        {/* Painel do Caso */}
        {showCasePanel && (
          <CaseInfoPanel
            caseData={currentCase}
            formattedDuration={formattedDuration}
            isSessionActive={currentSession?.status === "active"}
            sentiment={currentSentiment}
            onClose={() => setShowCasePanel(false)}
            tmaSla={tmaSla ? { target: tmaSla.target_value, warning: tmaSla.warning_threshold, critical: tmaSla.critical_threshold } : undefined}
          />
        )}
      </div>
      </div>
      {/* Countdown Dialog */}
      <ServiceCountdownDialog
        open={showCountdown}
        countdownSeconds={countdownSeconds}
        onStart={handleCountdownStart}
        onClose={handleCountdownClose}
        customerName={
          pendingConversation
            ? queueItems.find((q) => q.id === pendingConversation)?.customer_name || undefined
            : undefined
        }
      />
    </MainLayout>
  );
}
