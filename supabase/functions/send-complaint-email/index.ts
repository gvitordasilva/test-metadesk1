import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ComplaintEmailRequest {
  protocolNumber: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  type: string;
  category: string;
  description: string;
  captchaToken?: string;
  internalSource?: string;
}

interface RecaptchaV2Response {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

async function verifyRecaptchaV2(token: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");

  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY not configured");
    return { success: false, error: "reCAPTCHA not configured" };
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("reCAPTCHA API error:", errorText);
      return { success: false, error: "reCAPTCHA verification failed" };
    }

    const result: RecaptchaV2Response = await response.json();
    console.log("reCAPTCHA v2 result:", JSON.stringify(result, null, 2));

    if (!result.success) {
      const errorCodes = result["error-codes"] || [];
      console.log("reCAPTCHA validation failed:", errorCodes);
      return { success: false, error: "Invalid reCAPTCHA response" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return { success: false, error: "reCAPTCHA verification error" };
  }
}

function normalizePhoneE164(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `+55${digits}`;
  if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

async function sendSms(phone: string, message: string): Promise<void> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio SMS not configured");
    return;
  }

  const toNumber = normalizePhoneE164(phone);
  if (!toNumber) {
    console.error("Invalid phone number for SMS:", phone);
    return;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
        body: new URLSearchParams({
          To: toNumber,
          From: fromNumber,
          Body: message,
        }).toString(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio SMS error:", errorText);
    } else {
      console.log("SMS sent successfully to:", toNumber);
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ComplaintEmailRequest = await req.json();
    const { protocolNumber, email, name, phone, type, category, description, captchaToken, internalSource } = body;

    // Skip reCAPTCHA for internal/automated sources (chatbot, voice, etc.)
    const skipCaptcha = internalSource && ["chatbot", "voice", "whatsapp", "sms", "phone"].includes(internalSource);

    if (!skipCaptcha) {
      if (captchaToken) {
        const recaptchaResult = await verifyRecaptchaV2(captchaToken);
        
        if (!recaptchaResult.success) {
          console.log("reCAPTCHA validation failed:", recaptchaResult.error);
          return new Response(
            JSON.stringify({ error: recaptchaResult.error || "reCAPTCHA validation failed" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log("reCAPTCHA verified successfully");
      } else {
        return new Response(
          JSON.stringify({ error: "reCAPTCHA token required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("Skipping reCAPTCHA for internal source:", internalSource);
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
    };

    const categoryLabels: Record<string, string> = {
      atendimento: "Atendimento",
      produto: "Produto",
      servico: "Serviço",
      conduta: "Conduta",
      financeiro: "Financeiro",
      outro: "Outro",
    };

    // === Fetch notification settings from database ===
    let smsEnabled = true;
    let emailNotifEnabled = true;
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: notifSettings } = await supabaseAdmin
        .from("sla_settings")
        .select("metric_key, target_value")
        .in("metric_key", ["notif_sms_enabled", "notif_email_enabled"]);
      if (notifSettings) {
        for (const s of notifSettings) {
          if (s.metric_key === "notif_sms_enabled") smsEnabled = s.target_value === 1;
          if (s.metric_key === "notif_email_enabled") emailNotifEnabled = s.target_value === 1;
        }
      }
    } catch (settingsErr) {
      console.error("Error fetching notification settings, defaulting to enabled:", settingsErr);
    }

    // === 1. Send SMS notification ===
    if (phone && smsEnabled) {
      const smsMessage = `A Metadesk agradece seu contato! Seu atendimento gerou o protocolo "${protocolNumber}". Ate mais!`;
      await sendSms(phone, smsMessage);
    } else if (phone && !smsEnabled) {
      console.log("SMS notification disabled by settings, skipping");
    }

    // === 2. Send confirmation email to the reporter (if not anonymous) ===
    if (email && emailNotifEnabled) {
      const customerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #1a1a2e; color: #f0e68c; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0 0 5px 0; font-size: 28px; }
            .header p { margin: 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 30px 25px; background: #f9f9f9; }
            .greeting { font-size: 16px; margin-bottom: 15px; }
            .protocol-box { font-size: 22px; font-weight: bold; color: #1a1a2e; background: #f0e68c; padding: 18px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .details-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .details-card h3 { margin: 0 0 15px 0; color: #1a1a2e; font-size: 16px; }
            .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
            .detail-label { font-weight: bold; color: #666; min-width: 120px; }
            .detail-value { color: #333; }
            .description-box { background: #f5f5f5; padding: 15px; border-radius: 6px; margin-top: 10px; font-size: 14px; color: #555; }
            .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .info-box h4 { margin: 0 0 8px 0; color: #1e40af; font-size: 14px; }
            .info-box ul { margin: 5px 0 0 0; padding-left: 20px; font-size: 13px; color: #3b82f6; }
            .info-box li { margin-bottom: 4px; }
            .thank-you { text-align: center; padding: 15px; font-size: 15px; color: #555; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 11px; background: #f0f0f0; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Metadesk</h1>
              <p>Canal de Reclamações e Denúncias</p>
            </div>
            <div class="content">
              <p class="greeting">Olá${name ? `, <strong>${name}</strong>` : ""}!</p>
              <p>Agradecemos por entrar em contato conosco. Sua solicitação foi registrada com sucesso e já está sendo analisada pela nossa equipe.</p>
              
              <div class="protocol-box">
                📋 Protocolo: ${protocolNumber}
              </div>
              
              <div class="details-card">
                <h3>📝 Detalhes da sua solicitação</h3>
                <p><strong>Tipo:</strong> ${typeLabels[type] || type}</p>
                <p><strong>Categoria:</strong> ${categoryLabels[category] || category}</p>
                <p><strong>Data do registro:</strong> ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                <div class="description-box">
                  <strong>Descrição:</strong><br>
                  ${description.substring(0, 300)}${description.length > 300 ? "..." : ""}
                </div>
              </div>
              
              <div class="info-box">
                <h4>ℹ️ Próximos passos</h4>
                <ul>
                  <li>Sua solicitação será analisada pela equipe responsável</li>
                  <li>Você receberá atualizações por e-mail sobre o andamento</li>
                  <li>Guarde o número do protocolo para consultas futuras</li>
                  <li>Prazo estimado de retorno: até 5 dias úteis</li>
                </ul>
              </div>

              <p class="thank-you">A Metadesk agradece seu contato e reafirma o compromisso com a transparência e qualidade no atendimento.</p>
            </div>
            <div class="footer">
              <p>Este é um e-mail automático. Por favor, não responda diretamente.</p>
              <p>© ${new Date().getFullYear()} Metadesk. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const customerEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: email,
          subject: `✅ Solicitação Registrada - Protocolo ${protocolNumber}`,
          html: customerEmailHtml,
        }),
      });

      if (!customerEmailResponse.ok) {
        const error = await customerEmailResponse.text();
        console.error("Failed to send customer email:", error);
      } else {
        console.log("Customer email sent successfully");
      }
    } else if (email && !emailNotifEnabled) {
      console.log("Email notification disabled by settings, skipping customer email");
    }

    // === 3. Send notification to the company (internal team) ===
    const companyEmail = Deno.env.get("COMPANY_NOTIFICATION_EMAIL") || "atendimento@metadesk.com.br";
    
    const internalEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .protocol { font-size: 20px; font-weight: bold; color: #dc2626; padding: 10px; background: #fee2e2; text-align: center; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .label { font-weight: bold; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Nova ${typeLabels[type] || type}</h1>
          </div>
          <div class="content">
            <div class="protocol">
              Protocolo: ${protocolNumber}
            </div>
            
            <div class="details">
              <p><span class="label">Tipo:</span> ${typeLabels[type] || type}</p>
              <p><span class="label">Categoria:</span> ${categoryLabels[category] || category}</p>
              <p><span class="label">Solicitante:</span> ${name ? `${name} (${email || "sem email"})` : "Anônimo"}</p>
              ${phone ? `<p><span class="label">Telefone:</span> ${phone}</p>` : ""}
              <p><span class="label">Descrição:</span></p>
              <p style="background: #f5f5f5; padding: 15px; border-radius: 4px;">${description}</p>
            </div>
            
            <p style="text-align: center;">
              <a href="https://metadesk.lovable.app/solicitacoes" 
                 style="background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Acessar Painel
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const internalEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: companyEmail,
        subject: `🚨 Nova ${typeLabels[type] || type} - Protocolo ${protocolNumber}`,
        html: internalEmailHtml,
      }),
    });

    if (!internalEmailResponse.ok) {
      const error = await internalEmailResponse.text();
      console.error("Failed to send internal email:", error);
    } else {
      console.log("Internal notification email sent successfully");
    }

    return new Response(
      JSON.stringify({ success: true, protocolNumber }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-complaint-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
