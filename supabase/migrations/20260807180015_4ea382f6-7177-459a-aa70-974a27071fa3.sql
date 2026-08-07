-- Revoke public and authenticated execution from security definer functions in public schema
-- This addresses the SECURITY DEFINER function issues flagged by the linter.

REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_public_coupons(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_product_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_buyer_order_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) FROM PUBLIC, anon, authenticated;

-- Grant EXECUTE back to authenticated for specific functions that need to be callable by the app
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Ensure service_role can still execute everything
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
