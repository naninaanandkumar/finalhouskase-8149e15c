
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_changes()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()                      FROM PUBLIC, anon, authenticated;

GRANT  EXECUTE ON FUNCTION public.list_public_coupons(uuid)             TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.validate_coupon(text, numeric)        TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric)        TO anon, authenticated;

REVOKE SELECT (shop_price, shop_moq, retail_price, retail_moq)
  ON public.products FROM anon;

REVOKE SELECT (shop_price, shop_regular_price, shop_moq,
               retail_price, retail_regular_price, retail_moq)
  ON public.product_variations FROM anon;
