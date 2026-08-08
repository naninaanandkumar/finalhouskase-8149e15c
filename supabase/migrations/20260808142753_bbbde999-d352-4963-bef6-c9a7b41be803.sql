-- Ensure public access to storefront tables
GRANT SELECT ON public.hero_slides TO anon, authenticated;
GRANT SELECT ON public.promo_banners TO anon, authenticated;
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_reels TO anon, authenticated;
GRANT SELECT ON public.homepage_sections TO anon, authenticated;
GRANT SELECT ON public.product_variations TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.brands TO anon, authenticated;

-- Ensure RLS helper functions are accessible
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_v2(uuid) TO anon, authenticated;

-- Set functions as security definer to prevent permission issues during RLS evaluation
ALTER FUNCTION public.is_admin(uuid) SECURITY DEFINER;
ALTER FUNCTION private.is_admin(uuid) SECURITY DEFINER;
ALTER FUNCTION private.is_admin_v2(uuid) SECURITY DEFINER;

-- Fix variation visibility which is critical for product pages
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active variations" ON public.product_variations;
CREATE POLICY "Anyone can view active variations" ON public.product_variations
FOR SELECT TO public USING (is_active = true);
GRANT ALL ON public.product_variations TO service_role;
