-- Make order_number have a default value so it's not required on insert
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT '';

-- Make invoice_number have a default value so it's not required on insert
ALTER TABLE public.invoices ALTER COLUMN invoice_number SET DEFAULT '';