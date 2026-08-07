-- Final hardening: Revoking public/authenticated execute on the remaining sensitive internal SECURITY DEFINER functions.
-- These were likely what the linter was complaining about after the previous migration because I only touched the 6 that were explicitly authenticated-callable.

DO $$ 
DECLARE 
    func_record RECORD;
BEGIN 
    -- Revoke from sensitive internal functions that shouldn't be touched by PUBLIC or authenticated roles
    -- This targets the functions we identified as prosecdef = true
    FOR func_record IN 
        SELECT proname 
        FROM pg_proc p 
        JOIN pg_namespace n ON n.oid = p.pronamespace 
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
          AND p.proname IN (
            'log_audit_event', 
            'bootstrap_first_admin', 
            'validate_product_review', 
            'enforce_super_admin_role_changes', 
            'restrict_buyer_order_updates', 
            'is_super_admin',
            'handle_new_user',
            'restrict_order_user_update',
            'mcp_check_rate_limit',
            'get_auto_apply_coupon',
            'list_public_coupons'
          )
    LOOP
        EXECUTE 'REVOKE ALL ON FUNCTION public.' || quote_ident(func_record.proname) || ' FROM PUBLIC, authenticated, anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.' || quote_ident(func_record.proname) || ' TO service_role';
    END LOOP;
END $$;

-- Specifically allow 'authenticated' to use is_admin as it's common for UI checks
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
-- Specifically allow coupons and reviews for storefront
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.list_public_coupons(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) TO authenticated, anon;
