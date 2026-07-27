
DROP VIEW IF EXISTS public.product_reviews_public;

CREATE OR REPLACE FUNCTION public.get_public_product_reviews(_product_id uuid)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  reviewer_name text,
  rating integer,
  review_text text,
  is_verified boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, product_id, reviewer_name, rating, review_text, is_verified, created_at
  FROM public.product_reviews
  WHERE product_id = _product_id AND is_approved = true
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_product_review_stats(_product_id uuid)
RETURNS TABLE (avg_rating numeric, review_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(rating)::numeric(3,2), 0) AS avg_rating,
         COUNT(*)::bigint AS review_count
  FROM public.product_reviews
  WHERE product_id = _product_id AND is_approved = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(uuid) TO anon, authenticated;
