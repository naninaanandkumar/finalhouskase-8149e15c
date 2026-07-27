
-- These helpers are invoked from within RLS policies on public storefront
-- tables. RLS policy evaluation runs as the caller, so anon must be allowed
-- to execute them or every SELECT returns "permission denied for function".
-- They only read the roles table and return a boolean.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_buyer_type(uuid) TO anon, authenticated;

-- Also needed by SignedImage rendering for signed-out product page visitors.
GRANT EXECUTE ON FUNCTION public.create_product_image_signed_url(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_image_signed_urls(text[], integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_path_from_url(text, text) TO anon, authenticated;
