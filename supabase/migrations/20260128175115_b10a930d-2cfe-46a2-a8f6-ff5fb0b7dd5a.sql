-- Força o PostgREST a recarregar o schema cache
NOTIFY pgrst, 'reload schema';

-- Garantir que as tabelas estão expostas corretamente com comentários
COMMENT ON TABLE public.chatbot_flows IS 'Fluxos de chatbot para atendimento automatizado';
COMMENT ON TABLE public.chatbot_nodes IS 'Nós da árvore de decisão do chatbot';
COMMENT ON TABLE public.chatbot_node_options IS 'Opções de menu para navegação no chatbot';