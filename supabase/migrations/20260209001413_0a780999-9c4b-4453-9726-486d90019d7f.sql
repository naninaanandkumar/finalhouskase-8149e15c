
-- Add guest_price (MRP / individual buyer price) to products table
ALTER TABLE public.products ADD COLUMN guest_price numeric NOT NULL DEFAULT 0;

-- Add guest_price to product_variations table
ALTER TABLE public.product_variations ADD COLUMN guest_price numeric NOT NULL DEFAULT 0;

-- Set guest_price = retail_price as default for existing products
UPDATE public.products SET guest_price = retail_price WHERE guest_price = 0;
UPDATE public.product_variations SET guest_price = retail_price WHERE guest_price = 0;
