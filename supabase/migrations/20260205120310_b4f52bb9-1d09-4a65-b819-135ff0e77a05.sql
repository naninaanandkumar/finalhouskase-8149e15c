-- Add shipping and tax fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS length numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS width numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS height numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_class text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS gst_percentage numeric DEFAULT 18,
ADD COLUMN IF NOT EXISTS tax_class text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS short_description text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add weight field to product_variations
ALTER TABLE public.product_variations 
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shop_moq integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS retail_moq integer DEFAULT 1;