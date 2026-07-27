
-- 1. Restore anon SELECT on genuinely public catalog / storefront tables.
GRANT SELECT ON public.brands TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.hero_slides TO anon;
GRANT SELECT ON public.homepage_sections TO anon;
GRANT SELECT ON public.product_reels TO anon;
GRANT SELECT ON public.promo_banners TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_variations TO anon;
GRANT SELECT ON public.product_attribute_assignments TO anon;
GRANT SELECT ON public.product_attribute_values TO anon;
GRANT SELECT ON public.product_attributes TO anon;
GRANT SELECT ON public.product_custom_tabs TO anon;
GRANT SELECT ON public.product_offers TO anon;
GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT ON public.delivery_pincodes TO anon;
GRANT SELECT ON public.coupons TO anon;

-- Make sure authenticated + service_role still have needed grants (idempotent).
GRANT SELECT ON public.brands, public.categories, public.hero_slides, public.homepage_sections,
  public.product_reels, public.promo_banners, public.site_settings, public.products,
  public.product_variations, public.product_attribute_assignments, public.product_attribute_values,
  public.product_attributes, public.product_custom_tabs, public.product_offers,
  public.product_reviews, public.delivery_pincodes, public.coupons TO authenticated;

-- 2. Audit log table.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS audit_log_table_created_idx ON public.audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log(actor);

-- 3. Trigger function that writes an audit row. SECURITY DEFINER so it can
-- always INSERT regardless of caller's role. It never returns data to the
-- caller so it is safe.
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row_id text;
BEGIN
  BEGIN
    _row_id := COALESCE((to_jsonb(NEW) ->> 'id'), (to_jsonb(OLD) ->> 'id'));
  EXCEPTION WHEN OTHERS THEN
    _row_id := NULL;
  END;

  INSERT INTO public.audit_log(actor, action, table_name, row_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    _row_id,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Lock down the trigger function so no client role can execute it directly.
REVOKE ALL ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;

-- 4. Triggers.
DROP TRIGGER IF EXISTS audit_orders_update ON public.orders;
CREATE TRIGGER audit_orders_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_rfq_requests_insert ON public.rfq_requests;
CREATE TRIGGER audit_rfq_requests_insert
  AFTER INSERT ON public.rfq_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
