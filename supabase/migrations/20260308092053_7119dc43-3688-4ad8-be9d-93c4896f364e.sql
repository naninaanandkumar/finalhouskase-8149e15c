
-- Fix chat messages: create a function that only allows toggling is_read
CREATE OR REPLACE FUNCTION public.mark_message_read(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_messages
  SET is_read = true
  WHERE id = _message_id
    AND sender_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (chat_conversations.buyer_id = auth.uid() OR chat_conversations.admin_id = auth.uid() OR is_admin(auth.uid()))
    );
END;
$$;

-- Remove the broad UPDATE policy on chat_messages
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.chat_messages;
