
-- Drop the overly permissive public policy that exposed user_id
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;

-- Create a sanitized public view without user_id
CREATE OR REPLACE VIEW public.product_reviews_public
WITH (security_invoker=off) AS
SELECT id, product_id, reviewer_name, rating, review_text, is_verified, is_approved, created_at
FROM public.product_reviews
WHERE is_approved = true;

GRANT SELECT ON public.product_reviews_public TO anon, authenticated;
