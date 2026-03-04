-- Tabela central para fila de atendimento unificada
CREATE TABLE public.service_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'voice', 'whatsapp', 'email', 'chat')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'forwarded')),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_avatar TEXT,
  subject TEXT,
  last_message TEXT,
  unread_count INTEGER NOT NULL DEFAULT 1,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  voice_session_id TEXT,
  assigned_to UUID,
  waiting_since TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.service_queue ENABLE ROW LEVEL SECURITY;

-- Index para ordenação por tempo de espera
CREATE INDEX idx_service_queue_waiting ON public.service_queue(waiting_since);
CREATE INDEX idx_service_queue_status ON public.service_queue(status);
CREATE INDEX idx_service_queue_channel ON public.service_queue(channel);
CREATE INDEX idx_service_queue_complaint ON public.service_queue(complaint_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_queue;

-- Policies: Public insert (para formulário público)
CREATE POLICY "Anyone can insert into service_queue"
  ON public.service_queue FOR INSERT
  WITH CHECK (true);

-- Policies: Authenticated users can view
CREATE POLICY "Authenticated users can view service_queue"
  ON public.service_queue FOR SELECT
  TO authenticated
  USING (true);

-- Policies: Authenticated users can update
CREATE POLICY "Authenticated users can update service_queue"
  ON public.service_queue FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_service_queue_updated_at
  BEFORE UPDATE ON public.service_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();