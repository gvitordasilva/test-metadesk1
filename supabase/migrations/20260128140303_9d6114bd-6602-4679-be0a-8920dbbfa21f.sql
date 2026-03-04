-- Create workflow_responsibles table
CREATE TABLE public.workflow_responsibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflows table
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_steps table
CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  responsible_id UUID REFERENCES public.workflow_responsibles(id) ON DELETE SET NULL,
  sla_days INTEGER DEFAULT 1,
  step_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workflow_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_responsibles
CREATE POLICY "Admins can manage workflow_responsibles"
ON public.workflow_responsibles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Attendants can view workflow_responsibles"
ON public.workflow_responsibles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'atendente'));

-- RLS Policies for workflows
CREATE POLICY "Admins can manage workflows"
ON public.workflows FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Attendants can view workflows"
ON public.workflows FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'atendente'));

-- RLS Policies for workflow_steps
CREATE POLICY "Admins can manage workflow_steps"
ON public.workflow_steps FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Attendants can view workflow_steps"
ON public.workflow_steps FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'atendente'));

-- Create indexes for performance
CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_responsible_id ON public.workflow_steps(responsible_id);
CREATE INDEX idx_workflows_type ON public.workflows(workflow_type);
CREATE INDEX idx_workflow_responsibles_active ON public.workflow_responsibles(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_workflow_responsibles_updated_at
BEFORE UPDATE ON public.workflow_responsibles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at
BEFORE UPDATE ON public.workflow_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();