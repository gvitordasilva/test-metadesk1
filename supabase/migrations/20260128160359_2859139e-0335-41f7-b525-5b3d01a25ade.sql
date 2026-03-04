-- =============================================
-- SISTEMA AVANÇADO DE ATENDIMENTO - MIGRAÇÃO
-- =============================================

-- 1. Tabela de Mensagens Pré-definidas (Quick Messages)
CREATE TABLE public.quick_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  shortcut TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para quick_messages
ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver mensagens ativas"
  ON public.quick_messages FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins podem gerenciar mensagens"
  ON public.quick_messages FOR ALL
  USING (public.check_admin_access());

-- Trigger para updated_at
CREATE TRIGGER update_quick_messages_updated_at
  BEFORE UPDATE ON public.quick_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de Sessões de Atendimento
CREATE TABLE public.service_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  conversation_id TEXT,
  attendant_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  ai_summary TEXT,
  ai_sentiment TEXT,
  forwarded_to_step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
  forward_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'forwarded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para service_sessions
ALTER TABLE public.service_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver suas sessões"
  ON public.service_sessions FOR SELECT
  USING (auth.uid() = attendant_id OR public.check_admin_access());

CREATE POLICY "Usuários autenticados podem criar sessões"
  ON public.service_sessions FOR INSERT
  WITH CHECK (auth.uid() = attendant_id);

CREATE POLICY "Usuários autenticados podem atualizar suas sessões"
  ON public.service_sessions FOR UPDATE
  USING (auth.uid() = attendant_id OR public.check_admin_access());

-- Trigger para updated_at
CREATE TRIGGER update_service_sessions_updated_at
  BEFORE UPDATE ON public.service_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabela de Mensagens da Sessão
CREATE TABLE public.service_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.service_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'agent', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para service_messages
ALTER TABLE public.service_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver mensagens de suas sessões"
  ON public.service_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_sessions 
      WHERE id = session_id AND (attendant_id = auth.uid() OR public.check_admin_access())
    )
  );

CREATE POLICY "Usuários podem criar mensagens em suas sessões"
  ON public.service_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_sessions 
      WHERE id = session_id AND attendant_id = auth.uid() AND status = 'active'
    )
  );

-- 4. Adicionar campos na tabela complaints
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_sentiment TEXT,
  ADD COLUMN IF NOT EXISTS current_workflow_step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL;

-- 5. Índices para performance
CREATE INDEX idx_service_sessions_attendant ON public.service_sessions(attendant_id);
CREATE INDEX idx_service_sessions_status ON public.service_sessions(status);
CREATE INDEX idx_service_sessions_complaint ON public.service_sessions(complaint_id);
CREATE INDEX idx_service_messages_session ON public.service_messages(session_id);
CREATE INDEX idx_quick_messages_category ON public.quick_messages(category);
CREATE INDEX idx_complaints_waiting_since ON public.complaints(waiting_since);

-- 6. Inserir mensagens pré-definidas iniciais
INSERT INTO public.quick_messages (title, content, category, shortcut) VALUES
  ('Saudação Inicial', 'Olá! Meu nome é [NOME] e estou aqui para ajudá-lo(a). Como posso auxiliar hoje?', 'saudacao', '/oi'),
  ('Aguardando Informações', 'Para dar continuidade ao seu atendimento, preciso de algumas informações adicionais. Poderia me fornecer?', 'procedimento', '/info'),
  ('Verificando Sistema', 'Um momento, por favor. Estou verificando as informações no sistema.', 'procedimento', '/aguarde'),
  ('Protocolo Gerado', 'Seu protocolo de atendimento é: [PROTOCOLO]. Guarde este número para futuras consultas.', 'procedimento', '/protocolo'),
  ('Encaminhamento', 'Vou encaminhar seu caso para o setor responsável. Você receberá um retorno em até [PRAZO].', 'procedimento', '/encaminhar'),
  ('Agradecimento Final', 'Agradeço pelo contato! Caso tenha outras dúvidas, estamos à disposição. Tenha um ótimo dia!', 'encerramento', '/tchau'),
  ('Pesquisa de Satisfação', 'Antes de finalizar, gostaria de saber: como você avalia o atendimento prestado hoje?', 'encerramento', '/pesquisa');