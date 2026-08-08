-- Hardening SECURITY DEFINER functions and refining access
-- Revoke all access first
REVOKE EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_public_coupons(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) FROM PUBLIC, anon, authenticated;

-- Grant to authenticated
GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_coupons(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO authenticated;

-- Grant to anon for storefront
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_coupons(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon;

-- Tighten RLS for product_reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews
FOR SELECT TO anon, authenticated
USING (is_approved = true);

-- Tighten user_roles SELECT policy to authenticated
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.is_admin(auth.uid()));
