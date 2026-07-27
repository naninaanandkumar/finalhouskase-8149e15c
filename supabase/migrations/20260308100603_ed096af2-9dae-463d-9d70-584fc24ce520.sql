
-- 1. Fix orders INSERT: validate buyer_type against user_roles
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'::order_status
  AND buyer_type = COALESCE(get_user_buyer_type(auth.uid()), 'retail'::app_role)
);

-- 2. Fix invoices INSERT: remove user INSERT policy (invoices created server-side only)
DROP POLICY IF EXISTS "Users can create invoices for own orders" ON public.invoices;

-- 3. Fix admin_notes exposure: create a secure view for user-facing RFQ queries
CREATE OR REPLACE VIEW public.rfq_requests_user AS
SELECT
  id, rfq_number, user_id, full_name, company_name, email, phone,
  gst_number, product_name, product_id, quantity, target_price,
  category, message, attachments, buyer_type, status,
  quoted_price, unit_price, total_amount, bulk_discount,
  gst_amount, shipping_cost, payment_terms, delivery_timeline,
  validity_days, quoted_at, quotation_pdf_url,
  created_at, updated_at
FROM public.rfq_requests
WHERE user_id = auth.uid();
