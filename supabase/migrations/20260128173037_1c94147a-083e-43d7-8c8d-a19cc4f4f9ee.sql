-- =============================================
-- CHATBOT DECISION TREE TABLES FOR METADESK
-- =============================================

-- 1. Chatbot Flows - Main flow container
CREATE TABLE public.chatbot_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'all' CHECK (channel IN ('whatsapp', 'webchat', 'all')),
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Chatbot Nodes - Individual nodes in the decision tree
CREATE TABLE public.chatbot_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id uuid NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
  node_type text NOT NULL CHECK (node_type IN ('message', 'menu', 'input', 'action', 'condition')),
  name text NOT NULL,
  content text,
  options jsonb,
  action_type text DEFAULT 'none' CHECK (action_type IN ('none', 'escalate', 'transfer', 'end', 'goto')),
  action_config jsonb,
  next_node_id uuid,
  node_order integer NOT NULL DEFAULT 0,
  is_entry_point boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add self-reference FK after table creation
ALTER TABLE public.chatbot_nodes 
ADD CONSTRAINT chatbot_nodes_next_node_fk 
FOREIGN KEY (next_node_id) REFERENCES public.chatbot_nodes(id) ON DELETE SET NULL;

-- 3. Chatbot Node Options - Menu options for navigation
CREATE TABLE public.chatbot_node_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES public.chatbot_nodes(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  option_text text NOT NULL,
  next_node_id uuid REFERENCES public.chatbot_nodes(id) ON DELETE SET NULL,
  option_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Add current_node_id column to existing whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS current_node_id uuid REFERENCES public.chatbot_nodes(id) ON DELETE SET NULL;

ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS customer_name text;

ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS escalated_at timestamp with time zone;

ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone DEFAULT now();

-- 5. Add whatsapp_conversation_id to service_queue
ALTER TABLE public.service_queue 
ADD COLUMN IF NOT EXISTS whatsapp_conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL;

-- 6. Add conversation_id to service_messages if not exists
ALTER TABLE public.service_messages 
ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_chatbot_nodes_flow_id ON public.chatbot_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_nodes_next_node_id ON public.chatbot_nodes(next_node_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_node_options_node_id ON public.chatbot_node_options(node_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_current_node ON public.whatsapp_conversations(current_node_id);
CREATE INDEX IF NOT EXISTS idx_service_messages_conversation ON public.service_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_service_queue_whatsapp_conv ON public.service_queue(whatsapp_conversation_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_node_options ENABLE ROW LEVEL SECURITY;

-- Chatbot Flows policies
CREATE POLICY "Authenticated users can read chatbot flows"
  ON public.chatbot_flows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage chatbot flows"
  ON public.chatbot_flows FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon can read flows (for edge functions)
CREATE POLICY "Anon can read chatbot flows"
  ON public.chatbot_flows FOR SELECT
  TO anon
  USING (true);

-- Chatbot Nodes policies
CREATE POLICY "Authenticated users can read chatbot nodes"
  ON public.chatbot_nodes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage chatbot nodes"
  ON public.chatbot_nodes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read chatbot nodes"
  ON public.chatbot_nodes FOR SELECT
  TO anon
  USING (true);

-- Chatbot Node Options policies
CREATE POLICY "Authenticated users can read node options"
  ON public.chatbot_node_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage node options"
  ON public.chatbot_node_options FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read node options"
  ON public.chatbot_node_options FOR SELECT
  TO anon
  USING (true);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_chatbot_flows_updated_at
  BEFORE UPDATE ON public.chatbot_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_nodes_updated_at
  BEFORE UPDATE ON public.chatbot_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();