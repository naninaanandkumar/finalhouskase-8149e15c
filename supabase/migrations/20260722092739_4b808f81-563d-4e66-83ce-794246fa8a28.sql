CREATE OR REPLACE FUNCTION private.validate_coupon(_code text, _subtotal numeric)
 RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric, max_discount_amount numeric, min_order_amount numeric, error text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.coupons
  WHERE upper(coupons.code) = upper(_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, 'invalid'::text;
    RETURN;
  END IF;

  IF c.is_active IS NOT TRUE THEN
    RETURN QUERY SELECT c.id, c.code, c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount, 'inactive'::text;
    RETURN;
  END IF;

  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN
    RETURN QUERY SELECT c.id, c.code, c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount, 'not_started'::text;
    RETURN;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    RETURN QUERY SELECT c.id, c.code, c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount, 'expired'::text;
    RETURN;
  END IF;

  IF c.min_order_amount IS NOT NULL AND _subtotal < c.min_order_amount THEN
    RETURN QUERY SELECT c.id, c.code, c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount, 'min_not_met'::text;
    RETURN;
  END IF;

  IF c.usage_limit IS NOT NULL AND COALESCE(c.used_count,0) >= c.usage_limit THEN
    RETURN QUERY SELECT c.id, c.code, c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount, 'exhausted'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT c.id, c.code, c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount, NULL::text;
END;
$function$;