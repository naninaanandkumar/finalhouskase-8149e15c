
-- Create product_attributes table for dynamic attributes
CREATE TABLE public.product_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_attribute_values table
CREATE TABLE public.product_attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attribute_id UUID NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attribute_id, value)
);

-- Create product_attribute_assignments (links products to attributes and their values)
CREATE TABLE public.product_attribute_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  attribute_value_id UUID NOT NULL REFERENCES public.product_attribute_values(id) ON DELETE CASCADE,
  used_for_variations BOOLEAN DEFAULT false,
  visible_on_product BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, attribute_id, attribute_value_id)
);

-- Add guest_price and regular_price to product_variations (guest_price already exists)
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS regular_price NUMERIC DEFAULT 0;

-- Add show_text and show_buttons to hero_slides
ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS show_text BOOLEAN DEFAULT true;
ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS show_buttons BOOLEAN DEFAULT true;

-- Enable RLS
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_attributes
CREATE POLICY "Anyone can view attributes" ON public.product_attributes FOR SELECT USING (true);
CREATE POLICY "Admins can manage attributes" ON public.product_attributes FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for product_attribute_values
CREATE POLICY "Anyone can view attribute values" ON public.product_attribute_values FOR SELECT USING (true);
CREATE POLICY "Admins can manage attribute values" ON public.product_attribute_values FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for product_attribute_assignments
CREATE POLICY "Anyone can view attribute assignments" ON public.product_attribute_assignments FOR SELECT USING (true);
CREATE POLICY "Admins can manage attribute assignments" ON public.product_attribute_assignments FOR ALL USING (is_admin(auth.uid()));

-- Add gallery_images to product_variations for per-variation galleries
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}'::text[];
