-- Criar tabela de reclamações e denúncias
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_number TEXT NOT NULL UNIQUE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  reporter_name TEXT,
  reporter_email TEXT,
  reporter_phone TEXT,
  type TEXT NOT NULL CHECK (type IN ('reclamacao', 'denuncia', 'sugestao')),
  category TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  location TEXT,
  description TEXT NOT NULL,
  involved_parties TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_analise', 'resolvido', 'fechado')),
  internal_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_complaints_protocol ON public.complaints(protocol_number);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_type ON public.complaints(type);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer pessoa pode criar (página pública)
CREATE POLICY "Anyone can create complaints"
ON public.complaints
FOR INSERT
WITH CHECK (true);

-- Política: Apenas admins podem visualizar
CREATE POLICY "Admins can view all complaints"
ON public.complaints
FOR SELECT
USING (public.check_admin_access());

-- Política: Apenas admins podem atualizar
CREATE POLICY "Admins can update complaints"
ON public.complaints
FOR UPDATE
USING (public.check_admin_access());

-- Política: Apenas admins podem deletar
CREATE POLICY "Admins can delete complaints"
ON public.complaints
FOR DELETE
USING (public.check_admin_access());

-- Função para gerar número de protocolo sequencial
CREATE OR REPLACE FUNCTION public.generate_complaint_protocol()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  year_suffix TEXT;
BEGIN
  -- Lock para evitar race conditions
  PERFORM pg_advisory_xact_lock(987654);
  
  year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(protocol_number FROM '^REC-\d{4}-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.complaints
  WHERE protocol_number ~ ('^REC-' || year_suffix || '-\d+$');
  
  RETURN 'REC-' || year_suffix || '-' || LPAD(next_number::TEXT, 6, '0');
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para anexos de reclamações
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-attachments', 'complaint-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Qualquer pessoa pode fazer upload (necessário para página pública)
CREATE POLICY "Anyone can upload complaint attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'complaint-attachments');

-- Política: Qualquer pessoa pode visualizar anexos
CREATE POLICY "Anyone can view complaint attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'complaint-attachments');

-- Política: Apenas admins podem deletar anexos
CREATE POLICY "Admins can delete complaint attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'complaint-attachments' AND public.check_admin_access());