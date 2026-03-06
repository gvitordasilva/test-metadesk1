/**
 * avisa-webhook — Recebe mensagens diretamente da AvisaAPI
 *
 * Lida com múltiplos formatos de payload:
 * - JSON direto (application/json)
 * - Form-urlencoded com campo jsonData (application/x-www-form-urlencoded)
 * - Array wrapping do N8N [{ body: { jsonData: "..." } }]
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AVISA_BASE_URL = "https://www.avisaapi.com.br/api";

async function saveOutboundMessage(
  supabaseClient: any,
  conversationId: string,
  content: string,
  contentType = "text",
) {
  try {
    const { error } = await supabaseClient.from("whatsapp_messages").insert({
      whatsapp_conversation_id: conversationId,
      direction: "outbound",
      sender_type: "bot",
      content,
      content_type: contentType,
      status: "sent",
    });
    if (error) {
      console.error("avisa-webhook: erro DB ao salvar outbound msg:", error);
    } else {
      console.log("avisa-webhook: outbound msg salva, conv:", conversationId);
    }
  } catch (err) {
    console.error("avisa-webhook: exceção ao salvar outbound msg:", err);
  }
}

async function sendWelcomeMessages(
  phoneNumber: string,
  token: string,
  supabaseClient?: any,
  conversationId?: string,
) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const welcomeText = "Olá! Eu sou a Gisa, assistente virtual da Metadesk💡\n\nEstou aqui para te auxiliar com algumas dúvidas e serviços.";

  try {
    await fetch(`${AVISA_BASE_URL}/actions/sendMessage`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: phoneNumber, message: welcomeText }),
    });
    if (supabaseClient && conversationId) {
      await saveOutboundMessage(supabaseClient, conversationId, welcomeText);
    }
    console.log("avisa-webhook: mensagem de boas-vindas enviada");
  } catch (err) {
    console.error("avisa-webhook: erro ao enviar boas-vindas:", err);
  }

  const menuText = "Como posso te ajudar hoje?\nToque em 'ver opções'";

  try {
    await sendMainMenu(phoneNumber, headers);
    if (supabaseClient && conversationId) {
      await saveOutboundMessage(supabaseClient, conversationId, menuText, "list");
    }
    console.log("avisa-webhook: lista de opções enviada");
  } catch (err) {
    console.error("avisa-webhook: erro ao enviar lista:", err);
  }
}

function getMainMenuList() {
  return [
    { title: "Faturas e Pagamentos", desc: "Pagar fatura, emitir fatura, negociar débitos, informar pagamento...", RowId: "faturas" },
    { title: "Estou sem energia", desc: "Informar falta de energia, solicitar religação...", RowId: "sem_energia" },
    { title: "Vou me mudar", desc: "Trocar a titularidade, ligação nova, encerramento contratual...", RowId: "mudanca" },
    { title: "Dados cadastrais", desc: "Alterar informações de contato, dados pessoais...", RowId: "cadastro" },
    { title: "Leitura e Consumo", desc: "Informar leitura, consultar histórico de consumo, dicas de economia...", RowId: "leitura" },
    { title: "Benefícios do imóvel", desc: "Cadastro na tarifa social, recadastramento rural, cadastro de enfermo...", RowId: "beneficios" },
    { title: "Reportar problema", desc: "Informe poste inclinado, cabo partido, faíscas ou outros problemas.", RowId: "problema" },
    { title: "Consultar protocolo", desc: "Acompanhar o andamento de suas solicitações...", RowId: "protocolo" },
    { title: "Outros assuntos", desc: "Denúncia de fraude, recebi carta da Metadesk e atendimento presencial.", RowId: "outros" },
  ];
}

async function sendMainMenu(phoneNumber: string, headers: Record<string, string>) {
  await fetch(`${AVISA_BASE_URL}/actions/sendList`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      number: phoneNumber,
      buttontext: "Ver opções",
      desc: "Como posso te ajudar hoje?\nToque em 'ver opções'",
      list: getMainMenuList(),
    }),
  });
}

async function handleAutoReply(
  phoneNumber: string,
  contentType: string,
  selectedRowId: string | null,
  selectedButtonId: string | null,
  token: string,
  supabaseClient?: any,
  conversationId?: string,
  textContent?: string,
) {

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const sendText = async (text: string) => {
    await fetch(`${AVISA_BASE_URL}/actions/sendMessage`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: phoneNumber, message: text }),
    });
    if (supabaseClient && conversationId) {
      await saveOutboundMessage(supabaseClient, conversationId, text);
    }
  };

  const sendList = async (desc: string, buttontext: string, list: any[]) => {
    await fetch(`${AVISA_BASE_URL}/actions/sendList`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: phoneNumber, buttontext, desc, list }),
    });
    if (supabaseClient && conversationId) {
      await saveOutboundMessage(supabaseClient, conversationId, desc, "list");
    }
  };

  // ── Menu principal ──────────────────────────────────────────────────
  const mainMenuResponses: Record<string, { text: string; subList?: { desc: string; buttontext: string; list: any[] } }> = {
    faturas: {
      text: "💰 Vamos falar de Faturas e Pagamentos!\n\nConsigo te ajudar a emitir a segunda via da sua fatura, ver formas de pagamento e consultar as condições de parcelamento dos débitos.\n\nClique em ver opções e escolha o serviço desejado.",
      subList: {
        desc: "Selecione o serviço desejado:",
        buttontext: "Ver opções",
        list: [
          { title: "Pagar Fatura", desc: "Veja contas em aberto e formas de pagamento...", RowId: "pagar_fatura" },
          { title: "Segunda Via", desc: "Baixe sua fatura e veja o histórico...", RowId: "segunda_via" },
          { title: "Parcelamento", desc: "Parcele direto na fatura ou cartão de crédito...", RowId: "parcelamento" },
          { title: "Informar pagamento", desc: "Caso tenha pago a fatura, informe seu pagamento.", RowId: "informar_pagamento" },
          { title: "Fatura Protegida", desc: "Orientações gerais sobre o seguro fatura protegida.", RowId: "fatura_protegida" },
          { title: "Voltar ao menu", desc: "Confira a lista completa de serviços.", RowId: "voltar_menu" },
        ],
      },
    },
    sem_energia: {
      text: "⚡ Estou sem energia\n\nEntendo a urgência! Vou encaminhar você para um atendente que poderá verificar a situação na sua região e te ajudar com a religação.\n\nUm atendente irá te auxiliar em breve.",
    },
    mudanca: {
      text: "🏠 Vou me mudar\n\nPara troca de titularidade, ligação nova ou encerramento contratual, um atendente especializado poderá te ajudar.\n\nUm atendente irá te auxiliar em breve.",
    },
    cadastro: {
      text: "📋 Dados cadastrais\n\nPara alterar suas informações de contato ou dados pessoais, um atendente irá te auxiliar.\n\nUm atendente irá te auxiliar em breve.",
    },
    leitura: {
      text: "📊 Leitura e Consumo\n\nPara informar leitura, consultar histórico de consumo ou dicas de economia, um atendente poderá te orientar.\n\nUm atendente irá te auxiliar em breve.",
    },
    beneficios: {
      text: "🏡 Benefícios do imóvel\n\nPara cadastro na tarifa social, recadastramento rural ou cadastro de enfermo, um atendente poderá te auxiliar.\n\nUm atendente irá te auxiliar em breve.",
    },
    problema: {
      text: "🔧 Reportar problema\n\nPara informar poste inclinado, cabo partido, faíscas ou outros problemas, um atendente irá registrar sua ocorrência.\n\nUm atendente irá te auxiliar em breve.",
    },
    protocolo: {
      text: "🔍 Consultar protocolo\n\nPara acompanhar o andamento de suas solicitações, um atendente poderá consultar para você.\n\nUm atendente irá te auxiliar em breve.",
    },
    outros: {
      text: "❓ Outros assuntos\n\nPara denúncia de fraude, carta recebida ou atendimento presencial, um atendente especializado irá te auxiliar.\n\nUm atendente irá te auxiliar em breve.",
    },
  };

  // ── Sub-menu Faturas ────────────────────────────────────────────────
  const faturasSubResponses: Record<string, string> = {
    segunda_via: "📄 Segunda Via\n\nVou encaminhar você para um atendente que poderá gerar a segunda via da sua fatura.\n\nUm atendente irá te auxiliar em breve.",
    parcelamento: "💰 Parcelamento\n\nVou encaminhar você para um atendente que vai verificar as condições de parcelamento disponíveis para você.\n\nUm atendente irá te auxiliar em breve.",
    informar_pagamento: "✅ Informar pagamento\n\nVou encaminhar você para um atendente para registrar o pagamento informado.\n\nUm atendente irá te auxiliar em breve.",
    fatura_protegida: "🛡️ Fatura Protegida\n\nVou encaminhar você para um atendente que poderá te orientar sobre o seguro fatura protegida.\n\nUm atendente irá te auxiliar em breve.",
  };

  const setSessionState = async (state: string | null) => {
    if (!supabaseClient || !conversationId) return;
    await supabaseClient
      .from("whatsapp_conversations")
      .update({ session_data: state ? { chatbot_state: state } : {} })
      .eq("id", conversationId);
  };

  const id = selectedRowId || selectedButtonId || "";

  try {
    // ── Pagar Fatura: solicita CPF ──────────────────────────────────
    if (id === "pagar_fatura") {
      await sendText("Certo! Já vou verificar se você possui alguma conta aberta 😉\n\nPor favor me informe o seu CPF ou CNPJ (somente os dígitos):");
      await setSessionState("awaiting_cpf");
      console.log("avisa-webhook: pagar_fatura - aguardando CPF");
      return;
    }

    // ── Resposta de CPF (chamado via estado, sem selectedRowId) ──────
    if (id === "__awaiting_cpf__" && textContent) {
      const cpf = textContent.replace(/\D/g, "");
      if (cpf.length < 11) {
        await sendText("Por favor, informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido, somente os números:");
        return;
      }

      const cpfFormatted = cpf.length === 11
        ? `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9)}`
        : `${cpf.slice(0,2)}.${cpf.slice(2,5)}.${cpf.slice(5,8)}/${cpf.slice(8,12)}-${cpf.slice(12)}`;

      await sendText(`Encontramos uma fatura pendente para o documento ${cpfFormatted}.\n\n📄 *Fatura em aberto*\nVencimento: 15/03/2026\nValor: R$ 187,50\n\nEnviando o código PIX para pagamento...`);

      // Enviar PIX via endpoint da AvisaAPI
      const pixCode = "00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef1234567890520400005303986540718750055802BR5925METADESK ENERGIA LTDA6009SAO PAULO62140510FATURA0001630452D1";
      try {
        await fetch(`${AVISA_BASE_URL}/buttons/pix`, {
          method: "POST",
          headers,
          body: JSON.stringify({ number: phoneNumber, pix: pixCode }),
        });
        if (supabaseClient && conversationId) {
          await saveOutboundMessage(supabaseClient, conversationId, `Código PIX: ${pixCode}`, "pix");
        }
        console.log("avisa-webhook: PIX enviado para:", phoneNumber);
      } catch (pixErr) {
        console.error("avisa-webhook: erro ao enviar PIX:", pixErr);
        await sendText("Não foi possível gerar o PIX. Um atendente irá te auxiliar em breve.");
      }

      await setSessionState(null);
      return;
    }

    // Verificar menu principal
    if (mainMenuResponses[id]) {
      const entry = mainMenuResponses[id];
      await sendText(entry.text);
      if (entry.subList) {
        await sendList(entry.subList.desc, entry.subList.buttontext, entry.subList.list);
      }
      await setSessionState(null);
      console.log("avisa-webhook: auto-reply enviado para:", id);
      return;
    }

    // Verificar sub-menu Faturas
    if (faturasSubResponses[id]) {
      await sendText(faturasSubResponses[id]);
      await setSessionState(null);
      console.log("avisa-webhook: auto-reply sub-menu enviado para:", id);
      return;
    }

    // Voltar ao menu principal
    if (id === "voltar_menu") {
      await sendText("Certo! Voltando ao menu principal...");
      await sendMainMenu(phoneNumber, headers);
      await setSessionState(null);
      console.log("avisa-webhook: menu principal reenviado");
      return;
    }

    console.log("avisa-webhook: nenhum auto-reply para id:", id);
  } catch (err) {
    console.error("avisa-webhook: erro no auto-reply:", err);
  }
}

async function parseRequest(req: Request): Promise<any> {
  const contentType = req.headers.get("content-type") || "";
  const rawBody = await req.text();

  console.log("avisa-webhook content-type:", contentType);
  console.log("avisa-webhook raw body (primeiros 500 chars):", rawBody.substring(0, 500));

  // Form-urlencoded: AvisaAPI envia jsonData como campo de formulário
  if (contentType.includes("x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    const jsonDataStr = params.get("jsonData");
    if (jsonDataStr) {
      console.log("avisa-webhook: parsed from form-urlencoded jsonData");
      return { source: "form", data: JSON.parse(jsonDataStr) };
    }
    // Tentar parsear o body inteiro como JSON (alguns serviços mandam form-encoded mas com body JSON)
    try {
      const parsed = JSON.parse(rawBody);
      console.log("avisa-webhook: body era JSON apesar do content-type form-urlencoded");
      return { source: "json-in-form", data: parsed };
    } catch {
      console.log("avisa-webhook: form-urlencoded fields:", Array.from(params.keys()));
      return { source: "form-fields", data: Object.fromEntries(params) };
    }
  }

  // JSON: pode ser objeto direto, array (N8N), ou wrapper com body.jsonData
  try {
    const parsed = JSON.parse(rawBody);

    // Array (formato N8N): [{ body: { jsonData: "..." } }]
    if (Array.isArray(parsed)) {
      const wrapper = parsed[0];
      const jsonDataStr = wrapper?.body?.jsonData ?? wrapper?.jsonData;
      if (jsonDataStr) {
        const inner = typeof jsonDataStr === "string" ? JSON.parse(jsonDataStr) : jsonDataStr;
        console.log("avisa-webhook: parsed from N8N array wrapper");
        return { source: "n8n-array", data: inner };
      }
      console.log("avisa-webhook: array sem jsonData, usando primeiro elemento");
      return { source: "array", data: wrapper };
    }

    // Objeto com body.jsonData
    if (parsed?.body?.jsonData) {
      const inner = typeof parsed.body.jsonData === "string"
        ? JSON.parse(parsed.body.jsonData) : parsed.body.jsonData;
      console.log("avisa-webhook: parsed from body.jsonData wrapper");
      return { source: "body-wrapper", data: inner };
    }

    // Objeto com jsonData no root
    if (parsed?.jsonData) {
      const inner = typeof parsed.jsonData === "string"
        ? JSON.parse(parsed.jsonData) : parsed.jsonData;
      console.log("avisa-webhook: parsed from root jsonData");
      return { source: "root-jsondata", data: inner };
    }

    // JSON direto (evento da AvisaAPI sem wrapper)
    console.log("avisa-webhook: parsed as direct JSON");
    return { source: "direct", data: parsed };
  } catch (e) {
    console.error("avisa-webhook: falha ao parsear body:", e.message);
    throw new Error("Não foi possível parsear o payload: " + e.message);
  }
}

function fixUtf8(str: string): string {
  try {
    const bytes = new Uint8Array([...str].map((c) => c.charCodeAt(0)));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return str;
  }
}

function extractEventData(data: any) {
  const event = data.event ?? data;
  const info = event.Info ?? event.info ?? {};
  const message = event.Message ?? event.message ?? {};
  const eventType = event.type ?? data.type ?? "Message";

  // Detectar grupo: JID contém @g.us ou IsGroup === true
  const chatJid: string = info.Chat ?? info.chat ?? info.Sender ?? info.sender ?? "";
  const isGroup: boolean =
    info.IsGroup ?? info.isGroup ?? data.isGroup ?? chatJid.includes("@g.us");

  const phoneFromJid = chatJid.split("@")[0].replace(/[^0-9]/g, "");
  const phoneNumber = phoneFromJid
    || (data.phone ?? data.from ?? data.sender ?? "").replace(/[^0-9]/g, "");

  // Nome do contato (corrigir encoding UTF-8)
  const rawName: string =
    info.PushName ?? info.pushName ?? info.pushname ??
    data.name ?? data.contact_name ?? data.pushName ??
    phoneNumber;
  const contactName = fixUtf8(rawName);

  // Respostas interativas (lista, botões, template buttons)
  const listResponse = message.listResponseMessage;
  const buttonResponse = message.buttonsResponseMessage;
  const templateButtonResponse = message.templateButtonReplyMessage;

  const content: string =
    message.conversation ??
    message.extendedTextMessage?.text ??
    (listResponse
      ? (listResponse.title || listResponse.singleSelectReply?.selectedRowID || "")
      : null) ??
    (templateButtonResponse
      ? (templateButtonResponse.selectedDisplayText || templateButtonResponse.selectedID || "")
      : null) ??
    (buttonResponse
      ? (buttonResponse.selectedDisplayText || buttonResponse.selectedButtonId || "")
      : null) ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    data.text ?? data.body ?? data.message ??
    (typeof data.content === "string" ? data.content : "") ??
    "";

  const externalMsgId: string | null =
    info.ID ?? info.id ?? data.message_id ?? data.id ?? data.msg_id ?? null;

  const mediaType: string = info.MediaType ?? info.mediaType ?? "";
  const rawType: string = info.Type ?? info.type ?? data.type ?? "text";
  const contentType: string = mediaType === "list_response"
    ? "list_response"
    : mediaType === "buttons_response"
    ? "buttons_response"
    : templateButtonResponse
    ? "button_response"
    : rawType;

  const isFromMe: boolean = info.IsFromMe ?? info.isFromMe ?? data.isFromMe ?? false;

  // IDs de seleção interativa (para lógica de auto-reply)
  const selectedRowId: string | null =
    listResponse?.singleSelectReply?.selectedRowID ?? null;
  const selectedButtonId: string | null =
    templateButtonResponse?.selectedID ??
    buttonResponse?.selectedButtonId ?? null;

  return {
    phoneNumber, contactName, content, externalMsgId,
    contentType, isFromMe, isGroup, eventType,
    selectedRowId, selectedButtonId,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== avisa-webhook: nova requisição ===");
    console.log("method:", req.method);
    console.log("url:", req.url);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { source, data } = await parseRequest(req);
    console.log("avisa-webhook source:", source);
    console.log("avisa-webhook data keys:", Object.keys(data));

    const {
      phoneNumber, contactName, content, externalMsgId,
      contentType, isFromMe, isGroup, eventType,
      selectedRowId, selectedButtonId,
    } = extractEventData(data);

    console.log("avisa-webhook extraído:", {
      phoneNumber, contactName, content, externalMsgId,
      contentType, isFromMe, isGroup, eventType, source,
      selectedRowId, selectedButtonId,
    });

    // Ignorar mensagens de grupo
    if (isGroup) {
      console.log("avisa-webhook: ignorando mensagem de grupo");
      return new Response(
        JSON.stringify({ status: "ignored", reason: "group_message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ignorar mensagens enviadas por nós
    if (isFromMe) {
      console.log("avisa-webhook: ignorando IsFromMe=true");
      return new Response(
        JSON.stringify({ status: "ignored", reason: "IsFromMe" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ignorar se não for mensagem
    if (eventType && eventType !== "Message" && eventType !== "text") {
      console.log("avisa-webhook: evento ignorado, type:", eventType);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "not_a_message", type: eventType }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phoneNumber) {
      console.error("avisa-webhook: telefone não encontrado");
      return new Response(
        JSON.stringify({ error: "Telefone não encontrado no payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Idempotência
    if (externalMsgId) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("external_msg_id", externalMsgId)
        .maybeSingle();

      if (existing) {
        console.log("avisa-webhook: já processada:", externalMsgId);
        return new Response(
          JSON.stringify({ status: "already_processed", message_id: existing.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Upsert conversa
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
      console.error("avisa-webhook: erro conversa:", convError);
      throw new Error("Falha ao criar/atualizar conversa: " + convError?.message);
    }

    // Inserir mensagem
    const { data: msg, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        whatsapp_conversation_id: conversation.id,
        direction: "inbound",
        sender_type: "customer",
        content: content || "(sem conteúdo de texto)",
        content_type: contentType,
        status: "received",
        external_msg_id: externalMsgId,
        raw_payload: data,
      })
      .select()
      .single();

    if (msgError) {
      if (msgError.code === "23505") {
        console.log("avisa-webhook: duplicata ignorada");
        return new Response(
          JSON.stringify({ status: "duplicate_ignored" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("avisa-webhook: erro mensagem:", msgError);
      throw new Error("Falha ao salvar mensagem: " + msgError.message);
    }

    // Criar/atualizar fila
    const { data: existingQueue } = await supabase
      .from("service_queue")
      .select("id, unread_count")
      .eq("whatsapp_conversation_id", conversation.id)
      .in("status", ["waiting", "in_progress"])
      .maybeSingle();

    const isNewConversation = !existingQueue;

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
        subject: "WhatsApp - " + contactName,
        last_message: content,
        unread_count: 1,
        whatsapp_conversation_id: conversation.id,
        waiting_since: new Date().toISOString(),
      });
    }

    // Enviar mensagens automáticas de boas-vindas no primeiro contato
    if (isNewConversation) {
      const AVISA_API_TOKEN = Deno.env.get("AVISA_API_TOKEN");
      if (AVISA_API_TOKEN) {
        sendWelcomeMessages(phoneNumber, AVISA_API_TOKEN, supabase, conversation.id).catch((err) =>
          console.error("avisa-webhook: falha no envio de boas-vindas:", err)
        );
      } else {
        console.warn("avisa-webhook: AVISA_API_TOKEN não configurado, boas-vindas não enviadas");
      }
    }

    // Verificar estado do chatbot (ex: aguardando CPF)
    const chatbotState = conversation.session_data?.chatbot_state;

    const AVISA_API_TOKEN = Deno.env.get("AVISA_API_TOKEN");

    if (chatbotState === "awaiting_cpf" && AVISA_API_TOKEN && !selectedRowId && !selectedButtonId) {
      handleAutoReply(
        phoneNumber, contentType, "__awaiting_cpf__", null,
        AVISA_API_TOKEN, supabase, conversation.id, content,
      ).catch((err) => console.error("avisa-webhook: falha no auto-reply CPF:", err));
    }
    // Auto-reply para respostas de menu interativo
    else if (selectedRowId || selectedButtonId) {
      if (AVISA_API_TOKEN) {
        handleAutoReply(
          phoneNumber, contentType, selectedRowId, selectedButtonId,
          AVISA_API_TOKEN, supabase, conversation.id, content,
        ).catch((err) => console.error("avisa-webhook: falha no auto-reply:", err));
      }
    }

    console.log("avisa-webhook: OK, message_id:", msg.id);

    return new Response(
      JSON.stringify({
        status: "ok",
        message_id: msg.id,
        conversation_id: conversation.id,
        phone_number: phoneNumber,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("avisa-webhook ERRO:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
