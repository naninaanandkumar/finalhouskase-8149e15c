-- Hardening the remaining SECURITY DEFINER functions flagged by the linter.
-- We revoke EXECUTE from anon for functions that should only be accessible by authenticated users,
-- and revoke from authenticated for functions that should be private/service_role only.

DO $$
BEGIN
    -- 1. Functions that should NOT be accessible by 'anon' (unauthenticated users)
    -- These are currently 'anon_can_execute:true' in our check
    REVOKE EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.list_public_coupons(uuid) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(uuid) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) FROM anon;

    -- 2. Ensure sensitive functions are fully revoked from both anon and authenticated
    -- (Safety check for any others that might have slipped through or are newly flagged)
    REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.validate_product_review() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.restrict_buyer_order_updates() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM PUBLIC, anon, authenticated;

    -- 3. Grant authenticated access only to what they actually need
    GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.list_public_coupons(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

END $$;
