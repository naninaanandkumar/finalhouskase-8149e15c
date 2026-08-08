-- Fix 1: Hardening SECURITY DEFINER functions in public schema
-- Revoke PUBLIC execute and set strict search_path

-- Audit functions
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC;
ALTER FUNCTION public.log_audit_event() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC;
ALTER FUNCTION public.bootstrap_first_admin() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.validate_product_review() FROM PUBLIC;
ALTER FUNCTION public.validate_product_review() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) FROM PUBLIC;
ALTER FUNCTION public.get_auto_apply_coupon(numeric) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes() FROM PUBLIC;
ALTER FUNCTION public.enforce_super_admin_role_changes() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC;
ALTER FUNCTION public.mcp_check_rate_limit(uuid, text) SET search_path = public;

-- Fix 2: Hardening private schema functions
-- Ensure they are not executable by anon/authenticated unless explicitly needed
-- And set strict search_path

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM authenticated;

-- Only grant back what's necessary for the app to function
GRANT EXECUTE ON FUNCTION private.validate_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_auto_apply_coupon(numeric) TO authenticated;
-- private.is_admin_v2 is usually used in RLS, doesn't need direct EXECUTE by users if used in policies

ALTER FUNCTION private.mark_message_read(uuid) SET search_path = public, private;
ALTER FUNCTION private.validate_coupon(text, numeric) SET search_path = public, private;
ALTER FUNCTION private.create_product_image_signed_url(text, integer) SET search_path = public, private, storage, extensions;
ALTER FUNCTION private.create_product_image_signed_urls(text[], integer) SET search_path = public, private, storage, extensions;

-- Fix 3: Standardize RLS to use the secure private is_admin check if not already done
-- This prevents recursion and search_path issues in policies

-- Example for a table that might have public.is_admin
-- ALTER POLICY "Admins can view coupon logs" ON public.coupon_apply_logs USING (private.is_admin_v2(auth.uid()));
