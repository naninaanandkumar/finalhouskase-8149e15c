-- Trigger / internal-only functions: no direct API access
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_buyer_order_updates() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM anon, authenticated;

-- Privileged / server-only functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('bootstrap_first_admin','signup_otp_get_password','signup_otp_set_password','log_audit_event')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;

  -- Signed-in-only helpers: block anonymous callers
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('is_admin','is_super_admin','list_users_with_roles','mcp_check_rate_limit')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;