-- Hardening the remaining 'public' functions by revoking PUBLIC execute
-- and moving them to 'private' if they don't exist there yet.

DO $$
BEGIN
    -- get_product_review_stats
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'get_product_review_stats') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'private' AND p.proname = 'get_product_review_stats') THEN
            ALTER FUNCTION public.get_product_review_stats(uuid) SET SCHEMA private;
        ELSE
            DROP FUNCTION public.get_product_review_stats(uuid);
        END IF;
    END IF;

    -- get_public_product_reviews
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'get_public_product_reviews') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'private' AND p.proname = 'get_public_product_reviews') THEN
            ALTER FUNCTION public.get_public_product_reviews(uuid) SET SCHEMA private;
        ELSE
            DROP FUNCTION public.get_public_product_reviews(uuid);
        END IF;
    END IF;
END $$;

-- Set search paths and revoke/grant for ALL in private
ALTER FUNCTION private.get_auto_apply_coupon(numeric) SET search_path = public, private;
ALTER FUNCTION private.list_public_coupons(uuid) SET search_path = public, private;
ALTER FUNCTION private.get_product_review_stats(uuid) SET search_path = public, private;
ALTER FUNCTION private.get_public_product_reviews(uuid) SET search_path = public, private;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_auto_apply_coupon(numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.list_public_coupons(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_product_review_stats(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_public_product_reviews(uuid) TO authenticated, anon;
