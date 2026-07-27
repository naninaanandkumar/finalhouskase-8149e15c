ALTER TABLE public.product_reviews ALTER COLUMN is_approved SET DEFAULT true;

DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON public.product_reviews;
CREATE POLICY "Authenticated users can submit reviews"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);