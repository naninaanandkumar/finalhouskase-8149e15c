
-- 1. Grant admin role to sales@houskase.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'sales@houskase.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Helper: is the current session the super-admin email?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND lower(email) = 'sales@houskase.com'
  );
$$;

-- 3. Trigger: only super-admin (or NULL auth.uid() = service_role/bootstrap) can modify user_roles
CREATE OR REPLACE FUNCTION public.enforce_super_admin_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service role / postgres / bootstrap trigger (no JWT context)
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Allow super-admin
  IF public.is_super_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Only the super-admin (sales@houskase.com) can manage user roles.';
END;
$$;

DROP TRIGGER IF EXISTS enforce_super_admin_role_changes_trg ON public.user_roles;
CREATE TRIGGER enforce_super_admin_role_changes_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_role_changes();
