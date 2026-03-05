/**
 * n8n-outbound-webhook — Registra a resposta do bot/n8n enviada ao usuário
 *
 * Fluxo:
 *   n8n (nó HTTP Request no FINAL do fluxo, após enviar para o usuário via AvisaAPI)
 *   → POST /functions/v1/n8n-outbound-webhook
 *   → armazena em whatsapp_messages (outbound / bot)
 *   → atualiza last_message na service_queue
 *   → o Realtime propaga para o frontend automaticamente
 *
 * Header obrigatório: x-n8n-secret: <N8N_WEBHOOK_SECRET>
 *
 * Payload esperado (enviado pelo n8n):
 * {
 *   phone_number: "5511999999999",     // telefone do destinatário
 *   content: "Olá! Como posso ajudar?", // resposta enviada ao usuário
 *   n8n_execution_id: "exec_xyz123",   // ID de execução do n8n (idempotência)
 *   original_msg_id?: "msg_abc",       // ID da mensagem original (opcional)
 *   sender_type?: "bot" | "agent"      // padrão: "bot"
 * }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-n8n-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const N8N_SECRET = Deno.env.get("N8N_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validar segredo compartilhado com o n8n
    if (N8N_SECRET) {
      const received = req.headers.get("x-n8n-secret");
      if (received !== N8N_SECRET) {
        console.warn("n8n-outbound-webhook: segredo inválido");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    console.log("n8n-outbound-webhook payload:", JSON.stringify(payload, null, 2));

    // ---------------------------------------------------------------
    // Extrair campos do payload
    // ---------------------------------------------------------------
    const phoneRaw: string =
      payload.phone_number ?? payload.phone ?? payload.to ?? "";
    const phoneNumber = phoneRaw.replace(/\D/g, "");

    const content: string =
      payload.content ?? payload.message ?? payload.text ?? "";

    const n8nExecutionId: string | null =
      payload.n8n_execution_id ?? payload.execution_id ?? payload.flow_id ?? null;

    // conversation_id pode ser enviado diretamente pelo n8n (preferencial)
    // para evitar divergência entre LID e número real de telefone
    const directConversationId: string | null =
      payload.conversation_id ?? payload.whatsapp_conversation_id ?? null;

    const senderType: "bot" | "agent" =
      payload.sender_type === "agent" ? "agent" : "bot";

    if ((!phoneNumber && !directConversationId) || !content) {
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios ausentes: (phone_number ou conversation_id) e content",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---------------------------------------------------------------
    // Idempotência: chave = n8n_execution_id + ":outbound"
    // ---------------------------------------------------------------
    const externalMsgId = n8nExecutionId
      ? `n8n-${n8nExecutionId}:outbound`
      : null;

    if (externalMsgId) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("external_msg_id", externalMsgId)
        .maybeSingle();

      if (existing) {
        console.log(
          "n8n-outbound-webhook: resposta já registrada (idempotência):",
          externalMsgId
        );
        return new Response(
          JSON.stringify({ status: "already_processed", message_id: existing.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ---------------------------------------------------------------
    // Buscar a conversa WhatsApp:
    //   1. Por conversation_id direto (preferencial — evita problema do LID)
    //      → valida existência no banco antes de usar
    //   2. Por phone_number (fallback)
    // ---------------------------------------------------------------
    let conversationId: string | null = null;

    if (directConversationId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("id", directConversationId)
        .maybeSingle();

      if (conv) {
        conversationId = conv.id;
        console.log("n8n-outbound-webhook: conversa encontrada por conversation_id:", conversationId);
      } else {
        console.warn(
          "n8n-outbound-webhook: conversation_id não encontrado no banco, tentando fallback por phone:",
          directConversationId
        );
      }
    }

    if (!conversationId) {
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios ausentes: phone_number ou conversation_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: conv, error: convError } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("phone_number", phoneNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convError || !conv) {
        console.error(
          "n8n-outbound-webhook: conversa não encontrada para:",
          phoneNumber
        );
        return new Response(
          JSON.stringify({
            error: `Conversa não encontrada para o número: ${phoneNumber}`,
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      conversationId = conv.id;
      console.log("n8n-outbound-webhook: conversa encontrada por phone_number:", conversationId);
    }

    // Objeto simplificado para uso nos passos seguintes
    const conversation = { id: conversationId };

    // ---------------------------------------------------------------
    // Inserir mensagem de saída em whatsapp_messages
    // ---------------------------------------------------------------
    const { data: message, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        whatsapp_conversation_id: conversation.id,
        direction: "outbound",
        sender_type: senderType,
        content,
        content_type: "text",
        status: "sent",
        external_msg_id: externalMsgId,
        n8n_flow_id: n8nExecutionId,
        raw_payload: payload,
      })
      .select()
      .single();

    if (msgError) {
      // Duplicata via constraint UNIQUE — ignorar silenciosamente
      if (msgError.code === "23505") {
        console.log("n8n-outbound-webhook: duplicata ignorada via UNIQUE constraint");
        return new Response(
          JSON.stringify({ status: "duplicate_ignored" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("n8n-outbound-webhook: erro ao inserir mensagem:", msgError);
      throw new Error("Falha ao salvar mensagem de saída: " + msgError.message);
    }

    // ---------------------------------------------------------------
    // Atualizar last_message na service_queue e last_message_at na conversa
    // ---------------------------------------------------------------
    await Promise.all([
      supabase
        .from("service_queue")
        .update({
          last_message: content,
          updated_at: new Date().toISOString(),
        })
        .eq("whatsapp_conversation_id", conversation.id)
        .in("status", ["waiting", "in_progress"]),

      supabase
        .from("whatsapp_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id),
    ]);

    console.log(
      "n8n-outbound-webhook: resposta registrada com sucesso, message_id:",
      message.id
    );

    return new Response(
      JSON.stringify({ status: "ok", message_id: message.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("n8n-outbound-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
