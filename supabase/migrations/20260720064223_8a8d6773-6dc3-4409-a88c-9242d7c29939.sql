DROP POLICY IF EXISTS "Anyone can insert scoped PWA telemetry" ON public.pwa_telemetry;

CREATE POLICY "Anyone can insert scoped PWA telemetry"
ON public.pwa_telemetry
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());