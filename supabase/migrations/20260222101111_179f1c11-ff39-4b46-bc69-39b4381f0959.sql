-- Remove overly permissive public SELECT policies on orders and order_items
-- Order tracking now goes through the secure track-order edge function

-- Drop the "Anyone can track orders by order number" policy  
DROP POLICY IF EXISTS "Anyone can track orders by order number" ON public.orders;

-- Drop the "Anyone can view order items for tracking" policy
DROP POLICY IF EXISTS "Anyone can view order items for tracking" ON public.order_items;
