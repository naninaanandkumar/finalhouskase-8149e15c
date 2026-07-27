ALTER TABLE public.product_reels
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_on_product boolean NOT NULL DEFAULT true;