
-- Add AI triage column to store pre-analysis data (sentiment + scenario)
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS ai_triage JSONB DEFAULT NULL;

COMMENT ON COLUMN public.complaints.ai_triage IS 'AI pre-analysis: sentiment, scenario summary, urgency level';
