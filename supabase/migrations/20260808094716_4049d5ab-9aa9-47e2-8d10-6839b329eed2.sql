-- Revoke execute permissions on sensitive SECURITY DEFINER functions in public schema
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;

-- Ensure internal trigger functions are still executable by service_role (implicitly allowed usually, but good to be explicit for triggers)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_super_admin_role_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO service_role;

-- Specifically allow authenticated users to call is_admin if needed for client-side logic checks via RPC
-- However, standard practice is to use these in RLS. If client needs it:
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- coupon validation usually needs to be callable by authenticated/anon users for checkout
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) TO authenticated, anon;

-- review stats and reviews are public
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO authenticated, anon;

-- restrict_* functions are for RLS, revoke public execute
REVOKE EXECUTE ON FUNCTION public.restrict_buyer_order_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_product_review() FROM PUBLIC, anon, authenticated;
