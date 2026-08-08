-- Hardening SECURITY DEFINER functions based on linter findings
-- Revoking public/auth access and specifically granting only to authenticated for required functions

-- 1. General revocation from all roles (public, anon, authenticated)
REVOKE EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_public_coupons(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) FROM PUBLIC, anon, authenticated;

-- 2. Granting specific access back to 'authenticated' where needed for app functionality
GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_coupons(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO authenticated;

-- 3. Granting access to 'anon' ONLY for functions that are strictly public storefront requirements
-- These are stable data retrieval functions for products and public coupons
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_coupons(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon;
