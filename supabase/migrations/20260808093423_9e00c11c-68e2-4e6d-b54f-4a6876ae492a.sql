
-- Migration to support webhook event logging and Ekart status tracking

-- 1. Table for generic webhook event logging
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    provider TEXT NOT NULL, -- 'razorpay', 'ekart'
    event_type TEXT,
    external_id TEXT,
    payload JSONB,
    headers JSONB,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Using direct check on user_roles table since has_role function is missing
CREATE POLICY "Admins can view webhook logs"
ON public.webhook_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. Enhance orders for Ekart tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ekart_status') THEN
        ALTER TABLE public.orders ADD COLUMN ekart_status TEXT;
        ALTER TABLE public.orders ADD COLUMN ekart_history JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. Grants for ekart_integration_logs (if not already granted)
GRANT SELECT ON public.ekart_integration_logs TO authenticated;
GRANT ALL ON public.ekart_integration_logs TO service_role;
