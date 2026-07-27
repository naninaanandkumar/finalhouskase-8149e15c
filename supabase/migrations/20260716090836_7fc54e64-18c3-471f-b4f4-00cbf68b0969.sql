
CREATE TABLE public.signup_otp_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent','resent','verified','failed','expired','max_attempts_reached','send_failed','rate_limited','already_exists')),
  status TEXT NOT NULL CHECK (status IN ('success','warning','error')),
  error_message TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_otp_events_email ON public.signup_otp_events(email);
CREATE INDEX idx_signup_otp_events_created_at ON public.signup_otp_events(created_at DESC);

GRANT SELECT ON public.signup_otp_events TO authenticated;
GRANT ALL ON public.signup_otp_events TO service_role;

ALTER TABLE public.signup_otp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view OTP events"
  ON public.signup_otp_events
  FOR SELECT
  TO authenticated
  USING (private.is_admin(auth.uid()));
