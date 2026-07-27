
-- Fix 1: RFQ Items INSERT - add ownership check
DROP POLICY IF EXISTS "Users can insert RFQ items" ON rfq_items;
CREATE POLICY "Users can insert RFQ items"
ON rfq_items
FOR INSERT
TO public
WITH CHECK (
  rfq_id IS NOT NULL
  AND product_name IS NOT NULL
  AND quantity > 0
  AND EXISTS (
    SELECT 1 FROM rfq_requests
    WHERE rfq_requests.id = rfq_items.rfq_id
    AND rfq_requests.user_id = auth.uid()
  )
);

-- Fix 2: RFQ Cart Items - restrict guest cart access to own session only
DROP POLICY IF EXISTS "Users can manage their RFQ cart" ON rfq_cart_items;
CREATE POLICY "Users can manage their RFQ cart"
ON rfq_cart_items
FOR ALL
TO public
USING (auth.uid() = user_id);

-- Separate policy for guest/session carts (no cross-user leakage)
DROP POLICY IF EXISTS "Users can insert RFQ cart items" ON rfq_cart_items;
CREATE POLICY "Guest users can insert RFQ cart items"
ON rfq_cart_items
FOR INSERT
TO public
WITH CHECK (
  product_id IS NOT NULL
  AND quantity > 0
  AND (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id IS NOT NULL)
  )
);
