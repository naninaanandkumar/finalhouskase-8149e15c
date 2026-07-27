ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_refund_id text,
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_failed_reason text;

CREATE TABLE IF NOT EXISTS public.razorpay_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE,
  event_type text NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_refund_id text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric,
  currency text,
  status text,
  method text,
  email text,
  contact text,
  error_code text,
  error_description text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS razorpay_events_order_id_idx ON public.razorpay_events(order_id);
CREATE INDEX IF NOT EXISTS razorpay_events_rzp_order_idx ON public.razorpay_events(razorpay_order_id);
CREATE INDEX IF NOT EXISTS razorpay_events_created_at_idx ON public.razorpay_events(created_at DESC);

GRANT SELECT ON public.razorpay_events TO authenticated;
GRANT ALL ON public.razorpay_events TO service_role;

ALTER TABLE public.razorpay_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view razorpay events" ON public.razorpay_events;
CREATE POLICY "Admins can view razorpay events"
  ON public.razorpay_events
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.orders REPLICA IDENTITY FULL;