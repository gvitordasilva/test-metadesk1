
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_viewed_by UUID;

ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE public.complaints ADD CONSTRAINT complaints_status_check 
  CHECK (status = ANY (ARRAY[
    'novo', 'visualizado', 'em_analise', 'resolvido', 'fechado',
    'pending', 'in_progress', 'resolved', 'closed'
  ]));

-- Allow attendants to update any complaint with status 'novo' (for auto-marking as viewed)
CREATE POLICY "Attendants can mark novo complaints as viewed"
  ON public.complaints FOR UPDATE
  USING (has_role(auth.uid(), 'atendente'::app_role) AND status = 'novo')
  WITH CHECK (has_role(auth.uid(), 'atendente'::app_role));
