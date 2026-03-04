
-- Tabela de auditoria para rastrear todas as alterações em solicitações
CREATE TABLE public.complaint_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL, -- 'reclassified_type', 'reclassified_category', 'status_changed', 'assigned', 'workflow_changed', 'notes_updated'
  field_changed TEXT NOT NULL, -- nome do campo alterado
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_complaint_audit_complaint_id ON public.complaint_audit_log(complaint_id);
CREATE INDEX idx_complaint_audit_created_at ON public.complaint_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.complaint_audit_log ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem inserir logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.complaint_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: usuários autenticados podem ver logs
CREATE POLICY "Authenticated users can view audit logs"
ON public.complaint_audit_log FOR SELECT
TO authenticated
USING (true);

-- Adicionar coluna workflow_id na tabela complaints se não existir
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL;
