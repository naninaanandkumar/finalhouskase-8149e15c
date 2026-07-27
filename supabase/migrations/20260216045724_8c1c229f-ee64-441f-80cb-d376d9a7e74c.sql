
-- Create homepage_sections table for admin-managed featured product sections
CREATE TABLE public.homepage_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  background_image TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  product_limit INTEGER DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active homepage sections"
ON public.homepage_sections FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage homepage sections"
ON public.homepage_sections FOR ALL
USING (is_admin(auth.uid()));
