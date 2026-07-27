-- Allow authenticated users to insert their own invoices
CREATE POLICY "Users can create their own invoices"
ON public.invoices
FOR INSERT
WITH CHECK (auth.uid() = user_id);