-- Token AvisaAPI (e outras integrações) configurável pelo admin na UI.
-- Edge Functions leem com service role quando AVISA_API_KEY/AVISA_API_TOKEN não estão no env.

CREATE TABLE IF NOT EXISTS public.integration_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode ler/escrever (atendente não vê token)
CREATE POLICY "integration_settings_admin_all"
  ON public.integration_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.integration_settings IS 'Chaves de integração; ex.: avisa_api_token — usado por avisa-send/avisa-webhook/avisa-instance quando env não definido.';
