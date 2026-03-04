import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  conversationId?: string;
  phoneNumber?: string;
  text: string;
  agentName?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error("Evolution API not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: SendMessageRequest = await req.json();

    let phoneNumber = body.phoneNumber;

    // If conversationId provided, get phone number from conversation
    if (body.conversationId && !phoneNumber) {
      const { data: conversation, error } = await supabase
        .from("whatsapp_conversations")
        .select("phone_number")
        .eq("id", body.conversationId)
        .single();

      if (error || !conversation) {
        throw new Error("Conversation not found");
      }

      phoneNumber = conversation.phone_number;
    }

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    if (!body.text) {
      throw new Error("Message text is required");
    }

    // Send message via Evolution API
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: body.text,
          delay: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", errorText);
      throw new Error(`Failed to send message: ${errorText}`);
    }

    const result = await response.json();
    console.log("Message sent successfully:", result);

    // Save message to database if conversationId provided
    if (body.conversationId) {
      await supabase.from("service_messages").insert({
        conversation_id: body.conversationId,
        channel: "whatsapp",
        sender_type: "agent",
        sender_name: body.agentName || "Atendente",
        content: body.text,
        metadata: { evolution_response: result },
      });

      // Update conversation last message
      await supabase
        .from("whatsapp_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", body.conversationId);

      // Update service queue last message
      await supabase
        .from("service_queue")
        .update({ 
          last_message: body.text,
          updated_at: new Date().toISOString()
        })
        .eq("whatsapp_conversation_id", body.conversationId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result?.key?.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
