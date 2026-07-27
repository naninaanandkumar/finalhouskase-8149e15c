
-- Add offer scheduling columns to product_variations
ALTER TABLE public.product_variations
ADD COLUMN IF NOT EXISTS sale_start_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sale_end_date timestamp with time zone DEFAULT NULL;
