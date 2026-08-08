-- Explicitly REVOKE from PUBLIC and ANON for everything in private schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- Grant only what is absolutely necessary
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_v2(uuid) TO authenticated;

-- Logic functions needed by the app (including anon where applicable)
GRANT EXECUTE ON FUNCTION private.get_auto_apply_coupon(numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.list_public_coupons(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_product_review_stats(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_public_product_reviews(uuid) TO authenticated, anon;

-- Clean up any stragglers in public
DROP FUNCTION IF EXISTS public.get_auto_apply_coupon(numeric);
DROP FUNCTION IF EXISTS public.list_public_coupons(uuid);
