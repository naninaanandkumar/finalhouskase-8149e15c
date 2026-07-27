-- Add GST number and file uploads to RFQ requests
ALTER TABLE public.rfq_requests 
ADD COLUMN IF NOT EXISTS gst_number TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';

-- Create storage bucket for RFQ attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('rfq-attachments', 'rfq-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload RFQ attachments
CREATE POLICY "Users can upload RFQ attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'rfq-attachments');

-- Allow authenticated users to view their own RFQ attachments
CREATE POLICY "Users can view RFQ attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'rfq-attachments');

-- Allow admins to view all RFQ attachments
CREATE POLICY "Admins can view all RFQ attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'rfq-attachments' AND EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Add quotation builder fields to RFQ
ALTER TABLE public.rfq_requests
ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bulk_discount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_timeline TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS quotation_pdf_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;