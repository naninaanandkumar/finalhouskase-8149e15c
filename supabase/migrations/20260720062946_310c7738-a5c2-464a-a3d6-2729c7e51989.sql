-- Enhance buyer order-update restriction: log any attempt to change protected columns
CREATE OR REPLACE FUNCTION public.restrict_buyer_order_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _blocked jsonb := '{}'::jsonb;
BEGIN
  -- Admins & service role bypass
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- Detect protected-column changes and record them before reverting
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

  IF _blocked <> '{}'::jsonb THEN
    BEGIN
      INSERT INTO public.audit_log(actor, action, table_name, row_id, old_data, new_data)
      VALUES (
        auth.uid(),
        'orders.blocked_update',
        'orders',
        OLD.id::text,
        jsonb_build_object('order_number', OLD.order_number),
        _blocked
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- never fail the trigger because of audit logging
    END;
  END IF;

  -- Preserve every column except `notes` and `updated_at`
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

  RETURN NEW;
END;
$$;

-- Ensure the trigger is attached (idempotent)
DROP TRIGGER IF EXISTS trg_restrict_buyer_order_updates ON public.orders;
CREATE TRIGGER trg_restrict_buyer_order_updates
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.restrict_buyer_order_updates();

-- Keep function un-callable directly
REVOKE ALL ON FUNCTION public.restrict_buyer_order_updates() FROM PUBLIC, anon, authenticated;