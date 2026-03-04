import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This edge function polls connected email accounts for replies
 * to complaint-related emails. It matches by subject protocol number.
 * 
 * In a production environment, this would use IMAP or Gmail/Outlook APIs.
 * For now, it provides the structure and can be triggered by cron or manually.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all active email accounts that need polling
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("email_accounts")
      .select("*")
      .eq("is_active", true)
      .not("account_type", "eq", "system");

    if (accountsError) {
      throw new Error(`Error fetching accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No email accounts to poll", polled: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalNewMessages = 0;

    for (const account of accounts) {
      try {
        let newMessages = 0;

        if (account.account_type === "gmail_oauth") {
          newMessages = await pollGmail(supabaseAdmin, account);
        } else if (account.account_type === "outlook_oauth") {
          newMessages = await pollOutlook(supabaseAdmin, account);
        } else if (account.account_type === "smtp") {
          // IMAP polling would go here
          // For SMTP-only accounts, we can't poll - skip
          console.log(`Skipping SMTP-only account ${account.email_address} - no IMAP configured`);
          if (account.imap_host) {
            // Would do IMAP poll here
            console.log(`IMAP configured for ${account.email_address} but not yet implemented`);
          }
        }

        // Update last_poll_at
        await supabaseAdmin
          .from("email_accounts")
          .update({ 
            last_poll_at: new Date().toISOString(),
            last_poll_error: null,
          })
          .eq("id", account.id);

        totalNewMessages += newMessages;
      } catch (pollError) {
        console.error(`Error polling account ${account.email_address}:`, pollError);
        await supabaseAdmin
          .from("email_accounts")
          .update({ 
            last_poll_at: new Date().toISOString(),
            last_poll_error: pollError.message,
          })
          .eq("id", account.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        accounts_polled: accounts.length,
        new_messages: totalNewMessages,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in poll-email-replies:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function pollGmail(supabase: any, account: any): Promise<number> {
  if (!account.oauth_access_token) {
    throw new Error("No OAuth access token");
  }

  // Check if token is expired and refresh if needed
  let accessToken = account.oauth_access_token;
  if (account.oauth_token_expires_at && new Date(account.oauth_token_expires_at) < new Date()) {
    accessToken = await refreshGmailToken(supabase, account);
  }

  // Search for emails with protocol numbers in subject
  // Pattern: [REC-YYYY-NNNNNN] or [DEN-YYYY-NNNNNN] or [SUG-YYYY-NNNNNN]
  const query = `subject:(REC- OR DEN- OR SUG-) newer_than:1d`;
  
  const searchResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    throw new Error(`Gmail search failed: ${errorText}`);
  }

  const searchData = await searchResponse.json();
  if (!searchData.messages || searchData.messages.length === 0) {
    return 0;
  }

  let newCount = 0;
  for (const msg of searchData.messages) {
    // Check if we already have this message
    const { data: existing } = await supabase
      .from("email_messages")
      .select("id")
      .eq("metadata->>gmail_id", msg.id)
      .single();

    if (existing) continue;

    // Fetch full message
    const msgResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!msgResponse.ok) continue;

    const msgData = await msgResponse.json();
    const headers = msgData.payload?.headers || [];
    
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

    const subject = getHeader("Subject") || "";
    const from = getHeader("From") || "";
    const to = getHeader("To") || "";
    const messageId = getHeader("Message-ID") || "";
    const inReplyTo = getHeader("In-Reply-To") || "";
    const date = getHeader("Date") || "";

    // Extract protocol number from subject
    const protocolMatch = subject.match(/(REC|DEN|SUG)-\d{4}-\d{6}/);
    if (!protocolMatch) continue;

    const protocolNumber = protocolMatch[0];

    // Find the complaint
    const { data: complaint } = await supabase
      .from("complaints")
      .select("id")
      .eq("protocol_number", protocolNumber)
      .single();

    if (!complaint) continue;

    // Extract body
    let bodyText = "";
    let bodyHtml = "";
    
    function extractParts(payload: any) {
      if (payload.mimeType === "text/plain" && payload.body?.data) {
        bodyText = atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
      if (payload.mimeType === "text/html" && payload.body?.data) {
        bodyHtml = atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
      if (payload.parts) {
        for (const part of payload.parts) {
          extractParts(part);
        }
      }
    }
    extractParts(msgData.payload);

    // Store the inbound message
    await supabase.from("email_messages").insert({
      complaint_id: complaint.id,
      email_account_id: account.id,
      message_id: messageId,
      in_reply_to: inReplyTo || null,
      thread_id: msgData.threadId || null,
      direction: "inbound",
      from_address: from,
      to_addresses: [to],
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      status: "received",
      sent_at: date ? new Date(date).toISOString() : new Date().toISOString(),
      metadata: { gmail_id: msg.id, thread_id: msgData.threadId },
    });

    // Add audit log
    await supabase.from("complaint_audit_log").insert({
      complaint_id: complaint.id,
      action: "email_received",
      field_changed: "email",
      new_value: `Email recebido de ${from}`,
      notes: subject,
    });

    newCount++;
  }

  return newCount;
}

async function refreshGmailToken(supabase: any, account: any): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.oauth_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Gmail token");
  }

  const data = await response.json();
  
  await supabase
    .from("email_accounts")
    .update({
      oauth_access_token: data.access_token,
      oauth_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("id", account.id);

  return data.access_token;
}

async function pollOutlook(supabase: any, account: any): Promise<number> {
  if (!account.oauth_access_token) {
    throw new Error("No OAuth access token");
  }

  let accessToken = account.oauth_access_token;
  if (account.oauth_token_expires_at && new Date(account.oauth_token_expires_at) < new Date()) {
    accessToken = await refreshOutlookToken(supabase, account);
  }

  // Search for emails with protocol numbers
  const filter = `contains(subject, 'REC-') or contains(subject, 'DEN-') or contains(subject, 'SUG-')`;
  const searchUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$top=20&$orderby=receivedDateTime desc`;

  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Outlook search failed: ${errorText}`);
  }

  const data = await response.json();
  if (!data.value || data.value.length === 0) return 0;

  let newCount = 0;
  for (const msg of data.value) {
    // Check if already stored
    const { data: existing } = await supabase
      .from("email_messages")
      .select("id")
      .eq("metadata->>outlook_id", msg.id)
      .single();

    if (existing) continue;

    const subject = msg.subject || "";
    const protocolMatch = subject.match(/(REC|DEN|SUG)-\d{4}-\d{6}/);
    if (!protocolMatch) continue;

    const { data: complaint } = await supabase
      .from("complaints")
      .select("id")
      .eq("protocol_number", protocolMatch[0])
      .single();

    if (!complaint) continue;

    await supabase.from("email_messages").insert({
      complaint_id: complaint.id,
      email_account_id: account.id,
      message_id: msg.internetMessageId || null,
      in_reply_to: null,
      thread_id: msg.conversationId || null,
      direction: "inbound",
      from_address: msg.from?.emailAddress?.address || "",
      to_addresses: (msg.toRecipients || []).map((r: any) => r.emailAddress?.address),
      subject,
      body_text: msg.body?.contentType === "text" ? msg.body.content : "",
      body_html: msg.body?.contentType === "html" ? msg.body.content : "",
      status: "received",
      sent_at: msg.receivedDateTime || new Date().toISOString(),
      metadata: { outlook_id: msg.id, conversation_id: msg.conversationId },
    });

    await supabase.from("complaint_audit_log").insert({
      complaint_id: complaint.id,
      action: "email_received",
      field_changed: "email",
      new_value: `Email recebido de ${msg.from?.emailAddress?.address}`,
      notes: subject,
    });

    newCount++;
  }

  return newCount;
}

async function refreshOutlookToken(supabase: any, account: any): Promise<string> {
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials not configured");
  }

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.oauth_refresh_token,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Outlook token");
  }

  const data = await response.json();

  await supabase
    .from("email_accounts")
    .update({
      oauth_access_token: data.access_token,
      oauth_refresh_token: data.refresh_token || account.oauth_refresh_token,
      oauth_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("id", account.id);

  return data.access_token;
}
