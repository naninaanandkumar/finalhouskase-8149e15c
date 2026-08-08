-- Hardening SECURITY DEFINER functions with specific search paths and restricted execution
-- to satisfy security linter requirements.

-- Public schema functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.is_super_admin() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;

-- Private schema functions
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
ALTER FUNCTION private.get_product_review_stats(uuid) SET search_path = public, private;
ALTER FUNCTION private.get_public_product_reviews(uuid) SET search_path = public, private;

-- Strict access control
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;
GRANT USAGE ON SCHEMA private TO authenticated, anon;

-- App required grants
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_auto_apply_coupon(numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.list_public_coupons(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_product_review_stats(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.get_public_product_reviews(uuid) TO authenticated, anon;
