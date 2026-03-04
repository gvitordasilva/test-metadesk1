-- Drop the restrictive INSERT policy on service_messages
DROP POLICY IF EXISTS "Usuarios podem criar mensagens em suas sessoes" ON public.service_messages;

-- Create a more permissive INSERT policy that allows:
-- 1. Authenticated users (attendants) to insert into their active sessions
-- 2. Any user (including anon from chatbot) to insert bot/customer messages
CREATE POLICY "Allow inserting service messages"
ON public.service_messages
FOR INSERT
WITH CHECK (
  -- Authenticated attendants can insert into their sessions
  (EXISTS (
    SELECT 1 FROM service_sessions
    WHERE service_sessions.id = service_messages.session_id
    AND service_sessions.attendant_id = auth.uid()
    AND service_sessions.status = 'active'
  ))
  OR
  -- Allow bot and customer messages from anyone (for chatbot transfers)
  (sender_type IN ('bot', 'customer'))
);

-- Also update SELECT policy so attendants can see messages from conversations they take over
DROP POLICY IF EXISTS "Usuarios podem ver mensagens de suas sessoes" ON public.service_messages;

CREATE POLICY "Users can view service messages"
ON public.service_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM service_sessions
    WHERE service_sessions.id = service_messages.session_id
    AND (service_sessions.attendant_id = auth.uid() OR check_admin_access())
  )
  OR
  -- Allow reading messages by session_id if the user is authenticated
  (auth.role() = 'authenticated')
);