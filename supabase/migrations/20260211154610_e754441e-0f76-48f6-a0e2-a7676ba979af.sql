
-- Fix login loop: ensure the attendant user has an assigned role
INSERT INTO public.user_roles (user_id, role)
VALUES ('081aaa4b-386e-426a-8383-cd5334eef380', 'atendente'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;
