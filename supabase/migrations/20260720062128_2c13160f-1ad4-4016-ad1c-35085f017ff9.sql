
CREATE TABLE public.pwa_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  platform TEXT,
  is_standalone BOOLEAN,
  sw_registered BOOLEAN,
  sw_scope TEXT,
  manifest_ok BOOLEAN,
  manifest_errors TEXT[],
  before_install_prompt_fired BOOLEAN,
  outcome TEXT,
  user_agent TEXT,
  url TEXT,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.pwa_telemetry TO anon, authenticated;
GRANT SELECT ON public.pwa_telemetry TO authenticated;
GRANT ALL ON public.pwa_telemetry TO service_role;

ALTER TABLE public.pwa_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert PWA telemetry"
  ON public.pwa_telemetry FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins can read PWA telemetry"
  ON public.pwa_telemetry FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE INDEX idx_pwa_telemetry_created_at ON public.pwa_telemetry (created_at DESC);
CREATE INDEX idx_pwa_telemetry_event ON public.pwa_telemetry (event);
