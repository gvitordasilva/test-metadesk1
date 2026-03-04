/**
 * avisa-send — Envia mensagem do agente via AvisaAPI e registra no banco
 *
 * Chamado pelo frontend (ConversationView) quando um atendente humano
 * digita e envia uma mensagem em uma conversa WhatsApp.
 *
 * Requer autenticação JWT do Supabase (usuário logado).
 *
 * Payload esperado:
 * {
 *   whatsapp_conversation_id: "uuid",    // ID da conversa
 *   content: "Texto da mensagem",        // mensagem a enviar
 *   agent_name?: "Nome do Atendente"     // opcional, para exibição
 * }
 *
 * Variáveis de ambiente necessárias:
 *   AVISA_API_URL    — URL base da AvisaAPI (ex: https://api.avisaapi.com.br)
 *   AVISA_API_KEY    — Chave de autenticação da AvisaAPI
 *   AVISA_INSTANCE   — Nome da instância/número na AvisaAPI (se necessário)
 *
 * ATENÇÃO: Ajuste o endpoint e o formato do body no bloco "Enviar via AvisaAPI"
 * conforme a documentação específica da sua AvisaAPI.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const AVISA_API_URL = Deno.env.get("AVISA_API_URL");
    const AVISA_API_KEY = Deno.env.get("AVISA_API_KEY");
    const AVISA_INSTANCE = Deno.env.get("AVISA_INSTANCE");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const {
      whatsapp_conversation_id,
      content,
      agent_name = "Atendente",
    } = body;

    if (!whatsapp_conversation_id || !content) {
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios: whatsapp_conversation_id e content",
        }),
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

    // ---------------------------------------------------------------
    // Enviar via AvisaAPI (se configurado)
    // Ajuste o endpoint e o body conforme a documentação da AvisaAPI
    // ---------------------------------------------------------------
    let externalMessageId: string | null = null;
    let sendStatus: "sent" | "pending" = "pending";

    if (AVISA_API_URL && AVISA_API_KEY) {
      try {
        // TODO: Ajuste o endpoint e o formato conforme documentação da AvisaAPI
        const sendResponse = await fetch(
          `${AVISA_API_URL}/message/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${AVISA_API_KEY}`,
              // Algumas APIs usam header diferente:
              // "apikey": AVISA_API_KEY,
            },
            body: JSON.stringify({
              phone: conversation.phone_number,
              message: content,
              // Inclua outros campos se necessário:
              // instance: AVISA_INSTANCE,
              // type: "text",
            }),
          }
        );

        if (sendResponse.ok) {
          const result = await sendResponse.json();
          externalMessageId =
            result.id ?? result.message_id ?? result.data?.id ?? null;
          sendStatus = "sent";
          console.log("avisa-send: mensagem enviada via AvisaAPI:", result);
        } else {
          const errText = await sendResponse.text();
          console.error(
            "avisa-send: AvisaAPI retornou erro:",
            sendResponse.status,
            errText
          );
          // Salvar com status "pending" para rastreabilidade
        }
      } catch (sendErr) {
        console.error("avisa-send: falha na chamada AvisaAPI:", sendErr);
        // Salvar com status "pending" mesmo que o envio falhe
      }
    } else {
      console.log(
        "avisa-send: AVISA_API_URL/AVISA_API_KEY não configurados — salvando apenas no banco"
      );
    }

    // ---------------------------------------------------------------
    // Salvar mensagem do agente em whatsapp_messages
    // ---------------------------------------------------------------
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

    console.log(
      "avisa-send: mensagem do agente registrada, message_id:",
      message.id
    );

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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
