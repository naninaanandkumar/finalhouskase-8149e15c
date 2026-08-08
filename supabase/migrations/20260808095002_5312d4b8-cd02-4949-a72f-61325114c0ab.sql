-- 1. Corrected Review system permissions
REVOKE ALL ON FUNCTION public.get_public_product_reviews(uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO authenticated, anon;

-- 2. Ensure all other public SECURITY DEFINER functions have explicit revoked PUBLIC execute
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_public_coupons(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restrict_buyer_order_updates() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_product_review() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC;

-- 3. Double check and set search_path for all SECURITY DEFINER functions to prevent search_path injection attacks
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;
ALTER FUNCTION public.enforce_super_admin_role_changes() SET search_path = public;
ALTER FUNCTION public.log_audit_event() SET search_path = public;
ALTER FUNCTION public.bootstrap_first_admin() SET search_path = public;
ALTER FUNCTION public.validate_coupon(text, numeric) SET search_path = public;
ALTER FUNCTION public.get_auto_apply_coupon(numeric) SET search_path = public;
ALTER FUNCTION public.list_public_coupons(uuid) SET search_path = public;
ALTER FUNCTION public.get_product_review_stats(uuid) SET search_path = public;
ALTER FUNCTION public.get_public_product_reviews(uuid) SET search_path = public;
ALTER FUNCTION public.validate_product_review() SET search_path = public;
ALTER FUNCTION public.restrict_buyer_order_updates() SET search_path = public;
ALTER FUNCTION public.restrict_order_user_update() SET search_path = public;
ALTER FUNCTION public.signup_otp_get_password(text, text) SET search_path = public;
ALTER FUNCTION public.signup_otp_set_password(text, text, text) SET search_path = public;
ALTER FUNCTION public.mcp_check_rate_limit(uuid, text) SET search_path = public;
