-- Hardening linter findings: revoking execute on SECURITY DEFINER functions from authenticated users where not explicitly required by frontend.
-- The linter flagged 6 functions. I will revoke execute from PUBLIC/authenticated for functions that should be internal or service-only.

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) FROM PUBLIC, authenticated, anon;

-- Re-granting only to authenticated role for functions that the app UI calls directly.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO authenticated, anon;

-- Ensuring service_role always has access
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO service_role;
