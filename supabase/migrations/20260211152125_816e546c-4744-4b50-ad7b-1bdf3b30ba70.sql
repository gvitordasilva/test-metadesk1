
-- 1. service_queue table
CREATE TABLE IF NOT EXISTS public.service_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'waiting',
  priority INTEGER NOT NULL DEFAULT 3,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_avatar TEXT,
  subject TEXT,
  last_message TEXT,
  unread_count INTEGER NOT NULL DEFAULT 1,
  complaint_id UUID,
  voice_session_id TEXT,
  assigned_to UUID,
  waiting_since TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.service_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view queue" ON public.service_queue FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert to queue" ON public.service_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update queue" ON public.service_queue FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete from queue" ON public.service_queue FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. complaint_audit_log table
CREATE TABLE IF NOT EXISTS public.complaint_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.complaint_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit log" ON public.complaint_audit_log FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Attendants can view audit log" ON public.complaint_audit_log FOR SELECT USING (has_role(auth.uid(), 'atendente'::app_role));
CREATE POLICY "Authenticated can insert audit log" ON public.complaint_audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Add last_assigned_at to attendant_profiles
ALTER TABLE public.attendant_profiles ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 4. Add ai_triage to complaints
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS ai_triage JSONB;

-- 5. chatbot_flows table
CREATE TABLE IF NOT EXISTS public.chatbot_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Novo Fluxo',
  description TEXT,
  channel TEXT NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chatbot_flows" ON public.chatbot_flows FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can read active flows" ON public.chatbot_flows FOR SELECT USING (is_active = true);

-- 6. chatbot_nodes table
CREATE TABLE IF NOT EXISTS public.chatbot_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL DEFAULT 'message',
  name TEXT NOT NULL DEFAULT 'Novo Nó',
  content TEXT,
  options JSONB,
  action_type TEXT DEFAULT 'none',
  action_config JSONB,
  next_node_id UUID,
  node_order INTEGER NOT NULL DEFAULT 0,
  is_entry_point BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbot_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chatbot_nodes" ON public.chatbot_nodes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can read active nodes" ON public.chatbot_nodes FOR SELECT USING (is_active = true);

-- 7. chatbot_node_options table
CREATE TABLE IF NOT EXISTS public.chatbot_node_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES public.chatbot_nodes(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL DEFAULT '1',
  option_text TEXT NOT NULL DEFAULT 'Nova Opção',
  next_node_id UUID,
  option_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbot_node_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chatbot_node_options" ON public.chatbot_node_options FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can read node options" ON public.chatbot_node_options FOR SELECT USING (true);

-- 8. whatsapp_conversations table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  current_flow_id UUID REFERENCES public.chatbot_flows(id),
  current_node_id UUID REFERENCES public.chatbot_nodes(id),
  session_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp_conversations" ON public.whatsapp_conversations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Attendants can view whatsapp_conversations" ON public.whatsapp_conversations FOR SELECT USING (has_role(auth.uid(), 'atendente'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_service_queue_updated_at BEFORE UPDATE ON public.service_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chatbot_flows_updated_at BEFORE UPDATE ON public.chatbot_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chatbot_nodes_updated_at BEFORE UPDATE ON public.chatbot_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
