-- Allow anyone to view orders by order_number (for tracking)
CREATE POLICY "Anyone can track orders by order number"
ON public.orders
FOR SELECT
USING (true);

-- Drop the restrictive user-only policy since we now allow public tracking
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Allow order_items to be read for tracking
CREATE POLICY "Anyone can view order items for tracking"
ON public.order_items
FOR SELECT
USING (true);
