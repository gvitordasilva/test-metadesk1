
-- Tabela de respostas NPS
CREATE TABLE public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.service_sessions(id) ON DELETE SET NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 10),
  comment text,
  channel text DEFAULT 'web',
  respondent_name text,
  respondent_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Inserção pública (usuários anônimos podem responder)
CREATE POLICY "Anyone can insert NPS responses"
ON public.nps_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Leitura apenas para autenticados
CREATE POLICY "Authenticated users can read NPS"
ON public.nps_responses
FOR SELECT
TO authenticated
USING (true);
