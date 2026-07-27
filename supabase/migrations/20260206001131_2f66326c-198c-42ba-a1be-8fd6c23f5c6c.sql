-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Users can upload RFQ attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view RFQ attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all RFQ attachments" ON storage.objects;

-- Create properly scoped storage policies for RFQ attachments
-- Only allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own RFQ attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rfq-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view attachments in their own folder
CREATE POLICY "Users can view own RFQ attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'rfq-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all RFQ attachments
CREATE POLICY "Admins can manage all RFQ attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'rfq-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);