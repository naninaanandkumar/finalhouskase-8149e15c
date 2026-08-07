-- 1. Email Templates Versioning Table
CREATE TABLE public.email_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL, -- 'order_notification', etc.
    name text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    version integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE(type, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates" 
ON public.email_templates 
TO authenticated 
USING (public.is_admin(auth.uid())) 
WITH CHECK (public.is_admin(auth.uid()));

-- 2. Enhanced Email Audit Log (or reuse audit_log if preferred, but a dedicated one is better for "Resend" history)
CREATE TABLE public.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    recipient_email text NOT NULL,
    status text NOT NULL, -- 'sent', 'failed'
    notification_type text NOT NULL,
    error_message text,
    metadata jsonb DEFAULT '{}',
    sent_at timestamptz DEFAULT now(),
    sent_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs" 
ON public.email_logs 
FOR SELECT 
TO authenticated 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert email logs" 
ON public.email_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin(auth.uid()));
