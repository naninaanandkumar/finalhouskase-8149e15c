
-- 1) Orders: enforce user_id NOT NULL to close null-owner ambiguity
UPDATE public.orders SET user_id = user_id WHERE false; -- no-op guard
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id IS NULL) THEN
    -- Leave existing rows; only enforce going forward via a CHECK
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_not_null_chk;
    ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_not_null_chk CHECK (user_id IS NOT NULL) NOT VALID;
  ELSE
    ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Reaffirm strict RLS on orders (owner-only + admin)
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own order notes" ON public.orders;
CREATE POLICY "Users can update own order notes"
ON public.orders FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2) RFQ requests: block buyer-set financial fields at INSERT
DROP POLICY IF EXISTS "Authenticated users can submit RFQ requests" ON public.rfq_requests;
CREATE POLICY "Authenticated users can submit RFQ requests"
ON public.rfq_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND email IS NOT NULL
  AND full_name IS NOT NULL
  AND product_name IS NOT NULL
  AND quantity > 0
  AND status = 'pending'
  AND admin_notes IS NULL
  AND quoted_price IS NULL
  AND unit_price IS NULL
  AND quotation_pdf_url IS NULL
  AND quoted_at IS NULL
  AND (total_amount IS NULL OR total_amount = 0)
  AND (shipping_cost IS NULL OR shipping_cost = 0)
  AND (bulk_discount IS NULL OR bulk_discount = 0)
  AND (gst_amount IS NULL OR gst_amount = 0)
);

-- Prevent buyers from later updating financial fields on their own RFQs
DROP POLICY IF EXISTS "Users can update their own RFQ requests" ON public.rfq_requests;
CREATE POLICY "Users can update their own RFQ requests"
ON public.rfq_requests FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND admin_notes IS NULL
  AND quoted_price IS NULL
  AND unit_price IS NULL
  AND quotation_pdf_url IS NULL
  AND quoted_at IS NULL
  AND (total_amount IS NULL OR total_amount = 0)
  AND (shipping_cost IS NULL OR shipping_cost = 0)
  AND (bulk_discount IS NULL OR bulk_discount = 0)
  AND (gst_amount IS NULL OR gst_amount = 0)
);

-- 3) user_roles: strict policies (admin-only writes, self-view only)
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 4) Revoke EXECUTE on SECURITY DEFINER helpers from anon/authenticated/public
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_buyer_type(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_product_image_signed_url(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_product_image_signed_urls(text[], integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_initial_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_users_with_roles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_message_read(uuid) FROM PUBLIC, anon;

-- Keep only what the client needs (authenticated only)
GRANT EXECUTE ON FUNCTION public.ensure_initial_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_message_read(uuid) TO authenticated;
