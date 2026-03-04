
-- Tabela de configurações de SLA
CREATE TABLE public.sla_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL UNIQUE,
  metric_label text NOT NULL,
  target_value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'minutes',
  warning_threshold numeric,
  critical_threshold numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar SLAs
CREATE POLICY "Admins can manage SLA settings"
ON public.sla_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Todos autenticados podem ler SLAs
CREATE POLICY "Authenticated users can read SLA settings"
ON public.sla_settings
FOR SELECT
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_sla_settings_updated_at
BEFORE UPDATE ON public.sla_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir SLAs padrão
INSERT INTO public.sla_settings (metric_key, metric_label, target_value, unit, warning_threshold, critical_threshold) VALUES
  ('tma', 'Tempo Médio de Atendimento (TMA)', 10, 'minutes', 8, 12),
  ('tme', 'Tempo Médio de Espera (TME)', 3, 'minutes', 2, 5),
  ('frt', 'Tempo de Primeira Resposta (FRT)', 1, 'minutes', 0.5, 2),
  ('fcr', 'Resolução no Primeiro Contato (FCR)', 80, 'percent', 85, 70),
  ('csat', 'Satisfação do Cliente (CSAT)', 85, 'percent', 90, 75),
  ('nps', 'Net Promoter Score (NPS)', 50, 'score', 60, 30),
  ('abandono', 'Taxa de Abandono', 5, 'percent', 3, 10),
  ('countdown_seconds', 'Tempo de Contagem Regressiva', 10, 'seconds', null, null);
