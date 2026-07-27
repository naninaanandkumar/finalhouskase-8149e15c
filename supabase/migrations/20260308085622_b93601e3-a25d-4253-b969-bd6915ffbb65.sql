
-- 1. Fix chat_messages UPDATE policy: restrict to marking own received messages as read only
DROP POLICY IF EXISTS "Users can mark their messages as read" ON public.chat_messages;
CREATE POLICY "Users can mark messages as read"
ON public.chat_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (chat_conversations.buyer_id = auth.uid() OR chat_conversations.admin_id = auth.uid() OR is_admin(auth.uid()))
  )
  AND sender_id != auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (chat_conversations.buyer_id = auth.uid() OR chat_conversations.admin_id = auth.uid() OR is_admin(auth.uid()))
  )
  AND sender_id != auth.uid()
);

-- 2. Fix orders UPDATE policy: remove user self-update, rely on restrict_order_user_update trigger + admin policy
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update own order notes"
ON public.orders FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Fix invoices INSERT policy: require order ownership check
DROP POLICY IF EXISTS "Users can create their own invoices" ON public.invoices;
CREATE POLICY "Users can create invoices for own orders"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = invoices.order_id
    AND orders.user_id = auth.uid()
  )
);

-- 4. Fix rfq_requests INSERT policy: enforce user_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated users can submit RFQ requests" ON public.rfq_requests;
CREATE POLICY "Authenticated users can submit RFQ requests"
ON public.rfq_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND email IS NOT NULL
  AND full_name IS NOT NULL
  AND product_name IS NOT NULL
  AND quantity > 0
);
