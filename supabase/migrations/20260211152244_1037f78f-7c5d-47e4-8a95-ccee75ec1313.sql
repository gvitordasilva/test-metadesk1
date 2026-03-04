ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage admin_users" ON public.admin_users FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own admin record" ON public.admin_users FOR SELECT USING (user_id = auth.uid());
