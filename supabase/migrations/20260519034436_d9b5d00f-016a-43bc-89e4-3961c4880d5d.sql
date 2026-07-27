ALTER TABLE public.hero_slides
ADD COLUMN IF NOT EXISTS object_fit text NOT NULL DEFAULT 'contain',
ADD COLUMN IF NOT EXISTS aspect_ratio text,
ADD COLUMN IF NOT EXISTS desktop_height integer,
ADD COLUMN IF NOT EXISTS mobile_height integer;

ALTER TABLE public.product_reels
ADD COLUMN IF NOT EXISTS object_fit text NOT NULL DEFAULT 'cover';