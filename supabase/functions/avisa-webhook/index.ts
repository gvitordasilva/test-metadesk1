/**
 * avisa-webhook — Intercepta mensagens RECEBIDAS no início do fluxo n8n
 *
 * Fluxo:
 *   AvisaAPI → n8n (nó HTTP Request no INÍCIO do fluxo)
 *              → POST /functions/v1/avisa-webhook
 *              → armazena em whatsapp_messages (inbound)
 *              → cria/atualiza whatsapp_conversations
 *              → cria/atualiza service_queue
 *              → retorna 200 OK → n8n continua processando
 *
 * Header obrigatório: x-n8n-secret: <N8N_WEBHOOK_SECRET>
 *
 * Payload esperado (AvisaAPI repassado pelo n8n — suporta vários formatos):
 * {
 *   phone: "5511999999999",          // ou "from", "sender"
 *   name: "João Silva",              // ou "contact_name", "pushName"
 *   message_id: "msg_abc123",        // ID único da mensagem (idempotência)
 *   text: "Olá, preciso de ajuda",   // ou "message", "body"
 *   type: "text"                     // ou "image", "audio", etc.
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
        console.warn("avisa-webhook: segredo inválido recebido");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    console.log("avisa-webhook payload:", JSON.stringify(payload, null, 2));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---------------------------------------------------------------
    // Extração flexível de campos (AvisaAPI usa variação de nomes)
    // ---------------------------------------------------------------
    const phoneRaw: string =
      payload.phone ??
      payload.from ??
      payload.sender ??
      payload.contact?.phone ??
      payload.data?.phone ??
      "";
    const phoneNumber = phoneRaw.replace(/\D/g, ""); // somente dígitos

    const contactName: string =
      payload.name ??
      payload.contact_name ??
      payload.pushName ??
      payload.contact?.name ??
      payload.data?.name ??
      phoneNumber;

    const content: string =
      payload.text ??
      payload.message ??
      payload.body ??
      payload.data?.text ??
      payload.data?.body ??
      payload.message?.text ??
      payload.message?.body ??
      "";

    const externalMsgId: string | null =
      payload.message_id ??
      payload.id ??
      payload.msg_id ??
      payload.data?.id ??
      null;

    const contentType: string =
      payload.type ?? payload.message_type ?? "text";

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          error: "Campo 'phone' (ou 'from'/'sender') não encontrado no payload",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------------------------------
    // Idempotência: mensagem já registrada? Retornar sem duplicar.
    // ---------------------------------------------------------------
    if (externalMsgId) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("external_msg_id", externalMsgId)
        .maybeSingle();

      if (existing) {
        console.log("avisa-webhook: mensagem já registrada (idempotência):", externalMsgId);
        return new Response(
          JSON.stringify({ status: "already_processed", message_id: existing.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ---------------------------------------------------------------
    // Upsert da conversa WhatsApp (chave: phone_number)
    // ---------------------------------------------------------------
    const { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .upsert(
        {
          phone_number: phoneNumber,
          contact_name: contactName,
          last_message_at: new Date().toISOString(),
          status: "active",
        },
        { onConflict: "phone_number" }
      )
      .select()
      .single();

    if (convError || !conversation) {
      console.error("avisa-webhook: erro ao upsert conversa:", convError);
      throw new Error("Falha ao criar/atualizar conversa: " + convError?.message);
    }

    // ---------------------------------------------------------------
    // Inserir mensagem recebida em whatsapp_messages
    // ---------------------------------------------------------------
    const { data: message, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        whatsapp_conversation_id: conversation.id,
        direction: "inbound",
        sender_type: "customer",
        content: content || "(sem conteúdo de texto)",
        content_type: contentType,
        status: "received",
        external_msg_id: externalMsgId,
        raw_payload: payload,
      })
      .select()
      .single();

    if (msgError) {
      // Violação de unique = mensagem duplicada; ignorar silenciosamente
      if (msgError.code === "23505") {
        console.log("avisa-webhook: duplicata ignorada via constraint UNIQUE");
        return new Response(
          JSON.stringify({ status: "duplicate_ignored" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("avisa-webhook: erro ao inserir mensagem:", msgError);
      throw new Error("Falha ao salvar mensagem: " + msgError.message);
    }

    // ---------------------------------------------------------------
    // Criar ou atualizar service_queue (aparece no módulo Atendimentos)
    // ---------------------------------------------------------------
    const { data: existingQueue } = await supabase
      .from("service_queue")
      .select("id, unread_count")
      .eq("whatsapp_conversation_id", conversation.id)
      .in("status", ["waiting", "in_progress"])
      .maybeSingle();

    if (existingQueue) {
      await supabase
        .from("service_queue")
        .update({
          last_message: content,
          unread_count: (existingQueue.unread_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingQueue.id);
    } else {
      await supabase.from("service_queue").insert({
        channel: "whatsapp",
        status: "waiting",
        customer_name: contactName,
        customer_phone: phoneNumber,
        subject: "WhatsApp - " + phoneNumber,
        last_message: content,
        unread_count: 1,
        whatsapp_conversation_id: conversation.id,
        waiting_since: new Date().toISOString(),
      });
    }

    console.log("avisa-webhook: processado com sucesso, message_id:", message.id);

    return new Response(
      JSON.stringify({ status: "ok", message_id: message.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("avisa-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
