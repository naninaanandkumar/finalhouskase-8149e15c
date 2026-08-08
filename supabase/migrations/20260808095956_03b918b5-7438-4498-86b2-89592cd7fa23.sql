-- Revoke public execution for all sensitive functions in public schema
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_product_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_buyer_order_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) FROM PUBLIC, anon, authenticated;

-- Ensure strict search paths for sensitive SECURITY DEFINER functions
ALTER FUNCTION public.log_audit_event() SET search_path = public;
ALTER FUNCTION public.bootstrap_first_admin() SET search_path = public;
ALTER FUNCTION public.validate_product_review() SET search_path = public;
ALTER FUNCTION public.get_auto_apply_coupon(numeric) SET search_path = public;
ALTER FUNCTION public.enforce_super_admin_role_changes() SET search_path = public;
ALTER FUNCTION public.mcp_check_rate_limit(uuid, text) SET search_path = public;
ALTER FUNCTION public.list_public_coupons(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_product_review_stats(uuid) SET search_path = public;
ALTER FUNCTION public.restrict_buyer_order_updates() SET search_path = public;
ALTER FUNCTION public.signup_otp_set_password(text, text, text) SET search_path = public;
ALTER FUNCTION public.validate_coupon(text, numeric) SET search_path = public;
ALTER FUNCTION public.restrict_order_user_update() SET search_path = public;
ALTER FUNCTION public.signup_otp_get_password(text, text) SET search_path = public;
ALTER FUNCTION public.get_public_product_reviews(uuid) SET search_path = public;

-- Also harden private schema functions just in case
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;
-- Selective grant for functions needed by authenticated users
GRANT EXECUTE ON FUNCTION private.is_admin_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated;

-- Set search paths for private functions
ALTER FUNCTION private.has_role(uuid, app_role) SET search_path = public, private;
ALTER FUNCTION private.is_admin_v2(uuid) SET search_path = public, private;
ALTER FUNCTION private.list_users_with_roles() SET search_path = public, private;
ALTER FUNCTION private.is_admin(uuid) SET search_path = public, private;
ALTER FUNCTION private.mark_message_read(uuid) SET search_path = public, private;
ALTER FUNCTION private.get_user_buyer_type(uuid) SET search_path = public, private;
ALTER FUNCTION private.get_auto_apply_coupon(numeric) SET search_path = public, private;
ALTER FUNCTION private.validate_coupon(text, numeric) SET search_path = public, private;
ALTER FUNCTION private.create_product_image_signed_url(text, integer) SET search_path = public, private;
ALTER FUNCTION private.create_product_image_signed_urls(text[], integer) SET search_path = public, private;
ALTER FUNCTION private.list_public_coupons(uuid) SET search_path = public, private;
