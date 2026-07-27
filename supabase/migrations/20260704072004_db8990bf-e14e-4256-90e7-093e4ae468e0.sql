
-- Ensure private schema exists
CREATE SCHEMA IF NOT EXISTS private;

-- =====================================================================
-- 1) list_public_coupons: move SECURITY DEFINER body into private schema
-- =====================================================================
CREATE OR REPLACE FUNCTION private.list_public_coupons(_category_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, code text, title text, description text, discount_type text,
              discount_value numeric, min_order_amount numeric, category_id uuid,
              auto_apply boolean, show_on_product boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.code, c.title, c.description, c.discount_type,
         c.discount_value, c.min_order_amount, c.category_id,
         c.auto_apply, c.show_on_product
  FROM public.coupons c
  WHERE c.is_active = true
    AND (c.show_on_product = true OR c.auto_apply = true)
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.starts_at IS NULL OR c.starts_at <= now())
    AND (_category_id IS NULL OR c.category_id IS NULL OR c.category_id = _category_id)
  ORDER BY c.discount_value DESC;
$$;

REVOKE ALL ON FUNCTION private.list_public_coupons(uuid) FROM PUBLIC, anon, authenticated;

-- Recreate the public function as a SECURITY INVOKER wrapper
DROP FUNCTION IF EXISTS public.list_public_coupons(uuid);
CREATE OR REPLACE FUNCTION public.list_public_coupons(_category_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, code text, title text, description text, discount_type text,
              discount_value numeric, min_order_amount numeric, category_id uuid,
              auto_apply boolean, show_on_product boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT * FROM private.list_public_coupons(_category_id); $$;

GRANT EXECUTE ON FUNCTION public.list_public_coupons(uuid) TO anon, authenticated;

-- =====================================================================
-- 2) validate_coupon
-- =====================================================================
CREATE OR REPLACE FUNCTION private.validate_coupon(_code text, _subtotal numeric)
RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric,
              max_discount_amount numeric, min_order_amount numeric, error text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.coupons
  WHERE upper(coupons.code) = upper(_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (starts_at IS NULL OR starts_at <= now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, 'invalid'::text;
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
$$;

REVOKE ALL ON FUNCTION private.validate_coupon(text, numeric) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.validate_coupon(text, numeric);
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric)
RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric,
              max_discount_amount numeric, min_order_amount numeric, error text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT * FROM private.validate_coupon(_code, _subtotal); $$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;

-- =====================================================================
-- 3) get_auto_apply_coupon
-- =====================================================================
CREATE OR REPLACE FUNCTION private.get_auto_apply_coupon(_subtotal numeric)
RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric,
              max_discount_amount numeric, min_order_amount numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.code, c.discount_type, c.discount_value, c.max_discount_amount, c.min_order_amount
  FROM public.coupons c
  WHERE c.is_active = true
    AND c.auto_apply = true
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.starts_at IS NULL OR c.starts_at <= now())
    AND (c.min_order_amount IS NULL OR _subtotal >= c.min_order_amount)
    AND (c.usage_limit IS NULL OR COALESCE(c.used_count,0) < c.usage_limit)
  ORDER BY c.discount_value DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.get_auto_apply_coupon(numeric) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_auto_apply_coupon(numeric);
CREATE OR REPLACE FUNCTION public.get_auto_apply_coupon(_subtotal numeric)
RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric,
              max_discount_amount numeric, min_order_amount numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT * FROM private.get_auto_apply_coupon(_subtotal); $$;

GRANT EXECUTE ON FUNCTION public.get_auto_apply_coupon(numeric) TO anon, authenticated;
