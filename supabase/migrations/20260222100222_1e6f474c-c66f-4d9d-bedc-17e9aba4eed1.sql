
-- Fix overly permissive RFQ INSERT policies (WITH CHECK true)

-- 1. Drop the overly permissive "Anyone can submit RFQ requests" policy
DROP POLICY IF EXISTS "Anyone can submit RFQ requests" ON public.rfq_requests;

-- 2. Drop the overly permissive "Anyone can insert RFQ items" policy
DROP POLICY IF EXISTS "Anyone can insert RFQ items" ON public.rfq_items;

-- 3. Drop the overly permissive "Anyone can insert RFQ cart items" policy
DROP POLICY IF EXISTS "Anyone can insert RFQ cart items" ON public.rfq_cart_items;

-- 4. Ensure the validated RFQ request insert policy exists
-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can submit RFQ" ON public.rfq_requests;

CREATE POLICY "Users can submit RFQ requests"
ON public.rfq_requests
FOR INSERT
WITH CHECK (
  (email IS NOT NULL) AND 
  (full_name IS NOT NULL) AND 
  (product_name IS NOT NULL) AND 
  (quantity > 0)
);

-- 5. Create validated RFQ items insert policy
CREATE POLICY "Users can insert RFQ items"
ON public.rfq_items
FOR INSERT
WITH CHECK (
  (rfq_id IS NOT NULL) AND 
  (product_name IS NOT NULL) AND 
  (quantity > 0)
);

-- 6. Create validated RFQ cart items insert policy  
CREATE POLICY "Users can insert RFQ cart items"
ON public.rfq_cart_items
FOR INSERT
WITH CHECK (
  (product_id IS NOT NULL) AND 
  (quantity > 0)
);
