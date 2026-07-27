CREATE TABLE public.product_reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_reels_active_order ON public.product_reels(is_active, sort_order);
CREATE INDEX idx_product_reels_product ON public.product_reels(product_id);

ALTER TABLE public.product_reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active reels"
  ON public.product_reels FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert reels"
  ON public.product_reels FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reels"
  ON public.product_reels FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reels"
  ON public.product_reels FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_reels_updated_at
  BEFORE UPDATE ON public.product_reels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();