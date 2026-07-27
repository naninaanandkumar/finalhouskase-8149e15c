
-- Add Ekart tracking columns to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tracking_id text,
  ADD COLUMN IF NOT EXISTS ekart_shipment_id text,
  ADD COLUMN IF NOT EXISTS ekart_sync_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ekart_last_error text,
  ADD COLUMN IF NOT EXISTS ekart_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_tracking_id_idx ON public.orders(tracking_id);
CREATE INDEX IF NOT EXISTS orders_ekart_sync_status_idx ON public.orders(ekart_sync_status);

-- Update buyer restriction trigger to also protect ekart fields
CREATE OR REPLACE FUNCTION public.restrict_buyer_order_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _blocked jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _blocked := _blocked || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    _blocked := _blocked || jsonb_build_object('payment_status', jsonb_build_object('old', OLD.payment_status, 'new', NEW.payment_status));
  END IF;
  IF NEW.total IS DISTINCT FROM OLD.total THEN
    _blocked := _blocked || jsonb_build_object('total', jsonb_build_object('old', OLD.total, 'new', NEW.total));
  END IF;
  IF NEW.subtotal IS DISTINCT FROM OLD.subtotal THEN
    _blocked := _blocked || jsonb_build_object('subtotal', jsonb_build_object('old', OLD.subtotal, 'new', NEW.subtotal));
  END IF;
  IF NEW.refund_status IS DISTINCT FROM OLD.refund_status THEN
    _blocked := _blocked || jsonb_build_object('refund_status', jsonb_build_object('old', OLD.refund_status, 'new', NEW.refund_status));
  END IF;
  IF NEW.refund_amount IS DISTINCT FROM OLD.refund_amount THEN
    _blocked := _blocked || jsonb_build_object('refund_amount', jsonb_build_object('old', OLD.refund_amount, 'new', NEW.refund_amount));
  END IF;
  IF NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id THEN
    _blocked := _blocked || jsonb_build_object('razorpay_payment_id', 'redacted');
  END IF;
  IF NEW.shipping_address IS DISTINCT FROM OLD.shipping_address THEN
    _blocked := _blocked || jsonb_build_object('shipping_address', 'changed');
  END IF;
  IF NEW.billing_address IS DISTINCT FROM OLD.billing_address THEN
    _blocked := _blocked || jsonb_build_object('billing_address', 'changed');
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    _blocked := _blocked || jsonb_build_object('user_id', jsonb_build_object('old', OLD.user_id, 'new', NEW.user_id));
  END IF;
  IF NEW.tracking_id IS DISTINCT FROM OLD.tracking_id THEN
    _blocked := _blocked || jsonb_build_object('tracking_id', 'changed');
  END IF;
  IF NEW.ekart_shipment_id IS DISTINCT FROM OLD.ekart_shipment_id THEN
    _blocked := _blocked || jsonb_build_object('ekart_shipment_id', 'changed');
  END IF;
  IF NEW.ekart_sync_status IS DISTINCT FROM OLD.ekart_sync_status THEN
    _blocked := _blocked || jsonb_build_object('ekart_sync_status', 'changed');
  END IF;

  IF _blocked <> '{}'::jsonb THEN
    BEGIN
      INSERT INTO public.audit_log(actor, action, table_name, row_id, old_data, new_data)
      VALUES (auth.uid(), 'orders.blocked_update', 'orders', OLD.id::text,
        jsonb_build_object('order_number', OLD.order_number), _blocked);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  NEW.status              := OLD.status;
  NEW.payment_status      := OLD.payment_status;
  NEW.razorpay_order_id   := OLD.razorpay_order_id;
  NEW.razorpay_payment_id := OLD.razorpay_payment_id;
  NEW.razorpay_signature  := OLD.razorpay_signature;
  NEW.refund_status       := OLD.refund_status;
  NEW.refund_amount       := OLD.refund_amount;
  NEW.subtotal            := OLD.subtotal;
  NEW.tax                 := OLD.tax;
  NEW.shipping            := OLD.shipping;
  NEW.total               := OLD.total;
  NEW.order_number        := OLD.order_number;
  NEW.buyer_type          := OLD.buyer_type;
  NEW.shipping_address    := OLD.shipping_address;
  NEW.billing_address     := OLD.billing_address;
  NEW.user_id             := OLD.user_id;
  NEW.created_at          := OLD.created_at;
  NEW.tracking_id         := OLD.tracking_id;
  NEW.ekart_shipment_id   := OLD.ekart_shipment_id;
  NEW.ekart_sync_status   := OLD.ekart_sync_status;
  NEW.ekart_last_error    := OLD.ekart_last_error;
  NEW.ekart_synced_at     := OLD.ekart_synced_at;
  RETURN NEW;
END;
$function$;

-- Ekart integration logs table
CREATE TABLE IF NOT EXISTS public.ekart_integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text,
  action text NOT NULL,
  endpoint text,
  request_payload jsonb,
  response_payload jsonb,
  status_code int,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  tracking_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ekart_integration_logs TO authenticated;
GRANT ALL ON public.ekart_integration_logs TO service_role;

ALTER TABLE public.ekart_integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ekart logs"
  ON public.ekart_integration_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS ekart_logs_order_id_idx ON public.ekart_integration_logs(order_id);
CREATE INDEX IF NOT EXISTS ekart_logs_created_at_idx ON public.ekart_integration_logs(created_at DESC);
