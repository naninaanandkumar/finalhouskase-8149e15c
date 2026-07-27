
CREATE TABLE public.coupon_apply_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  code text NOT NULL,
  subtotal numeric,
  discount numeric,
  status text NOT NULL,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.coupon_apply_logs TO anon, authenticated;
GRANT ALL ON public.coupon_apply_logs TO service_role;
ALTER TABLE public.coupon_apply_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert coupon logs" ON public.coupon_apply_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view coupon logs" ON public.coupon_apply_logs
  FOR SELECT USING (public.is_admin(auth.uid()) OR public.is_super_admin());
CREATE INDEX idx_coupon_apply_logs_code ON public.coupon_apply_logs(code, created_at DESC);
CREATE INDEX idx_coupon_apply_logs_user ON public.coupon_apply_logs(user_id, created_at DESC);
