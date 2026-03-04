-- Conceder permissões para as tabelas do chatbot
GRANT ALL ON public.chatbot_flows TO anon, authenticated, service_role;
GRANT ALL ON public.chatbot_nodes TO anon, authenticated, service_role;
GRANT ALL ON public.chatbot_node_options TO anon, authenticated, service_role;

-- Forçar reload do schema cache novamente
NOTIFY pgrst, 'reload schema';