ALTER TABLE public.signup_otps
ADD COLUMN IF NOT EXISTS correlation_id TEXT;

CREATE INDEX IF NOT EXISTS idx_signup_otps_correlation_id
  ON public.signup_otps(correlation_id);

CREATE INDEX IF NOT EXISTS idx_signup_otp_events_email_created_at
  ON public.signup_otp_events(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signup_otp_events_ip_created_at
  ON public.signup_otp_events(ip, created_at DESC);