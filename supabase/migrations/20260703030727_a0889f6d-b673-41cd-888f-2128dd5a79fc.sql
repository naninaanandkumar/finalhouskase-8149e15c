-- Ensure previously removed unsafe admin bootstrap paths remain absent
DROP TRIGGER IF EXISTS auto_promote_founder_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_promote_founder() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_initial_admin() CASCADE;

-- Add product-level GST controls
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gst_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS gst_pricing_mode text NOT NULL DEFAULT 'exclusive' CHECK (gst_pricing_mode IN ('inclusive', 'exclusive'));

-- Allow explicit zero GST to remain zero on legacy rows; tax_class controls exempt items
UPDATE public.products
SET gst_enabled = false
WHERE COALESCE(tax_class, '') IN ('zero', 'exempt') OR COALESCE(gst_percentage, 0) = 0;

-- Keep buyer order creation limited to the trusted backend path.
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert their order items" ON public.order_items;

-- Tighten RFQ item buyer inserts again so fake prices cannot be submitted.
DROP POLICY IF EXISTS "Users can insert RFQ items" ON public.rfq_items;
CREATE POLICY "Users can insert RFQ items"
ON public.rfq_items
FOR INSERT
TO authenticated
WITH CHECK (
  rfq_id IS NOT NULL
  AND product_name IS NOT NULL
  AND quantity > 0
  AND quoted_price IS NULL
  AND target_price IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.rfq_requests
    WHERE rfq_requests.id = rfq_items.rfq_id
      AND rfq_requests.user_id = auth.uid()
  )
);

-- Keep grants for altered products table explicit for Data API access
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;