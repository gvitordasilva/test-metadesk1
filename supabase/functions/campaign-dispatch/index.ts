import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DispatchRequest {
  campaignId: string;
}

async function sendEmail(resend: any, to: string, subject: string, content: string, name?: string) {
  const result = await resend.emails.send({
    from: "Campanhas <noreply@metadesk.com.br>",
    to: [to],
    subject,
    html: content,
  });
  return result;
}

async function sendSms(accountSid: string, authToken: string, fromNumber: string, to: string, body: string) {
  // Ensure E.164 format
  const formattedTo = to.startsWith("+") ? to : `+${to}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);
  
  const params = new URLSearchParams();
  params.append("To", formattedTo);
  params.append("From", fromNumber.startsWith("+") ? fromNumber : `+${fromNumber}`);
  params.append("Body", body);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio error: ${errorText}`);
  }
  return await response.json();
}

async function sendWhatsApp(evolutionUrl: string, apiKey: string, instanceName: string, to: string, text: string) {
  const response = await fetch(
    `${evolutionUrl}/message/sendText/${instanceName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({ number: to, text, delay: 1000 }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API error: ${errorText}`);
  }
  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { campaignId }: DispatchRequest = await req.json();

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // Update status to active
    await supabase
      .from("campaigns")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", campaignId);

    const recipients = campaign.recipients as Array<{ name?: string; email?: string; phone?: string }>;
    let delivered = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        let contact = "";

        if (campaign.channel === "email") {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
          const resend = new Resend(RESEND_API_KEY);
          contact = recipient.email || "";
          if (!contact) throw new Error("No email for recipient");
          await sendEmail(resend, contact, campaign.subject || campaign.name, campaign.content, recipient.name);
        } else if (campaign.channel === "sms") {
          const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
          const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
          const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
          if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
            throw new Error("Twilio not configured");
          }
          contact = recipient.phone || "";
          if (!contact) throw new Error("No phone for recipient");
          await sendSms(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, contact, campaign.content);
        } else if (campaign.channel === "whatsapp") {
          const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
          const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
          const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");
          if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
            throw new Error("Evolution API not configured");
          }
          contact = recipient.phone || "";
          if (!contact) throw new Error("No phone for recipient");
          await sendWhatsApp(EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME, contact, campaign.content);
        }

        // Log success
        await supabase.from("campaign_sends").insert({
          campaign_id: campaignId,
          recipient_name: recipient.name,
          recipient_contact: contact,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
        delivered++;
      } catch (err) {
        console.error(`Failed to send to recipient:`, err);
        const contact = recipient.email || recipient.phone || "unknown";
        await supabase.from("campaign_sends").insert({
          campaign_id: campaignId,
          recipient_name: recipient.name,
          recipient_contact: contact,
          status: "failed",
          error_message: err.message,
        });
        failed++;
      }
    }

    // Update campaign with results
    const finalStatus = failed === recipients.length ? "failed" : "completed";
    await supabase
      .from("campaigns")
      .update({
        status: finalStatus,
        delivered,
        failed,
        total_recipients: recipients.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({ success: true, delivered, failed, total: recipients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign dispatch error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
