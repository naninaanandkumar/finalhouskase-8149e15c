-- Attach the handle_new_user trigger to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create RFQ cart table for multi-product quotation requests
CREATE TABLE IF NOT EXISTS public.rfq_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For guest users
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rfq_cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for RFQ cart
CREATE POLICY "Users can manage their RFQ cart" ON public.rfq_cart_items
  FOR ALL USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Anyone can insert RFQ cart items" ON public.rfq_cart_items
  FOR INSERT WITH CHECK (true);

-- Create RFQ items table for submitted RFQs (links RFQ to products)
CREATE TABLE IF NOT EXISTS public.rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES public.rfq_requests(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  variation_details TEXT,
  quantity INTEGER NOT NULL,
  target_price NUMERIC,
  quoted_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rfq_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for RFQ items
CREATE POLICY "Admins can manage RFQ items" ON public.rfq_items
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their RFQ items" ON public.rfq_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rfq_requests WHERE id = rfq_items.rfq_id AND user_id = auth.uid())
  );

CREATE POLICY "Anyone can insert RFQ items" ON public.rfq_items
  FOR INSERT WITH CHECK (true);

-- Update trigger for rfq_cart_items
CREATE TRIGGER update_rfq_cart_items_updated_at
  BEFORE UPDATE ON public.rfq_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();