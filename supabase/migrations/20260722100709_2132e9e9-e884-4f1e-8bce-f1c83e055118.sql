
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric)
 RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric, max_discount_amount numeric, min_order_amount numeric, error text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$ SELECT * FROM private.validate_coupon(_code, _subtotal); $function$;

CREATE OR REPLACE FUNCTION public.get_auto_apply_coupon(_subtotal numeric)
 RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric, max_discount_amount numeric, min_order_amount numeric)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$ SELECT * FROM private.get_auto_apply_coupon(_subtotal); $function$;

CREATE OR REPLACE FUNCTION public.list_public_coupons(_category_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, code text, title text, description text, discount_type text, discount_value numeric, min_order_amount numeric, category_id uuid, auto_apply boolean, show_on_product boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$ SELECT * FROM private.list_public_coupons(_category_id); $function$;
