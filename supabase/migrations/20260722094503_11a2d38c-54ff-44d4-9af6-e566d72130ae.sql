
CREATE POLICY "Users can view their own reviews" ON public.product_reviews
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.product_reviews
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.product_reviews
FOR DELETE USING (auth.uid() = user_id);
