
-- 1. Fix self-approved reviews: force is_approved = false on user INSERT
DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON public.product_reviews;
CREATE POLICY "Authenticated users can submit reviews"
ON public.product_reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND is_approved = false
);

-- 2. Fix arbitrary order status: force status = 'pending' on INSERT
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

-- 3. Fix admin-controlled RFQ fields: enforce defaults on INSERT
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
  AND status = 'pending'
  AND admin_notes IS NULL
  AND quoted_price IS NULL
  AND unit_price IS NULL
  AND quotation_pdf_url IS NULL
  AND quoted_at IS NULL
);

-- 4. Fix public coupon exposure: only show coupons meant for display
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT
USING (is_active = true AND (show_on_product = true OR auto_apply = true));

-- 5. Fix public site settings: restrict to known safe keys
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
USING (key IN ('store_name', 'store_logo', 'store_tagline', 'store_description', 'store_phone', 'store_email', 'store_address', 'currency', 'theme', 'social_links', 'footer_text', 'whatsapp_number', 'support_email', 'seo_settings', 'homepage_layout', 'store_favicon'));
