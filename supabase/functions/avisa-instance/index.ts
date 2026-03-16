/**
 * avisa-instance — Proxy para gerenciar conexão WhatsApp na AvisaAPI (QR / status / desconectar)
 *
 * Token: AVISA_API_KEY ou AVISA_API_TOKEN no env, ou integration_settings.key = 'avisa_api_token'.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AVISA_BASE = "https://www.avisaapi.com.br/api";
const SETTINGS_KEY = "avisa_api_token";

async function resolveAvisaApiKey(supabase: ReturnType<typeof createClient>): Promise<string | undefined> {
  const env = Deno.env.get("AVISA_API_KEY") || Deno.env.get("AVISA_API_TOKEN");
  if (env) return env;
  const { data } = await supabase
    .from("integration_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  return data?.value || undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Use POST com { action: 'qr' | 'status' | 'disconnect' }" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const avisaApiKey = await resolveAvisaApiKey(supabase);
    if (!avisaApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Token AvisaAPI não configurado. Defina AVISA_API_KEY no servidor ou salve o token em Integrações (integration_settings).",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: { action?: string; webhookUrl?: string } = {};
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object") body = parsed;
    } catch {
      body = {};
    }
    const action = (body?.action ?? "").toString().trim().toLowerCase();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${avisaApiKey}`,
      Accept: "application/json",
    };

    let url = "";
    let method = "GET";

    if (action === "qr") {
      url = `${AVISA_BASE}/instance/qr`;
      method = "GET";
    } else if (action === "status") {
      url = `${AVISA_BASE}/instance/status`;
      method = "GET";
    } else if (action === "disconnect" || action === "user") {
      url = `${AVISA_BASE}/instance/user`;
      method = "DELETE";
    } else if (action === "register_webhook" || action === "webhook_register") {
      // Requisição para AvisaAPI: POST {{baseurl}}/webhook, Bearer token, body: { "webhook": "https://..." }
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const webhookUrl = (body.webhookUrl && String(body.webhookUrl).trim()) || `${supabaseUrl}/functions/v1/avisa-webhook`;
      headers["Content-Type"] = "application/json";
      const avisaBody = JSON.stringify({ webhook: webhookUrl });
      const resWebhook = await fetch(`${AVISA_BASE}/webhook`, {
        method: "POST",
        headers,
        body: avisaBody,
      });
      const textW = await resWebhook.text();
      let dataW: unknown = textW;
      try {
        dataW = JSON.parse(textW);
      } catch {
        dataW = textW;
      }
      return new Response(
        JSON.stringify({
          ok: resWebhook.ok,
          status: resWebhook.status,
          webhookSent: webhookUrl,
          data: dataW,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "remove_webhook" || action === "webhook_remove") {
      url = `${AVISA_BASE}/webhook`;
      method = "POST";
      headers["Content-Type"] = "application/json";
      const resRemove = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ webhook: "" }),
      });
      const textR = await resRemove.text();
      let dataR: unknown = textR;
      try {
        dataR = JSON.parse(textR);
      } catch {
        dataR = textR;
      }
      return new Response(
        JSON.stringify({ ok: resRemove.ok, status: resRemove.status, data: dataR }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Sempre 200 para o cliente; erro no body (evita 400 no invoke)
      return new Response(
        JSON.stringify({
          ok: false,
          error: "action inválida",
          valid: ["qr", "status", "disconnect", "register_webhook", "remove_webhook"],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(url, { method, headers });
    const contentType = res.headers.get("content-type") || "";

    if (action === "qr" && contentType.includes("image")) {
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
      }
      const b64 = btoa(binary);
      return new Response(
        JSON.stringify({
          ok: res.ok,
          status: res.status,
          contentType,
          imageBase64: b64,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // mantém string
    }

    // Sempre HTTP 200 na Edge Function — senão supabase.functions.invoke falha com
    // "non-2xx" e o front não recebe o corpo da AvisaAPI (ex.: QR já conectado retorna 4xx).
    return new Response(
      JSON.stringify({
        ok: res.ok,
        status: res.status,
        upstreamStatus: res.status,
        data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("avisa-instance:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
