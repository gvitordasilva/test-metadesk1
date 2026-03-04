
-- Add channel column to complaints to track origin (web form, voice agent, phone call)
ALTER TABLE public.complaints
ADD COLUMN channel text DEFAULT 'web';

-- Update existing voice-created complaints (those without explicit channel) 
-- No action needed - defaults to 'web' which is correct for existing data
