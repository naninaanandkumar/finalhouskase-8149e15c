
-- 1. Profiles: Deny anonymous access explicitly
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);

-- 2. Invoices: Remove user INSERT policy (invoices should be system/admin generated only)
DROP POLICY IF EXISTS "Users can create their own invoices" ON public.invoices;

-- 3. Chat messages: Strengthen SELECT policy with explicit auth check
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.chat_messages;
CREATE POLICY "Conversation participants can view messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (chat_conversations.buyer_id = auth.uid() OR chat_conversations.admin_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- 4. RFQ requests: Require authentication for INSERT
DROP POLICY IF EXISTS "Users can submit RFQ requests" ON public.rfq_requests;
CREATE POLICY "Authenticated users can submit RFQ requests"
ON public.rfq_requests FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND email IS NOT NULL
  AND full_name IS NOT NULL
  AND product_name IS NOT NULL
  AND quantity > 0
);

-- 5. Orders: Restrict user UPDATE to only notes field via trigger
CREATE OR REPLACE FUNCTION public.restrict_order_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If not admin, only allow notes to change
  IF NOT is_admin(auth.uid()) THEN
    NEW.status := OLD.status;
    NEW.total := OLD.total;
    NEW.subtotal := OLD.subtotal;
    NEW.tax := OLD.tax;
    NEW.shipping := OLD.shipping;
    NEW.order_number := OLD.order_number;
    NEW.buyer_type := OLD.buyer_type;
    NEW.shipping_address := OLD.shipping_address;
    NEW.billing_address := OLD.billing_address;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS restrict_order_user_update_trigger ON public.orders;
CREATE TRIGGER restrict_order_user_update_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restrict_order_user_update();
