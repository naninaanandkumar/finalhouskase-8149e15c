-- Add show_on_product field to coupons for controlling visibility on product pages
ALTER TABLE public.coupons ADD COLUMN show_on_product boolean DEFAULT false;