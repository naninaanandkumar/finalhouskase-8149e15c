-- product-images storage policies
DROP POLICY IF EXISTS "Product images publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage product images" ON storage.objects;

CREATE POLICY "Product images publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins manage product images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'product-images' AND public.is_admin(auth.uid()));

-- rfq-attachments storage policies
DROP POLICY IF EXISTS "Users manage own RFQ attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all RFQ attachments" ON storage.objects;

CREATE POLICY "Users manage own RFQ attachments"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'rfq-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'rfq-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins manage all RFQ attachments"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'rfq-attachments' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'rfq-attachments' AND public.is_admin(auth.uid()));