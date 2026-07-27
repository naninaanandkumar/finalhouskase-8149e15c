-- Enable realtime for chat_messages so messages appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;