
-- 1) product_reviews: hide user_id from public readers
REVOKE SELECT (user_id) ON public.product_reviews FROM anon, authenticated;

-- 2) rfq_cart_items: drop guest insert policy (require auth)
DROP POLICY IF EXISTS "Guest users can insert RFQ cart items" ON public.rfq_cart_items;

-- 3) Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_buyer_type(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM anon, authenticated, public;

-- 4) Storage: remove duplicate broad SELECT on product-images (public URLs still work via /object/public)
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

-- 5) Realtime: restrict channel subscriptions to chat participants
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can receive realtime" ON realtime.messages;
CREATE POLICY "Chat participants can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE (c.buyer_id = auth.uid() OR c.admin_id = auth.uid() OR public.is_admin(auth.uid()))
      AND realtime.topic() IN (
        'chat_conversations:id=eq.' || c.id::text,
        'chat_messages:conversation_id=eq.' || c.id::text,
        'public:chat_conversations',
        'public:chat_messages'
      )
  )
);
