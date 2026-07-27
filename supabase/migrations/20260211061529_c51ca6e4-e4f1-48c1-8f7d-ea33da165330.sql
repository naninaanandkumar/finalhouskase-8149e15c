-- Fix: Allow users to insert their own invoices during checkout
CREATE POLICY "Users can create their own invoices"
ON public.invoices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add regular_price (MRP) column for buyer tier strikethrough pricing
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS regular_price numeric DEFAULT 0 NOT NULL;