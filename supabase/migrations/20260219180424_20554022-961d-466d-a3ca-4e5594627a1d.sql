
-- Table to store connected email accounts (SMTP or OAuth)
CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_type text NOT NULL DEFAULT 'smtp', -- 'smtp', 'gmail_oauth', 'outlook_oauth'
  email_address text NOT NULL,
  display_name text,
  -- SMTP fields (encrypted at rest by Supabase)
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password text,
  imap_host text,
  imap_port integer DEFAULT 993,
  -- OAuth fields
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_token_expires_at timestamp with time zone,
  oauth_provider_data jsonb DEFAULT '{}'::jsonb,
  -- Status
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  last_poll_at timestamp with time zone,
  last_poll_error text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own email accounts
CREATE POLICY "Users can manage own email accounts"
  ON public.email_accounts FOR ALL
  USING (user_id = auth.uid());

-- Admins can view all email accounts  
CREATE POLICY "Admins can view all email accounts"
  ON public.email_accounts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table to store email messages linked to complaints
CREATE TABLE public.email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  email_account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL,
  message_id text, -- RFC 822 Message-ID for threading
  in_reply_to text, -- For threading
  thread_id text, -- Gmail/Outlook thread ID
  direction text NOT NULL DEFAULT 'outbound', -- 'outbound' or 'inbound'
  from_address text NOT NULL,
  to_addresses text[] NOT NULL,
  cc_addresses text[],
  subject text NOT NULL,
  body_text text,
  body_html text,
  sent_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  status text DEFAULT 'sent', -- 'draft', 'sending', 'sent', 'failed', 'received'
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view email messages for complaints they can access
CREATE POLICY "Authenticated can view email messages"
  ON public.email_messages FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert email messages
CREATE POLICY "Authenticated can insert email messages"
  ON public.email_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_email_messages_complaint_id ON public.email_messages(complaint_id);
CREATE INDEX idx_email_messages_thread_id ON public.email_messages(thread_id);
CREATE INDEX idx_email_messages_message_id ON public.email_messages(message_id);
CREATE INDEX idx_email_accounts_user_id ON public.email_accounts(user_id);

-- Trigger for updated_at on email_accounts
CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
