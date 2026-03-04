-- ============================================================
-- Integração WhatsApp N8N / AvisaAPI → Módulo de Atendimentos
-- ============================================================
-- Adiciona tabela whatsapp_messages para armazenar mensagens
-- captadas pelo n8n (entrada via AvisaAPI e respostas do bot)
-- e vincula service_queue às conversas WhatsApp.
-- ============================================================

-- 1. Adicionar coluna whatsapp_conversation_id na service_queue
--    (safe: só adiciona se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'service_queue'
      AND column_name  = 'whatsapp_conversation_id'
  ) THEN
    ALTER TABLE public.service_queue
      ADD COLUMN whatsapp_conversation_id UUID
        REFERENCES public.whatsapp_conversations(id)
        ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_service_queue_whatsapp_conv
  ON public.service_queue(whatsapp_conversation_id)
  WHERE whatsapp_conversation_id IS NOT NULL;

-- 2. Criar tabela de mensagens WhatsApp (n8n / AvisaAPI)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id                       UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_conversation_id UUID        NOT NULL
    REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction                TEXT        NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),
  sender_type              TEXT        NOT NULL
    CHECK (sender_type IN ('customer', 'bot', 'agent')),
  content                  TEXT        NOT NULL,
  content_type             TEXT        NOT NULL DEFAULT 'text',
  status                   TEXT        NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'sent', 'delivered', 'read', 'failed', 'pending')),
  external_msg_id          TEXT        UNIQUE,
  n8n_flow_id              TEXT,
  raw_payload              JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conv_created
  ON public.whatsapp_messages(whatsapp_conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id
  ON public.whatsapp_messages(external_msg_id)
  WHERE external_msg_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction
  ON public.whatsapp_messages(whatsapp_conversation_id, direction);

-- 4. Row Level Security
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Service role: acesso total (Edge Functions usam service_role)
CREATE POLICY "service_role_all_whatsapp_messages"
  ON public.whatsapp_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados: somente leitura
CREATE POLICY "authenticated_select_whatsapp_messages"
  ON public.whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. UNIQUE constraint em whatsapp_conversations.phone_number
--    Necessário para o upsert ON CONFLICT (phone_number) no avisa-webhook
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_conversations_phone_number_key'
      AND conrelid = 'public.whatsapp_conversations'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_conversations
      ADD CONSTRAINT whatsapp_conversations_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;

-- 6. Habilitar Realtime (propagação em tempo real para o frontend)
ALTER TABLE public.whatsapp_messages
  REPLICA IDENTITY FULL;

ALTER TABLE public.whatsapp_conversations
  REPLICA IDENTITY FULL;
