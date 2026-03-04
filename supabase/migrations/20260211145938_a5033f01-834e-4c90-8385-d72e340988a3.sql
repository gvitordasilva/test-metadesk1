-- Add last_assigned_at for round-robin tracking
ALTER TABLE public.attendant_profiles 
ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz DEFAULT '2000-01-01';

-- Create index for efficient online attendant lookup
CREATE INDEX IF NOT EXISTS idx_attendant_profiles_status 
ON public.attendant_profiles (status, last_assigned_at);