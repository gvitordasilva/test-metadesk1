import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WhatsAppMessage = {
  id: string;
  whatsapp_conversation_id: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "bot" | "agent";
  content: string;
  content_type: string;
  status: string;
  external_msg_id: string | null;
  n8n_flow_id: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Hook para buscar e se inscrever em mensagens WhatsApp vindas do n8n/AvisaAPI.
 *
 * As mensagens são armazenadas em whatsapp_messages e refletem em tempo real
 * via Supabase Realtime (postgres_changes INSERT).
 *
 * @param whatsappConversationId - ID da conversa em whatsapp_conversations
 */
export function useWhatsAppMessages(
  whatsappConversationId: string | null | undefined
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["whatsapp-messages", whatsappConversationId],
    queryFn: async () => {
      if (!whatsappConversationId) return [] as WhatsAppMessage[];

      const { data, error } = await supabase
        .from("whatsapp_messages" as any)
        .select("*")
        .eq("whatsapp_conversation_id", whatsappConversationId)
        .order("created_at", { ascending: true });

      if (error) {
        // Tabela ainda não existe (migração pendente) — retornar vazio
        if (error.code === "PGRST205" || error.code === "42P01") {
          return [] as WhatsAppMessage[];
        }
        console.error("useWhatsAppMessages: erro ao buscar mensagens:", error);
        throw error;
      }

      return (data ?? []) as WhatsAppMessage[];
    },
    enabled: !!whatsappConversationId,
    staleTime: 0,
    // Polling como fallback caso o Realtime não entregue o evento
    refetchInterval: 8_000,
  });

  // Subscrição Realtime: nova mensagem → invalida cache (força refetch imediato)
  useEffect(() => {
    if (!whatsappConversationId) return;

    const channel = supabase
      .channel(`wa-msgs-${whatsappConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `whatsapp_conversation_id=eq.${whatsappConversationId}`,
        },
        () => {
          // Invalida o cache para forçar refetch imediato — mais confiável
          // que manipular o cache diretamente, pois garante dados frescos do servidor
          queryClient.invalidateQueries({
            queryKey: ["whatsapp-messages", whatsappConversationId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [whatsappConversationId, queryClient]);

  return query;
}
