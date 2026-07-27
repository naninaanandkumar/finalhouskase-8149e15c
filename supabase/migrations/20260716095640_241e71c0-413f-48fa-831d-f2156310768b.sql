ALTER TABLE public.signup_otp_events
DROP CONSTRAINT IF EXISTS signup_otp_events_event_type_check;

ALTER TABLE public.signup_otp_events
ADD CONSTRAINT signup_otp_events_event_type_check
CHECK (event_type IN ('sent','resent','verified','failed','expired','max_attempts_reached','send_failed','send_retry','rate_limited','already_exists'));