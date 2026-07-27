
-- Create product_offers table for admin-managed GST/BULK/SAVE offers per category
CREATE TABLE public.product_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  offer_type text NOT NULL CHECK (offer_type IN ('GST', 'BULK', 'SAVE')),
  badge_label text NOT NULL,
  description text NOT NULL,
  details_url text,
  min_order_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offers" ON public.product_offers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage offers" ON public.product_offers
  FOR ALL USING (is_admin(auth.uid()));

-- Create product_reviews table
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_verified boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Authenticated users can submit reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can manage reviews" ON public.product_reviews
  FOR ALL USING (is_admin(auth.uid()));

-- Create product_custom_tabs table for admin extra tabs
CREATE TABLE public.product_custom_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tab_title text NOT NULL,
  tab_content text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_custom_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active custom tabs" ON public.product_custom_tabs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage custom tabs" ON public.product_custom_tabs
  FOR ALL USING (is_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_product_offers_updated_at
  BEFORE UPDATE ON public.product_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
