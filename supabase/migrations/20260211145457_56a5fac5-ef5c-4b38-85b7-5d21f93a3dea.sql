-- Add notification toggle settings to sla_settings
INSERT INTO public.sla_settings (metric_key, metric_label, target_value, unit, is_active)
VALUES 
  ('notif_sms_enabled', 'Envio automático de SMS ao registrar', 1, 'boolean', true),
  ('notif_email_enabled', 'Envio automático de E-mail ao registrar', 1, 'boolean', true)
ON CONFLICT DO NOTHING;