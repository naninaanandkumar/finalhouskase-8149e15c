
CREATE TABLE public.delivery_pincodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pincode TEXT NOT NULL,
  city TEXT,
  state TEXT,
  delivery_days INTEGER NOT NULL DEFAULT 5,
  is_cod_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_delivery_pincodes_pincode ON public.delivery_pincodes(pincode);

ALTER TABLE public.delivery_pincodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active delivery pincodes"
ON public.delivery_pincodes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage delivery pincodes"
ON public.delivery_pincodes
FOR ALL
USING (is_admin(auth.uid()));

CREATE TRIGGER update_delivery_pincodes_updated_at
BEFORE UPDATE ON public.delivery_pincodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
