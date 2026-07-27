
CREATE TABLE public.signup_otps (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  full_name TEXT,
  password TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  resend_available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.signup_otps TO service_role;

ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (used by edge functions) can access.

CREATE TRIGGER update_signup_otps_updated_at
BEFORE UPDATE ON public.signup_otps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
