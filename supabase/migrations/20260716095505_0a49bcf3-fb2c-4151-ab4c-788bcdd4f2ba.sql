DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'signup_otps'
      AND policyname = 'No direct client access to signup OTPs'
  ) THEN
    CREATE POLICY "No direct client access to signup OTPs"
      ON public.signup_otps
      FOR ALL
      TO authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;