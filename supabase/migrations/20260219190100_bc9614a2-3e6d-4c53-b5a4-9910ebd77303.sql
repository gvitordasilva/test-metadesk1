
-- Tabela para armazenar avaliações NPS dos atendimentos
CREATE TABLE public.nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  comment TEXT,
  complaint_id UUID REFERENCES public.complaints(id),
  session_id UUID REFERENCES public.service_sessions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a rating (public form)
CREATE POLICY "Anyone can insert nps responses"
  ON public.nps_responses
  FOR INSERT
  WITH CHECK (true);

-- Authenticated users can view ratings
CREATE POLICY "Authenticated can view nps responses"
  ON public.nps_responses
  FOR SELECT
  USING (auth.role() = 'authenticated');
