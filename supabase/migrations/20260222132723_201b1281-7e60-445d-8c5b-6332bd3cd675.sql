
-- Add regular price columns for wholesale and retail tiers in product_variations
ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS shop_regular_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retail_regular_price numeric DEFAULT 0;
