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

/** Chave AvisaAPI: env primeiro; depois integration_settings.avisa_api_token */
async function resolveAvisaApiKey(supabase: ReturnType<typeof createClient>): Promise<string | undefined> {
  const env = Deno.env.get("AVISA_API_KEY") || Deno.env.get("AVISA_API_TOKEN");
  if (env) return env;
  const { data } = await supabase
    .from("integration_settings")
    .select("value")
    .eq("key", "avisa_api_token")
    .maybeSingle();
  return data?.value || undefined;
}

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

  /** Linha padrão em toda sublista: só ao tocar aqui o painel libera "Iniciar Atendimento". */
  const ROW_FALAR_ATENDENTE = {
    title: "Falar com atendente",
    desc: "Falar com um atendente humano sobre este assunto.",
    RowId: "falar_atendente",
  };
  const appendFalarAtendente = (list: any[]) => [...list, ROW_FALAR_ATENDENTE];

  // ── Menu principal ──────────────────────────────────────────────────
  const mainMenuResponses: Record<string, { text: string; subList?: { desc: string; buttontext: string; list: any[] } }> = {
    faturas: {
      text: "💰 Vamos falar de Faturas e Pagamentos!\n\nConsigo te ajudar a emitir a segunda via da sua fatura, ver formas de pagamento e consultar as condições de parcelamento dos débitos.\n\nClique em ver opções e escolha o serviço desejado.",
      subList: {
        desc: "Selecione o serviço desejado:",
        buttontext: "Ver opções",
        list: appendFalarAtendente([
          { title: "Pagar Fatura", desc: "Veja contas em aberto e formas de pagamento...", RowId: "pagar_fatura" },
          { title: "Segunda Via", desc: "Baixe sua fatura e veja o histórico...", RowId: "segunda_via" },
          { title: "Parcelamento", desc: "Parcele direto na fatura ou cartão de crédito...", RowId: "parcelamento" },
          { title: "Informar pagamento", desc: "Caso tenha pago a fatura, informe seu pagamento.", RowId: "informar_pagamento" },
          { title: "Fatura Protegida", desc: "Orientações gerais sobre o seguro fatura protegida.", RowId: "fatura_protegida" },
          { title: "Voltar ao menu", desc: "Confira a lista completa de serviços.", RowId: "voltar_menu" },
        ]),
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
    if (state === null) {
      // Limpa estado do bot e remove permissão de iniciar atendimento até nova escolha
      await supabaseClient
        .from("whatsapp_conversations")
        .update({ session_data: {} })
        .eq("id", conversationId);
      return;
    }
    const { data: row } = await supabaseClient
      .from("whatsapp_conversations")
      .select("session_data")
      .eq("id", conversationId)
      .maybeSingle();
    const prev = (row?.session_data && typeof row.session_data === "object") ? row.session_data as Record<string, unknown> : {};
    await supabaseClient
      .from("whatsapp_conversations")
      .update({
        session_data: { ...prev, chatbot_state: state },
      })
      .eq("id", conversationId);
  };

  /** Só depois dessa escolha o atendente pode clicar em "Iniciar Atendimento" na mesa. */
  const setAgentHandoffAllowed = async (allowed: boolean) => {
    if (!supabaseClient || !conversationId) return;
    const { data: row } = await supabaseClient
      .from("whatsapp_conversations")
      .select("session_data")
      .eq("id", conversationId)
      .maybeSingle();
    const prev = (row?.session_data && typeof row.session_data === "object") ? row.session_data as Record<string, unknown> : {};
    const next = { ...prev, agent_handoff_allowed: allowed };
    if (!allowed) delete next.agent_handoff_allowed;
    await supabaseClient
      .from("whatsapp_conversations")
      .update({ session_data: next })
      .eq("id", conversationId);
  };

  const id = selectedRowId || selectedButtonId || "";

  try {
    // ── Falar com atendente: libera "Iniciar Atendimento" no painel ──
    if (id === "falar_atendente") {
      await sendText(
        "👤 *Falar com atendente*\n\nPerfeito! Um atendente poderá iniciar o atendimento com você pelo painel em instantes. Aguarde."
      );
      await setAgentHandoffAllowed(true);
      console.log("avisa-webhook: agent_handoff_allowed=true (falar_atendente)");
      return;
    }

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
        await setSessionState(null); // {} — atendente só inicia após "Falar com atendente"
      } else {
        await setSessionState(null);
        await setAgentHandoffAllowed(true); // sem sublista, fluxo já é handoff
      }
      console.log("avisa-webhook: auto-reply enviado para:", id);
      return;
    }

    // Sub-menu Faturas (exceto pagar_fatura): não libera atendente até "Falar com atendente"
    if (faturasSubResponses[id]) {
      await sendText(
        "Para seguir com este serviço com um atendente humano, toque em *Ver opções* e escolha *Falar com atendente*."
      );
      const faturasEntry = mainMenuResponses.faturas;
      if (faturasEntry.subList) {
        await sendList(
          faturasEntry.subList.desc,
          faturasEntry.subList.buttontext,
          faturasEntry.subList.list
        );
      }
      await setSessionState(null);
      console.log("avisa-webhook: sub-menu faturas — aguardando falar_atendente:", id);
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

/**
 * Extrai número só de JIDs que representam telefone WhatsApp.
 * - @s.whatsapp.net: local pode ser "554792922940" ou "554792922940:57" → usar parte antes de ':' (número bruto).
 * - @lid: não é telefone (ex.: 124867835863250) → ignorar.
 * - @g.us: grupo → não usar como telefone de contato.
 */
function extractPhoneFromJid(jid: string | null | undefined): string | null {
  if (!jid || typeof jid !== "string") return null;
  const trimmed = jid.trim();
  if (trimmed.includes("@g.us")) return null;
  if (trimmed.includes("@lid")) return null;

  let localPart = trimmed.split("@")[0];
  if (!localPart) return null;

  // Formato número:device → telefone é só a parte antes dos dois-pontos
  if (localPart.includes(":")) {
    localPart = localPart.split(":")[0];
  }

  const digits = localPart.replace(/[^0-9]/g, "");
  // E.164 até ~15 dígitos; aceitar até 20 por variações de payload
  if (digits.length >= 10 && digits.length <= 20) return digits;

  return null;
}

/**
 * Resolve o número do cliente a partir de Chat, Sender, etc.
 * AvisaAPI às vezes manda telefone em Chat, outras em Sender; SenderAlt pode ser @lid (não é telefone).
 */
function resolvePhoneNumberFromInfo(info: any, data: any): string {
  const chat = info.Chat ?? info.chat;
  const sender = info.Sender ?? info.sender;
  const recipient = info.Recipient ?? info.recipient;

  const candidates: string[] = [];
  const push = (jid: string | null | undefined) => {
    const n = extractPhoneFromJid(jid);
    if (n && !candidates.includes(n)) candidates.push(n);
  };

  // Ordem: Chat (conversa) → Sender → Recipient (quem enviou / com quem falar)
  push(chat);
  push(sender);
  push(recipient);

  // Preferir número BR (55 + DDD + número) quando houver mais de um candidato
  const brLike = candidates.find((c) =>
    c.startsWith("55") && c.length >= 12 && c.length <= 13
  );
  if (brLike) {
    console.log("avisa-webhook: phone resolved (BR):", brLike, "candidates:", candidates);
    return brLike;
  }

  if (candidates.length > 0) {
    console.log("avisa-webhook: phone resolved:", candidates[0], "candidates:", candidates);
    return candidates[0];
  }

  // Fallback: payload direto (sem JID válido)
  const fallback = String(data.phone ?? data.from ?? data.sender ?? "")
    .replace(/[^0-9]/g, "");
  if (fallback.length >= 10) return fallback;

  // Último recurso: qualquer JID com @s.whatsapp.net não tratado acima
  const anyJid = chat || sender || "";
  if (anyJid.includes("@s.whatsapp.net")) {
    const local = anyJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    if (local.length >= 10) return local;
  }

  // DeviceSentMeta / destino da mensagem (às vezes só ali vem o número do cliente)
  const destJid =
    info.DeviceSentMeta?.DestinationJID ??
    info.deviceSentMeta?.destinationJID ??
    info.DestinationJID;
  push(destJid);

  if (candidates.length > 0) {
    const brLike2 = candidates.find((c) =>
      c.startsWith("55") && c.length >= 12 && c.length <= 13
    );
    if (brLike2) return brLike2;
    return candidates[0];
  }

  // Varredura em qualquer string do info que seja JID @s.whatsapp.net
  const found = findWhatsAppPhoneJidInValue(info);
  if (found) {
    console.log("avisa-webhook: phone resolved (scan):", found);
    return found;
  }

  return "";
}

/** Percorre objeto/array e retorna o primeiro número extraído de string *@s.whatsapp.net */
function findWhatsAppPhoneJidInValue(val: any, depth = 0): string | null {
  if (depth > 6 || val == null) return null;
  if (typeof val === "string" && val.includes("@s.whatsapp.net")) {
    const n = extractPhoneFromJid(val);
    if (n) return n;
  }
  if (typeof val === "object") {
    if (Array.isArray(val)) {
      for (const item of val) {
        const n = findWhatsAppPhoneJidInValue(item, depth + 1);
        if (n) return n;
      }
    } else {
      for (const k of Object.keys(val)) {
        const n = findWhatsAppPhoneJidInValue(val[k], depth + 1);
        if (n) return n;
      }
    }
  }
  return null;
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

  const phoneNumber = resolvePhoneNumberFromInfo(info, data);

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

    // JSON completo recebido da AvisaAPI (para debug; truncado se muito grande)
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const maxLen = 80000;
      if (jsonStr.length > maxLen) {
        console.log(
          "avisa-webhook payload JSON (truncado):",
          jsonStr.slice(0, maxLen),
          `\n... [total ${jsonStr.length} chars, truncado em ${maxLen}]`
        );
      } else {
        console.log("avisa-webhook payload JSON:", jsonStr);
      }
    } catch (e) {
      console.log("avisa-webhook payload JSON: [erro ao serializar]", e);
      console.log("avisa-webhook payload (raw data):", data);
    }

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

    // Ignorar se não for mensagem
    if (eventType && eventType !== "Message" && eventType !== "text") {
      console.log("avisa-webhook: evento ignorado, type:", eventType);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "not_a_message", type: eventType }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IsFromMe: mensagem enviada pelo WhatsApp da empresa — salvar como outbound (não incrementar unread)
    if (isFromMe) {
      if (eventType && eventType !== "Message" && eventType !== "text") {
        return new Response(
          JSON.stringify({ status: "ignored", reason: "not_a_message", type: eventType }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!phoneNumber) {
        console.warn("avisa-webhook: IsFromMe sem telefone resolvido, ignorando");
        return new Response(
          JSON.stringify({ status: "ignored", reason: "phone_not_found_outbound" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseOut = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      if (externalMsgId) {
        const { data: existingOut } = await supabaseOut
          .from("whatsapp_messages")
          .select("id")
          .eq("external_msg_id", externalMsgId)
          .maybeSingle();
        if (existingOut) {
          return new Response(
            JSON.stringify({ status: "already_processed", message_id: existingOut.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { data: conversationOut, error: convErrOut } = await supabaseOut
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

      if (convErrOut || !conversationOut) {
        console.error("avisa-webhook: IsFromMe erro conversa:", convErrOut);
        throw new Error("Falha ao criar/atualizar conversa (outbound): " + convErrOut?.message);
      }

      const { data: msgOut, error: msgErrOut } = await supabaseOut
        .from("whatsapp_messages")
        .insert({
          whatsapp_conversation_id: conversationOut.id,
          direction: "outbound",
          sender_type: "agent",
          content: content || "(sem conteúdo de texto)",
          content_type: contentType,
          status: "sent",
          external_msg_id: externalMsgId,
          raw_payload: data,
        })
        .select()
        .single();

      if (msgErrOut) {
        if (msgErrOut.code === "23505") {
          return new Response(
            JSON.stringify({ status: "duplicate_ignored" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("avisa-webhook: IsFromMe erro mensagem:", msgErrOut);
        throw new Error("Falha ao salvar mensagem outbound: " + msgErrOut.message);
      }

      await supabaseOut
        .from("service_queue")
        .update({
          last_message: content,
          updated_at: new Date().toISOString(),
        })
        .eq("whatsapp_conversation_id", conversationOut.id)
        .in("status", ["waiting", "in_progress"]);

      console.log("avisa-webhook: outbound (WhatsApp direto) salva, message_id:", msgOut.id);
      return new Response(
        JSON.stringify({
          status: "ok",
          message_id: msgOut.id,
          conversation_id: conversationOut.id,
          phone_number: phoneNumber,
          direction: "outbound",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phoneNumber) {
      // 200 evita retries agressivos; AvisaAPI pode reenviar se receber 400
      const infoKeys = info && typeof info === "object" ? Object.keys(info) : [];
      console.error("avisa-webhook: telefone não encontrado — info keys:", infoKeys);
      console.error(
        "avisa-webhook: Chat/Sender sample:",
        (info.Chat || info.chat || "").slice(0, 80),
        (info.Sender || info.sender || "").slice(0, 80)
      );
      return new Response(
        JSON.stringify({
          status: "ignored",
          reason: "phone_not_found",
          hint: "Nenhum JID @s.whatsapp.net com número válido em Chat/Sender/Recipient",
          info_keys: infoKeys,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const avisaApiKey = await resolveAvisaApiKey(supabase);

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
      if (avisaApiKey) {
        sendWelcomeMessages(phoneNumber, avisaApiKey, supabase, conversation.id).catch((err) =>
          console.error("avisa-webhook: falha no envio de boas-vindas:", err)
        );
      } else {
        console.warn("avisa-webhook: AVISA_API_KEY não configurado, boas-vindas não enviadas");
      }
    }

    // Verificar estado do chatbot (ex: aguardando CPF)
    const chatbotState = conversation.session_data?.chatbot_state;

    if (chatbotState === "awaiting_cpf" && avisaApiKey && !selectedRowId && !selectedButtonId) {
      handleAutoReply(
        phoneNumber, contentType, "__awaiting_cpf__", null,
        avisaApiKey, supabase, conversation.id, content,
      ).catch((err) => console.error("avisa-webhook: falha no auto-reply CPF:", err));
    }
    // Auto-reply para respostas de menu interativo
    else if (selectedRowId || selectedButtonId) {
      if (avisaApiKey) {
        handleAutoReply(
          phoneNumber, contentType, selectedRowId, selectedButtonId,
          avisaApiKey, supabase, conversation.id, content,
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
