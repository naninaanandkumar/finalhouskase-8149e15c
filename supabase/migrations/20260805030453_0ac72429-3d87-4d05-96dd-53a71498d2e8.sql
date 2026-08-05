CREATE POLICY "Users can upload review photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'reviews');

CREATE POLICY "Users can update own review photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'reviews' AND owner = auth.uid());

CREATE POLICY "Users can delete own review photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'reviews' AND owner = auth.uid());