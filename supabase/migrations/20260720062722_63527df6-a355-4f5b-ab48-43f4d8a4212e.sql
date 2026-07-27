
-- Trigger enforces column-level restriction: non-admins can only modify `notes`.
CREATE OR REPLACE FUNCTION public.restrict_buyer_order_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins & service role bypass
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) OR public.is_super_admin() THEN
    RETURN NEW;
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

DROP TRIGGER IF EXISTS trg_restrict_buyer_order_updates ON public.orders;
CREATE TRIGGER trg_restrict_buyer_order_updates
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.restrict_buyer_order_updates();
