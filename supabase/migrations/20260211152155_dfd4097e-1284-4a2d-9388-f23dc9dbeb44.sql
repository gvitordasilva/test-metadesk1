
-- Fix overly permissive INSERT policy on service_queue
DROP POLICY IF EXISTS "Authenticated users can insert to queue" ON public.service_queue;
CREATE POLICY "Authenticated users can insert to queue" ON public.service_queue FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Fix overly permissive INSERT policy on complaint_audit_log  
DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.complaint_audit_log;
CREATE POLICY "Authenticated can insert audit log" ON public.complaint_audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
