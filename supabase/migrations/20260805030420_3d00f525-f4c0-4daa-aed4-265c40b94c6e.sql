ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS review_title text,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}'::text[];

DROP FUNCTION IF EXISTS public.get_public_product_reviews(uuid);

CREATE FUNCTION public.get_public_product_reviews(_product_id uuid)
 RETURNS TABLE(id uuid, product_id uuid, reviewer_name text, rating integer, review_text text, review_title text, photos text[], is_verified boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, product_id, reviewer_name, rating, review_text, review_title, photos, is_verified, created_at
  FROM public.product_reviews
  WHERE product_id = _product_id AND is_approved = true
  ORDER BY created_at DESC;
$function$;