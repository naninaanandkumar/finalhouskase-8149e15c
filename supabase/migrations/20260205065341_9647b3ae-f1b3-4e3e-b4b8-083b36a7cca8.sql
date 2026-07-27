-- Allow anonymous (guest) users to submit RFQ requests
CREATE POLICY "Anyone can submit RFQ requests"
ON public.rfq_requests
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow users to view their own RFQ requests
CREATE POLICY "Users can view own RFQ requests"
ON public.rfq_requests
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow admins to view all RFQ requests
CREATE POLICY "Admins can view all RFQ requests"
ON public.rfq_requests
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to update RFQ requests
CREATE POLICY "Admins can update RFQ requests"
ON public.rfq_requests
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));