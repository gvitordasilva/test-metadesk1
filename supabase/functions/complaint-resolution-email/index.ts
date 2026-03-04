import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { protocolNumber, email, name, type, category, resolutionMessage, responsibleName } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: true, message: "No email to send (anonymous)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabels: Record<string, string> = {
      reclamacao: "Reclamação",
      denuncia: "Denúncia",
      sugestao: "Sugestão",
      elogio: "Elogio",
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a2e; color: #f0e68c; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .protocol { font-size: 18px; font-weight: bold; color: #1a1a2e; background: #e8f5e9; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #4caf50; }
          .resolution { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
          .status-badge { display: inline-block; background: #4caf50; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-radius: 0 0 8px 8px; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Metadesk</h1>
            <p>Reclamações e Denúncias</p>
          </div>
          <div class="content">
            <p>Olá${name ? `, <strong>${name}</strong>` : ""},</p>
            
            <p>Temos uma atualização sobre a sua solicitação:</p>
            
            <div class="protocol">
              ✅ Protocolo: ${protocolNumber} — <span class="status-badge">CONCLUÍDO</span>
            </div>
            
            <p><strong>Tipo:</strong> ${typeLabels[type] || type}</p>
            <p><strong>Categoria:</strong> ${category}</p>
            
            <div class="resolution">
              <h3 style="margin-top: 0; color: #2e7d32;">📋 Resposta da equipe:</h3>
              <p>${resolutionMessage.replace(/\n/g, "<br>")}</p>
              ${responsibleName ? `<p style="color: #666; font-size: 13px; margin-bottom: 0;">— ${responsibleName}</p>` : ""}
            </div>
            
            <p>Se precisar de mais informações ou tiver novas questões, não hesite em abrir uma nova solicitação pelo nosso canal.</p>
            
            <p>Agradecemos sua confiança.</p>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático referente ao protocolo ${protocolNumber}.</p>
            <p>© ${new Date().getFullYear()} Metadesk. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: email,
        subject: `✅ Solicitação Concluída - Protocolo ${protocolNumber}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send resolution email:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Resolution email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("complaint-resolution-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
