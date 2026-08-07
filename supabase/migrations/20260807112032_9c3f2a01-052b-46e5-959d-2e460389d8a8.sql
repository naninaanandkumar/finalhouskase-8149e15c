DROP POLICY IF EXISTS "Admins can delete reels" ON public.product_reels;
DROP POLICY IF EXISTS "Admins can insert reels" ON public.product_reels;
DROP POLICY IF EXISTS "Admins can update reels" ON public.product_reels;
DROP POLICY IF EXISTS "Anyone can view active reels" ON public.product_reels;

CREATE POLICY "Admins can delete reels" ON public.product_reels
FOR DELETE TO authenticated USING (private.is_admin(auth.uid()));

CREATE POLICY "Admins can insert reels" ON public.product_reels
FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()));

CREATE POLICY "Admins can update reels" ON public.product_reels
FOR UPDATE TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

CREATE POLICY "Anyone can view active reels" ON public.product_reels
FOR SELECT USING ((is_active = true) OR private.is_admin(auth.uid()));