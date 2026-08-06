-- 1. Public read of approved reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view approved reviews"
ON public.product_reviews
FOR SELECT
TO anon, authenticated
USING (is_approved = true);

-- 2. Explicit WITH CHECK on notifications update
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Explicit WITH CHECK on profiles update
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Lock down SECURITY DEFINER functions that must never be callable via the API.
DO $$
DECLARE
  fn text;
  sig text;
BEGIN
  FOR fn, sig IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'bootstrap_first_admin','enforce_super_admin_role_changes','handle_new_user',
        'log_audit_event','restrict_buyer_order_updates','restrict_order_user_update',
        'validate_product_review','signup_otp_get_password','signup_otp_set_password'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;', fn, sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role;', fn, sig);
  END LOOP;
END $$;

-- 5. Admin/rate-limit helpers: signed-in users only, never anonymous.
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) TO authenticated, service_role;