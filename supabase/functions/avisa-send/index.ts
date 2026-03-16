/**
 * avisa-send — Envia mensagem do agente via AvisaAPI
 *
 * Chamado pelo frontend quando um atendente envia mensagem em conversa WhatsApp.
 *
 * Endpoint AvisaAPI:
 *   POST https://www.avisaapi.com.br/api/actions/sendMessage
 *   Authorization: Bearer <AVISA_API_KEY>
 *   Body: { number: "5499999999", message: "Texto" }
 *
 * Payload esperado:
 * {
 *   whatsapp_conversation_id: "uuid",
 *   content: "Texto da mensagem",
 *   agent_name?: "Nome do Atendente"
 * }
 *
 * Variável de ambiente necessária:
 *   AVISA_API_KEY — Bearer token da AvisaAPI (preferencial)
 *   AVISA_API_TOKEN — fallback legado
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AVISA_API_ENDPOINT = "https://www.avisaapi.com.br/api/actions/sendMessage";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let avisaApiKey =
      Deno.env.get("AVISA_API_KEY") || Deno.env.get("AVISA_API_TOKEN");
    if (!avisaApiKey) {
      const { data } = await supabase
        .from("integration_settings")
        .select("value")
        .eq("key", "avisa_api_token")
        .maybeSingle();
      avisaApiKey = data?.value || undefined;
    }

    const body = await req.json();
    const {
      whatsapp_conversation_id,
      content,
      agent_name = "Atendente",
    } = body;

    if (!whatsapp_conversation_id || !content) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: whatsapp_conversation_id e content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar número de telefone da conversa
    const { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("phone_number")
      .eq("id", whatsapp_conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enviar via AvisaAPI
    let externalMessageId: string | null = null;
    let sendStatus: "sent" | "failed" = "failed";

    if (!avisaApiKey) {
      console.error("avisa-send: AVISA_API_KEY / AVISA_API_TOKEN não configurado");
      return new Response(
        JSON.stringify({ error: "AVISA_API_KEY não configurado no servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const sendResponse = await fetch(AVISA_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${avisaApiKey}`,
        },
        body: JSON.stringify({
          number: conversation.phone_number,
          message: content,
        }),
      });

      const result = await sendResponse.json();
      console.log("avisa-send: resposta AvisaAPI:", JSON.stringify(result));

      if (sendResponse.ok) {
        externalMessageId = result.id ?? result.message_id ?? null;
        sendStatus = "sent";
      } else {
        console.error("avisa-send: AvisaAPI erro:", sendResponse.status, result);
      }
    } catch (sendErr) {
      console.error("avisa-send: falha na chamada AvisaAPI:", sendErr);
    }

    // Salvar mensagem do agente em whatsapp_messages
    const { data: message, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        whatsapp_conversation_id,
        direction: "outbound",
        sender_type: "agent",
        content,
        content_type: "text",
        status: sendStatus,
        external_msg_id: externalMessageId,
        raw_payload: {
          agent_name,
          sent_via: "avisa-send",
          phone: conversation.phone_number,
        },
      })
      .select()
      .single();

    if (msgError) {
      console.error("avisa-send: erro ao salvar mensagem:", msgError);
      throw new Error("Falha ao salvar mensagem do agente: " + msgError.message);
    }

    // Atualizar last_message na fila
    await supabase
      .from("service_queue")
      .update({
        last_message: content,
        updated_at: new Date().toISOString(),
      })
      .eq("whatsapp_conversation_id", whatsapp_conversation_id)
      .in("status", ["waiting", "in_progress"]);

    console.log("avisa-send: mensagem registrada, message_id:", message.id, "status:", sendStatus);

    return new Response(
      JSON.stringify({
        status: "ok",
        message_id: message.id,
        sent_to_whatsapp: sendStatus === "sent",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("avisa-send error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
