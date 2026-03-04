import { useState, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Phone, PhoneOff, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SuccessScreen } from "./SuccessScreen";
import { TransferScreen } from "./TransferScreen";

const ELEVENLABS_AGENT_ID = "agent_2001kfzvc45yfwstqcvp7a43kc59";

interface ComplaintParams {
  isAnonymous: boolean;
  name?: string;
  email?: string;
  phone?: string;
  type: string;
  category: string;
  description: string;
  location?: string;
}

interface TransferParams {
  customerName: string;
  customerPhone?: string;
  subject: string;
}

interface StepVoiceAgentProps {
  onBack: () => void;
  onComplete?: (protocolNumber: string) => void;
}

export function StepVoiceAgent({ onBack, onComplete }: StepVoiceAgentProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [protocolNumber, setProtocolNumber] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transferredToHuman, setTransferredToHuman] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const queueItemIdRef = useRef<string | null>(null);
  const voiceSessionIdRef = useRef<string | null>(null);

  const conversation = useConversation({
    clientTools: {
      createComplaint: async (params: ComplaintParams) => {
        console.log("[VoiceAgent] createComplaint called at:", new Date().toISOString());
        console.log("[VoiceAgent] Params received:", JSON.stringify(params, null, 2));
        
        const startTime = Date.now();
        
        try {
          console.log("[VoiceAgent] Invoking voice-agent-tools...");
          
          const { data, error } = await supabase.functions.invoke(
            "voice-agent-tools",
            { body: { action: "createComplaint", data: params } }
          );

          const duration = Date.now() - startTime;
          console.log(`[VoiceAgent] Edge function responded in ${duration}ms`);

          if (error) {
            console.error("[VoiceAgent] Supabase invoke error:", error);
            console.error("[VoiceAgent] Error details:", JSON.stringify(error, null, 2));
            return "Desculpe, ocorreu um erro ao registrar sua solicitação. Por favor, tente novamente.";
          }

          console.log("[VoiceAgent] Response data:", JSON.stringify(data, null, 2));

          if (data?.success) {
            console.log("[VoiceAgent] Success! Protocol:", data.protocolNumber);
            setProtocolNumber(data.protocolNumber);
            setUserEmail(params.email || null);
            
            // End the conversation gracefully
            setTimeout(() => {
              conversation.endSession();
              setShowSuccess(true);
            }, 2000);

            return data.message || `Protocolo ${data.protocolNumber} gerado com sucesso. Sua solicitação foi registrada.`;
          }

          console.warn("[VoiceAgent] Response success=false or missing:", data);
          return "Não foi possível registrar sua solicitação. Por favor, tente novamente.";
        } catch (err) {
          const duration = Date.now() - startTime;
          console.error(`[VoiceAgent] Exception after ${duration}ms:`, err);
          console.error("[VoiceAgent] Error name:", (err as Error)?.name);
          console.error("[VoiceAgent] Error message:", (err as Error)?.message);
          console.error("[VoiceAgent] Error stack:", (err as Error)?.stack);
          return "Ocorreu um erro inesperado. Por favor, tente novamente.";
        }
      },

      transferToHuman: async (params: TransferParams) => {
        console.log("[VoiceAgent] transferToHuman called at:", new Date().toISOString());
        console.log("[VoiceAgent] Params received:", JSON.stringify(params, null, 2));
        
        const startTime = Date.now();
        
        try {
          console.log("[VoiceAgent] Invoking voice-agent-tools for transfer...");
          
          const { data, error } = await supabase.functions.invoke(
            "voice-agent-tools",
            { 
              body: { 
                action: "transferToHuman", 
                data: {
                  ...params,
                  voiceSessionId: voiceSessionIdRef.current,
                }
              } 
            }
          );

          const duration = Date.now() - startTime;
          console.log(`[VoiceAgent] Transfer edge function responded in ${duration}ms`);

          if (error) {
            console.error("[VoiceAgent] Transfer error:", error);
            console.error("[VoiceAgent] Error details:", JSON.stringify(error, null, 2));
            return "Desculpe, não foi possível transferir para um atendente no momento. Por favor, tente novamente.";
          }

          console.log("[VoiceAgent] Transfer response:", JSON.stringify(data, null, 2));

          if (data?.success) {
            console.log("[VoiceAgent] Transfer success! Queue ID:", data.queueId);
            queueItemIdRef.current = data.queueId;
            
            // End the conversation and show transfer screen
            setTimeout(() => {
              conversation.endSession();
              setTransferredToHuman(true);
            }, 2000);

            return data.message || "Você será atendido por um de nossos atendentes em breve. Por favor, aguarde.";
          }

          console.warn("[VoiceAgent] Transfer response success=false:", data);
          return "Não foi possível realizar a transferência. Por favor, tente novamente.";
        } catch (err) {
          const duration = Date.now() - startTime;
          console.error(`[VoiceAgent] Transfer exception after ${duration}ms:`, err);
          console.error("[VoiceAgent] Error name:", (err as Error)?.name);
          console.error("[VoiceAgent] Error message:", (err as Error)?.message);
          return "Ocorreu um erro inesperado. Por favor, tente novamente.";
        }
      },
    },
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      toast({
        title: "Conectado",
        description: "Você está conectado ao agente. Pode começar a falar.",
      });
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
    },
    onMessage: (message) => {
      console.log("Message from agent:", message);
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: "Não foi possível conectar ao agente de voz. Tente novamente.",
      });
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
        {
          body: { agentId: ELEVENLABS_AGENT_ID },
        }
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "Não foi possível obter o token de conexão");
      }

      voiceSessionIdRef.current = data.token;

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      
      if (error instanceof Error && error.name === "NotAllowedError") {
        toast({
          variant: "destructive",
          title: "Microfone necessário",
          description: "Por favor, permita o acesso ao microfone para usar o atendimento por voz.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao conectar",
          description: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    
    toast({
      title: "Conversa encerrada",
      description: "Obrigado por utilizar nosso atendimento por voz.",
    });
  }, [conversation, toast]);

  const handleNewComplaint = useCallback(() => {
    setProtocolNumber(null);
    setShowSuccess(false);
    setTransferredToHuman(false);
    setUserEmail(null);
  }, []);

  const handleGoHome = useCallback(() => {
    window.location.href = "/";
  }, []);

  // Show success screen after complaint is created
  if (showSuccess && protocolNumber) {
    return (
      <SuccessScreen
        protocolNumber={protocolNumber}
        email={userEmail}
        onNewComplaint={handleNewComplaint}
        onGoHome={handleGoHome}
      />
    );
  }

  // Show transfer screen when transferring to human
  if (transferredToHuman) {
    return (
      <TransferScreen
        onNewComplaint={handleNewComplaint}
        onGoHome={handleGoHome}
      />
    );
  }

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Atendimento por Voz
        </h2>
        <p className="text-muted-foreground">
          {isConnected
            ? "Converse com nossa IA para registrar sua manifestação"
            : "Clique para iniciar a conversa com nossa IA"}
        </p>
      </div>

      {/* Voice visualization */}
      <div className="flex flex-col items-center justify-center py-12">
        <div
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
            isConnected
              ? isSpeaking
                ? "bg-primary/20 animate-pulse"
                : "bg-primary/10"
              : "bg-muted"
          )}
        >
          {/* Pulse rings when speaking */}
          {isConnected && isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-primary/15 animate-ping animation-delay-100" />
            </>
          )}
          
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-colors",
              isConnected
                ? isSpeaking
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/80 text-primary-foreground"
                : "bg-muted-foreground/20 text-muted-foreground"
            )}
          >
            {isConnected ? (
              isSpeaking ? (
                <Mic className="w-10 h-10" />
              ) : (
                <MicOff className="w-10 h-10" />
              )
            ) : (
              <Phone className="w-10 h-10" />
            )}
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {isConnected
            ? isSpeaking
              ? "Agente está falando..."
              : "Agente está ouvindo você..."
            : "Pronto para iniciar"}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {!isConnected ? (
          <>
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button
              onClick={startConversation}
              disabled={isConnecting}
              className="gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Iniciar Conversa
                </>
              )}
            </Button>
          </>
        ) : (
          <Button
            variant="destructive"
            onClick={stopConversation}
            className="gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            Encerrar Conversa
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-muted/50 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-foreground mb-2">Como funciona:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>1. Clique em "Iniciar Conversa" e permita o acesso ao microfone</li>
          <li>2. Converse naturalmente com nossa IA sobre sua manifestação</li>
          <li>3. A IA irá coletar todas as informações necessárias</li>
          <li>4. Ao finalizar, você receberá seu número de protocolo</li>
          <li>5. Você também pode pedir para falar com um atendente humano</li>
        </ul>
      </div>
    </div>
  );
}
