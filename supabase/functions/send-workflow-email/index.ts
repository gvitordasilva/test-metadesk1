import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  complaint_id: string;
  to_email: string;
  to_name?: string;
  subject_override?: string;
  body_html: string;
  body_text?: string;
  sender_user_id?: string; // user whose email account to use
  cc?: string[];
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from_address: string;
  from_name?: string;
}

// Simple SMTP sender using Deno's TCP
async function sendSmtpEmail(config: SmtpConfig, to: string[], cc: string[], subject: string, html: string) {
  // Use Resend as fallback SMTP relay since Deno edge functions can't do raw TCP SMTP
  // Instead, we'll use the user's configured SMTP via a fetch to a relay
  // For now, use Resend API as the sending mechanism but with the user's identity
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: config.from_name 
          ? `${config.from_name} <${config.from_address}>` 
          : config.from_address,
        to,
        cc: cc.length > 0 ? cc : undefined,
        subject,
        html,
        reply_to: config.from_address,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email send failed: ${error}`);
    }

    return await response.json();
  }
  
  throw new Error("No email sending method available");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: SendEmailRequest = await req.json();
    const { complaint_id, to_email, to_name, subject_override, body_html, body_text, sender_user_id, cc } = body;

    // Fetch complaint details for subject
    const { data: complaint } = await supabaseAdmin
      .from("complaints")
      .select("protocol_number, type, category, description")
      .eq("id", complaint_id)
      .single();

    if (!complaint) {
      return new Response(
        JSON.stringify({ error: "Complaint not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabels: Record<string, string> = {
      reclamacao: "Reclamação",
      denuncia: "Denúncia",
      sugestao: "Sugestão",
      elogio: "Elogio",
    };

    const categoryLabels: Record<string, string> = {
      atendimento: "Atendimento",
      produto: "Produto",
      servico: "Serviço",
      conduta: "Conduta",
      financeiro: "Financeiro",
      outro: "Outro",
    };

    // Build subject with protocol + topic reference
    const typeLabel = typeLabels[complaint.type] || complaint.type;
    const catLabel = categoryLabels[complaint.category?.toLowerCase()] || complaint.category;
    const subject = subject_override || `[${complaint.protocol_number}] ${typeLabel} - ${catLabel}`;

    // Determine sender: check if user has a connected email account
    let senderConfig: SmtpConfig | null = null;
    
    if (sender_user_id) {
      const { data: emailAccount } = await supabaseAdmin
        .from("email_accounts")
        .select("*")
        .eq("user_id", sender_user_id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .limit(1)
        .single();

      if (emailAccount) {
        senderConfig = {
          host: emailAccount.smtp_host || "",
          port: emailAccount.smtp_port || 587,
          user: emailAccount.smtp_user || "",
          password: emailAccount.smtp_password || "",
          from_address: emailAccount.email_address,
          from_name: emailAccount.display_name || undefined,
        };
      }
    }

    // Fallback to system email
    if (!senderConfig) {
      const RESEND_FROM = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";
      senderConfig = {
        host: "",
        port: 587,
        user: "",
        password: "",
        from_address: RESEND_FROM,
        from_name: "Metadesk",
      };
    }

    // Wrap body in branded template
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; color: #f0e68c; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Metadesk</h2>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${subject}</p>
          </div>
          <div style="padding: 24px; background: #f9f9f9;">
            ${body_html}
            <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 13px; color: #1e40af;">
              <strong>Protocolo:</strong> ${complaint.protocol_number}<br>
              Para dar continuidade, responda diretamente este e-mail.
            </div>
          </div>
          <div style="text-align: center; padding: 16px; color: #999; font-size: 11px; background: #f0f0f0; border-radius: 0 0 8px 8px;">
            <p>© ${new Date().getFullYear()} Metadesk. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send the email
    const result = await sendSmtpEmail(
      senderConfig,
      [to_email],
      cc || [],
      subject,
      fullHtml
    );

    // Generate a unique message ID
    const messageId = `<${crypto.randomUUID()}@metadesk.app>`;

    // Store the email in email_messages
    const { error: insertError } = await supabaseAdmin
      .from("email_messages")
      .insert({
        complaint_id,
        email_account_id: null, // will be set if user account was used
        message_id: messageId,
        direction: "outbound",
        from_address: senderConfig.from_address,
        to_addresses: [to_email],
        cc_addresses: cc || [],
        subject,
        body_text: body_text || "",
        body_html: fullHtml,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error storing email message:", insertError);
    }

    // Add audit log entry
    await supabaseAdmin
      .from("complaint_audit_log")
      .insert({
        complaint_id,
        action: "email_sent",
        field_changed: "email",
        new_value: `Email enviado para ${to_email}`,
        notes: subject,
        user_id: sender_user_id || null,
      });

    console.log("Workflow email sent successfully to:", to_email);

    return new Response(
      JSON.stringify({ success: true, message_id: messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-workflow-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
