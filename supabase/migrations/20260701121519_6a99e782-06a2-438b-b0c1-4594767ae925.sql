
-- 1) Enforce NOT NULL user_id on invoices & rfq_requests (delete orphans first if any)
DELETE FROM public.invoices WHERE user_id IS NULL;
ALTER TABLE public.invoices ALTER COLUMN user_id SET NOT NULL;

DELETE FROM public.rfq_requests WHERE user_id IS NULL;
ALTER TABLE public.rfq_requests ALTER COLUMN user_id SET NOT NULL;

-- 2) Replace the loose avatar storage policies with user-scoped ones
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 3) Lock down SECURITY DEFINER functions - revoke from PUBLIC/anon/authenticated,
-- then grant back only where callers legitimately need to invoke them.
REVOKE EXECUTE ON FUNCTION public.list_users_with_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_message_read(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_order_user_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_initial_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_buyer_type(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_product_image_signed_url(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_product_image_signed_urls(text[], integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_promote_founder() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Grant back to authenticated only for functions clients legitimately call.
-- (RLS internal calls to is_admin/has_role run under SECURITY DEFINER context of the
-- calling policy owner, so they do not require EXECUTE for the querying role.)
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_message_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_initial_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_image_signed_url(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_image_signed_urls(text[], integer) TO authenticated;
