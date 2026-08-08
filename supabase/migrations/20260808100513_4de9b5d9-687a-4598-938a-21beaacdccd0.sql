-- 1. Create a secure is_admin check in the private schema if it doesn't exist
CREATE OR REPLACE FUNCTION private.is_admin_v3(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  );
$$;

-- 2. Revoke execute on all public security definer functions from public/anon/authenticated
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef = true
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', 
            func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;

-- 3. Update RLS policies that still use the public is_admin functions
-- We'll use the private.is_admin_v2 or v3 function for security

DROP POLICY IF EXISTS "Admins can view coupon logs" ON public.coupon_apply_logs;
CREATE POLICY "Admins can view coupon logs" ON public.coupon_apply_logs
FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view ekart logs" ON public.ekart_integration_logs;
CREATE POLICY "Admins can view ekart logs" ON public.ekart_integration_logs
FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins manage blog posts" ON public.blog_posts
FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage family testimonials" ON public.family_testimonials;
CREATE POLICY "Admins manage family testimonials" ON public.family_testimonials
FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates" ON public.email_templates
FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
CREATE POLICY "Admins can view email logs" ON public.email_logs
FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- 4. Harden storage policies
DROP POLICY IF EXISTS "Admins manage all RFQ attachments" ON storage.objects;
CREATE POLICY "Admins manage all RFQ attachments" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'rfq-attachments' AND private.has_role(auth.uid(), 'admin'));

-- 5. Revoke public execute on private functions that don't explicitly need it
-- (Checking if they were already revoked in previous turns, but reinforcing)
REVOKE EXECUTE ON FUNCTION private.list_users_with_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.create_product_image_signed_urls(text[], integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.create_product_image_signed_url(text, integer) FROM PUBLIC, anon, authenticated;
