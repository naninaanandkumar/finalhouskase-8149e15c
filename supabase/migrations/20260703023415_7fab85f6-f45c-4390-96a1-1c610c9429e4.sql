
-- 1) Remove hardcoded email admin auto-promotion
DROP TRIGGER IF EXISTS auto_promote_founder_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_promote_founder() CASCADE;

-- 2) Remove client-callable ensure_initial_admin bootstrap
DROP FUNCTION IF EXISTS public.ensure_initial_admin() CASCADE;

-- 3) Prevent buyers from tampering with order prices via direct API inserts.
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;

-- 4) Prevent buyers from injecting fake quoted_price / target_price into RFQ items.
DROP POLICY IF EXISTS "Users can insert RFQ items" ON public.rfq_items;
CREATE POLICY "Users can insert RFQ items"
  ON public.rfq_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    rfq_id IS NOT NULL
    AND product_name IS NOT NULL
    AND quantity > 0
    AND quoted_price IS NULL
    AND target_price IS NULL
    AND EXISTS (
      SELECT 1 FROM public.rfq_requests
      WHERE rfq_requests.id = rfq_items.rfq_id
        AND rfq_requests.user_id = auth.uid()
    )
  );

-- 5) Move SECURITY DEFINER helpers into an internal `private` schema so the
--    Supabase linter (0028/0029) stops flagging them as callable through the
--    public API. RLS references bind by oid so policies keep working.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

ALTER FUNCTION public.is_admin(uuid)               SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, app_role)     SET SCHEMA private;
ALTER FUNCTION public.get_user_buyer_type(uuid)    SET SCHEMA private;
ALTER FUNCTION public.list_users_with_roles()      SET SCHEMA private;
ALTER FUNCTION public.mark_message_read(uuid)      SET SCHEMA private;
ALTER FUNCTION public.create_product_image_signed_url(text, integer)   SET SCHEMA private;
ALTER FUNCTION public.create_product_image_signed_urls(text[], integer) SET SCHEMA private;

ALTER FUNCTION private.is_admin(uuid)               SET search_path = public, private;
ALTER FUNCTION private.has_role(uuid, app_role)     SET search_path = public, private;
ALTER FUNCTION private.get_user_buyer_type(uuid)    SET search_path = public, private;
ALTER FUNCTION private.list_users_with_roles()      SET search_path = public, private;
ALTER FUNCTION private.mark_message_read(uuid)      SET search_path = public, private;
ALTER FUNCTION private.create_product_image_signed_url(text, integer)   SET search_path = public, private, storage, extensions;
ALTER FUNCTION private.create_product_image_signed_urls(text[], integer) SET search_path = public, private, storage, extensions;

GRANT EXECUTE ON FUNCTION private.is_admin(uuid)                                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_buyer_type(uuid)                       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.list_users_with_roles()                         TO authenticated;
GRANT EXECUTE ON FUNCTION private.mark_message_read(uuid)                         TO authenticated;
GRANT EXECUTE ON FUNCTION private.create_product_image_signed_url(text, integer)  TO authenticated;
GRANT EXECUTE ON FUNCTION private.create_product_image_signed_urls(text[], integer) TO authenticated;

-- 6) Public SECURITY INVOKER wrappers so existing client rpc calls keep working.
CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE(user_id uuid, email text, full_name text, roles app_role[])
LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.list_users_with_roles(); $$;

CREATE OR REPLACE FUNCTION public.mark_message_read(_message_id uuid)
RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.mark_message_read(_message_id); $$;

CREATE OR REPLACE FUNCTION public.create_product_image_signed_url(_url text, _expires_in integer DEFAULT 3600)
RETURNS text
LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.create_product_image_signed_url(_url, _expires_in); $$;

CREATE OR REPLACE FUNCTION public.create_product_image_signed_urls(_urls text[], _expires_in integer DEFAULT 3600)
RETURNS text[]
LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.create_product_image_signed_urls(_urls, _expires_in); $$;

REVOKE ALL ON FUNCTION public.list_users_with_roles()                            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_message_read(uuid)                            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_product_image_signed_url(text, integer)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_product_image_signed_urls(text[], integer)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles()                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_message_read(uuid)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_image_signed_url(text, integer)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_image_signed_urls(text[], integer)  TO authenticated;
