import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CreateComplaintData {
  isAnonymous: boolean;
  name?: string;
  email?: string;
  phone?: string;
  type: string;
  category: string;
  description: string;
  location?: string;
}

interface TransferToHumanData {
  customerName: string;
  customerPhone?: string;
  subject: string;
  voiceSessionId?: string;
}

interface LookupProtocolData {
  protocolNumber: string;
}

function normalizeType(type: string): string {
  const typeMap: Record<string, string> = {
    'Reclamação': 'reclamacao',
    'reclamação': 'reclamacao',
    'reclamacao': 'reclamacao',
    'Denúncia': 'denuncia',
    'denúncia': 'denuncia',
    'denuncia': 'denuncia',
    'Sugestão': 'sugestao',
    'sugestão': 'sugestao',
    'sugestao': 'sugestao',
  };
  return typeMap[type] || 'reclamacao';
}

function generateProtocolNumber(type: string): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  let prefix = 'SOL';
  if (type === 'reclamacao') prefix = 'REC';
  else if (type === 'denuncia') prefix = 'DEN';
  else if (type === 'sugestao') prefix = 'SUG';
  
  return `${prefix}-${year}-${randomNum}`;
}

// Detect if body is a direct webhook call (Server Tool) or wrapped client tool call
function parseRequest(body: Record<string, unknown>): { action: string; data: Record<string, unknown>; channel: string } {
  // Client Tool format: { action: "createComplaint", data: { ... } }
  if (body.action && body.data) {
    return { action: body.action as string, data: body.data as Record<string, unknown>, channel: 'voice' };
  }
  
  // Server Tool (webhook) format: direct params like { type, category, description, ... }
  if (body.type && body.category && body.description) {
    return { action: 'createComplaint', data: body, channel: 'phone' };
  }

  // Transfer webhook format
  if (body.customerName && body.subject) {
    return { action: 'transferToHuman', data: body, channel: 'phone' };
  }

  // Lookup webhook format
  if (body.protocolNumber) {
    return { action: 'lookupProtocol', data: body, channel: 'phone' };
  }

  // Fallback to original format
  return { action: body.action as string || 'unknown', data: body.data as Record<string, unknown> || body, channel: 'voice' };
}

async function handleCreateComplaint(supabase: ReturnType<typeof createClient>, complaintData: CreateComplaintData, channel: string) {
  const normalizedType = normalizeType(complaintData.type);
  const protocolNumber = generateProtocolNumber(normalizedType);

  const { data: complaint, error: complaintError } = await supabase
    .from('complaints')
    .insert({
      protocol_number: protocolNumber,
      type: normalizedType,
      category: complaintData.category,
      description: complaintData.description,
      is_anonymous: complaintData.isAnonymous,
      reporter_name: complaintData.isAnonymous ? null : complaintData.name,
      reporter_email: complaintData.isAnonymous ? null : complaintData.email,
      reporter_phone: complaintData.isAnonymous ? null : complaintData.phone,
      location: complaintData.location,
      status: 'novo',
      channel: channel,
      waiting_since: new Date().toISOString(),
    })
    .select()
    .single();

  if (complaintError) {
    console.error('Error creating complaint:', complaintError);
    throw new Error(`Failed to create complaint: ${complaintError.message}`);
  }

  // NOTE: Do NOT insert into service_queue here.
  // Voice/web complaints go straight to Solicitações.
  // Only transferToHuman should add to the queue for Atendimento.

  console.log(`Complaint created via ${channel} with protocol: ${protocolNumber}`);

  return {
    success: true,
    protocolNumber,
    complaintId: complaint.id,
    message: `Sua solicitação foi registrada com sucesso. Seu protocolo é ${protocolNumber}.`,
  };
}

async function handleTransferToHuman(supabase: ReturnType<typeof createClient>, transferData: TransferToHumanData, channel: string) {
  const { data: queueItem, error: queueError } = await supabase
    .from('service_queue')
    .insert({
      channel: channel,
      status: 'waiting',
      priority: 1,
      customer_name: transferData.customerName || 'Cliente',
      customer_phone: transferData.customerPhone,
      subject: transferData.subject || 'Solicitação de atendimento humano',
      voice_session_id: transferData.voiceSessionId,
      waiting_since: new Date().toISOString(),
    })
    .select()
    .single();

  if (queueError) {
    console.error('Error creating queue item:', queueError);
    throw new Error(`Failed to transfer to human: ${queueError.message}`);
  }

  console.log(`Transferred to human queue via ${channel}: ${queueItem.id}`);

  return {
    success: true,
    queueId: queueItem.id,
    message: 'Você foi transferido para a fila de atendimento. Um atendente irá atendê-lo em breve.',
  };
}

async function handleLookupProtocol(supabase: ReturnType<typeof createClient>, lookupData: LookupProtocolData) {
  const { data: complaint, error: lookupError } = await supabase
    .from('complaints')
    .select('*')
    .eq('protocol_number', lookupData.protocolNumber)
    .single();

  if (lookupError || !complaint) {
    return {
      success: false,
      message: `Não foi encontrada nenhuma solicitação com o protocolo ${lookupData.protocolNumber}.`,
    };
  }

  const statusMessages: Record<string, string> = {
    novo: 'aguardando análise',
    em_analise: 'em andamento',
    resolvido: 'resolvida',
    fechado: 'encerrada',
  };

  return {
    success: true,
    complaint: {
      protocolNumber: complaint.protocol_number,
      type: complaint.type,
      category: complaint.category,
      status: complaint.status,
      createdAt: complaint.created_at,
    },
    message: `Sua solicitação ${complaint.protocol_number} está ${statusMessages[complaint.status] || complaint.status}.`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, data, channel } = parseRequest(body);

    console.log(`Voice agent action: ${action}, channel: ${channel}`, data);

    let result;
    switch (action) {
      case 'createComplaint':
        result = await handleCreateComplaint(supabase, data as unknown as CreateComplaintData, channel);
        break;
      case 'transferToHuman':
        result = await handleTransferToHuman(supabase, data as unknown as TransferToHumanData, channel);
        break;
      case 'lookupProtocol':
        result = await handleLookupProtocol(supabase, data as unknown as LookupProtocolData);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Voice agent tools error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
