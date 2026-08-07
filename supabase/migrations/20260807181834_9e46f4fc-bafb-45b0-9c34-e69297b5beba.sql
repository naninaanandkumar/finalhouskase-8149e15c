-- This migration hardens the database security by revoking public execution rights 
-- from sensitive SECURITY DEFINER functions that were identified by the linter.

-- Revoke EXECUTE from PUBLIC (which includes anon and authenticated) on all public schema SECURITY DEFINER functions.
-- We then selectively grant back access to only what is strictly necessary for authenticated users.

DO $$
DECLARE
    func_name text;
BEGIN
    -- Revoke from PUBLIC on all these functions
    REVOKE EXECUTE ON FUNCTION public.log_audit_event FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.is_admin FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.is_super_admin FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.signup_otp_set_password FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.signup_otp_get_password FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.validate_product_review FROM PUBLIC, anon, authenticated;

    -- Note: service_role still has access by default as the owner/superuser in most contexts, 
    -- but we ensure it's not affected by these revokes.

    -- Selectively Grant back to authenticated where needed for app functionality:
    GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
    GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_product_review_stats TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_public_product_reviews TO authenticated;
    GRANT EXECUTE ON FUNCTION public.validate_coupon TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon TO authenticated;
    GRANT EXECUTE ON FUNCTION public.list_public_coupons TO authenticated;
    GRANT EXECUTE ON FUNCTION public.signup_otp_set_password TO authenticated;
    GRANT EXECUTE ON FUNCTION public.signup_otp_get_password TO authenticated;

    -- These stay strictly restricted to service_role or triggers:
    -- log_audit_event
    -- bootstrap_first_admin
    -- handle_new_user
    -- mcp_check_rate_limit
    -- enforce_super_admin_role_changes
    -- validate_product_review (usually called via trigger or admin)
END $$;
