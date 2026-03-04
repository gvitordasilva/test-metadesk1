
-- Drop old constraint
ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_status_check;

-- Add new constraint with Portuguese slugs matching the code
ALTER TABLE public.complaints ADD CONSTRAINT complaints_status_check 
  CHECK (status = ANY (ARRAY['novo', 'em_analise', 'resolvido', 'fechado', 'pending', 'in_progress', 'resolved', 'closed']));

-- Update existing records from English to Portuguese
UPDATE public.complaints SET status = 'novo' WHERE status = 'pending';
UPDATE public.complaints SET status = 'em_analise' WHERE status = 'in_progress';
UPDATE public.complaints SET status = 'resolvido' WHERE status = 'resolved';
UPDATE public.complaints SET status = 'fechado' WHERE status = 'closed';

-- Update default
ALTER TABLE public.complaints ALTER COLUMN status SET DEFAULT 'novo';
