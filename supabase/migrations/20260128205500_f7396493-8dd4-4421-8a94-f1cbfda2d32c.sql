-- =============================================
-- TABELAS DO CHATBOT (apenas as que faltam)
-- =============================================

-- chatbot_flows
CREATE TABLE IF NOT EXISTS public.chatbot_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- chatbot_nodes
CREATE TABLE IF NOT EXISTS public.chatbot_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id uuid NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
  node_type text NOT NULL,
  name text NOT NULL,
  content text,
  options jsonb,
  action_type text DEFAULT 'none',
  action_config jsonb,
  next_node_id uuid,
  node_order integer NOT NULL DEFAULT 0,
  is_entry_point boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- chatbot_node_options
CREATE TABLE IF NOT EXISTS public.chatbot_node_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES public.chatbot_nodes(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  option_text text NOT NULL,
  next_node_id uuid,
  option_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- CONSTRAINTS (IF NOT EXISTS não funciona, então uso DO block)
-- =============================================

DO $$ 
BEGIN
  -- Self-reference para chatbot_nodes.next_node_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chatbot_nodes_next_node_fk'
  ) THEN
    ALTER TABLE public.chatbot_nodes 
    ADD CONSTRAINT chatbot_nodes_next_node_fk 
    FOREIGN KEY (next_node_id) REFERENCES public.chatbot_nodes(id) ON DELETE SET NULL;
  END IF;

  -- FK para chatbot_node_options.next_node_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chatbot_node_options_next_node_id_fkey'
  ) THEN
    ALTER TABLE public.chatbot_node_options 
    ADD CONSTRAINT chatbot_node_options_next_node_id_fkey 
    FOREIGN KEY (next_node_id) REFERENCES public.chatbot_nodes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================
-- ÍNDICES (IF NOT EXISTS)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_chatbot_flows_active ON public.chatbot_flows(is_active);
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_channel ON public.chatbot_flows(channel);
CREATE INDEX IF NOT EXISTS idx_chatbot_nodes_flow ON public.chatbot_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_nodes_entry ON public.chatbot_nodes(is_entry_point) WHERE is_entry_point = true;
CREATE INDEX IF NOT EXISTS idx_chatbot_node_options_node ON public.chatbot_node_options(node_id);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_node_options ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES (drop and recreate to avoid conflicts)
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view chatbot flows" ON public.chatbot_flows;
DROP POLICY IF EXISTS "Authenticated users can manage chatbot flows" ON public.chatbot_flows;
DROP POLICY IF EXISTS "Authenticated users can view chatbot nodes" ON public.chatbot_nodes;
DROP POLICY IF EXISTS "Authenticated users can manage chatbot nodes" ON public.chatbot_nodes;
DROP POLICY IF EXISTS "Authenticated users can view chatbot node options" ON public.chatbot_node_options;
DROP POLICY IF EXISTS "Authenticated users can manage chatbot node options" ON public.chatbot_node_options;

CREATE POLICY "Authenticated users can view chatbot flows" 
ON public.chatbot_flows FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage chatbot flows" 
ON public.chatbot_flows FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view chatbot nodes" 
ON public.chatbot_nodes FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage chatbot nodes" 
ON public.chatbot_nodes FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view chatbot node options" 
ON public.chatbot_node_options FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage chatbot node options" 
ON public.chatbot_node_options FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS update_chatbot_flows_updated_at ON public.chatbot_flows;
DROP TRIGGER IF EXISTS update_chatbot_nodes_updated_at ON public.chatbot_nodes;

CREATE TRIGGER update_chatbot_flows_updated_at
BEFORE UPDATE ON public.chatbot_flows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_nodes_updated_at
BEFORE UPDATE ON public.chatbot_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();