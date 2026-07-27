
-- 1) Tighten coupon_apply_logs insert policy: authenticated only, enforce user_id = auth.uid() or NULL
DROP POLICY IF EXISTS "Anyone can insert coupon logs" ON public.coupon_apply_logs;

CREATE POLICY "Users can insert their own coupon logs"
ON public.coupon_apply_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2) Replace hardcoded-email super-admin check with role-based check
-- Add super_admin to app_role enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;
