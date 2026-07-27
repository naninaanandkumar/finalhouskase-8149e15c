
-- Fix: Change view to SECURITY INVOKER (default in modern PG, but explicit is better)
DROP VIEW IF EXISTS public.rfq_requests_user;
CREATE VIEW public.rfq_requests_user
WITH (security_invoker = true)
AS
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
