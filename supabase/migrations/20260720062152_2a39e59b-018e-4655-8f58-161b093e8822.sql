
DROP POLICY IF EXISTS "Anyone can insert PWA telemetry" ON public.pwa_telemetry;

CREATE POLICY "Anyone can insert scoped PWA telemetry"
  ON public.pwa_telemetry FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event IN (
      'page_load','install_available','install_prompt_shown','install_accepted',
      'install_dismissed','install_completed','ios_instructions_shown',
      'diagnostics_run','manifest_invalid','sw_registration_failed'
    )
    AND coalesce(length(event), 0) <= 64
    AND coalesce(length(platform), 0) <= 32
    AND coalesce(length(user_agent), 0) <= 512
    AND coalesce(length(url), 0) <= 512
    AND coalesce(array_length(manifest_errors, 1), 0) <= 20
  );
