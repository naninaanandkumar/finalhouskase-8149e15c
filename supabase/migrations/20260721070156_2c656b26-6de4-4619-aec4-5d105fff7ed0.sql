ALTER TABLE public.product_reels
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_reels_category_id ON public.product_reels(category_id);