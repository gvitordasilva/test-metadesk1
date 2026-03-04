import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WebChatInterface } from "@/components/chat/WebChatInterface";
import { Loader2, MessageSquareX } from "lucide-react";

type ChatbotFlow = {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  is_active: boolean;
  is_default: boolean;
};

export default function PublicChat() {
  const { flowId } = useParams<{ flowId: string }>();

  const { data: flow, isLoading, error } = useQuery({
    queryKey: ["public-chat-flow", flowId],
    queryFn: async () => {
      if (!flowId) throw new Error("Flow ID não fornecido");

      // Use the public edge function instead of direct table access
      const { data, error } = await supabase.functions.invoke("chatbot-public", {
        body: { action: "getFlow", flowId },
      });

      if (error) {
        console.error("[PublicChat] Edge function error:", error);
        throw error;
      }

      if (!data.ok) {
        console.error("[PublicChat] API error:", data);
        throw new Error(data.error || "Fluxo não encontrado");
      }

      if (!data.data) {
        throw new Error("Fluxo não disponível");
      }

      return data.data as ChatbotFlow;
    },
    enabled: !!flowId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando chat...</p>
        </div>
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <MessageSquareX className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold mb-2">Chat Indisponível</h1>
          <p className="text-muted-foreground">
            Este fluxo de atendimento não está disponível ou foi desativado.
            Por favor, verifique o link ou entre em contato por outro canal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <WebChatInterface flowId={flow.id} flowName={flow.name} />
    </div>
  );
}
