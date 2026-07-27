
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.signup_otps ADD COLUMN IF NOT EXISTS password_encrypted bytea;
ALTER TABLE public.signup_otps ALTER COLUMN password DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.signup_otp_set_password(_email text, _password text, _key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.signup_otps
    SET password_encrypted = pgp_sym_encrypt(_password, _key),
        password = NULL
    WHERE email = _email;
END;
$$;

CREATE OR REPLACE FUNCTION public.signup_otp_get_password(_email text, _key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _enc bytea;
BEGIN
  SELECT password_encrypted INTO _enc FROM public.signup_otps WHERE email = _email;
  IF _enc IS NULL THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(_enc, _key);
END;
$$;

REVOKE ALL ON FUNCTION public.signup_otp_set_password(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.signup_otp_get_password(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.signup_otp_set_password(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.signup_otp_get_password(text, text) TO service_role;

-- Purge any lingering plaintext passwords in existing rows
UPDATE public.signup_otps SET password = NULL WHERE password IS NOT NULL;
