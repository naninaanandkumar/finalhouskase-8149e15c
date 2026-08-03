DO $$
DECLARE r record;
  server_only text[] := ARRAY['handle_new_user','enforce_super_admin_role_changes','restrict_buyer_order_updates','restrict_order_user_update','bootstrap_first_admin','signup_otp_get_password','signup_otp_set_password','log_audit_event'];
  auth_only text[] := ARRAY['is_admin','is_super_admin','list_users_with_roles','mcp_check_rate_limit'];
  public_ok text[] := ARRAY['get_auto_apply_coupon','get_product_review_stats','get_public_product_reviews','list_public_coupons','validate_coupon'];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = ANY(auth_only) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    ELSIF r.proname = ANY(public_ok) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
    ELSIF NOT (r.proname = ANY(server_only)) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;