-- 1. Ensure the schema and function exist before the loop
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin_v2(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  );
END;
$$;

-- 2. Correct the RLS migration logic to handle empty USING clauses
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename, cmd, roles, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (qual LIKE '%public.is_admin%' OR with_check LIKE '%public.is_admin%' OR qual LIKE '%private.is_admin(%' OR with_check LIKE '%private.is_admin(%')
    ) LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
        
        EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO %s %s %s', 
            pol.policyname, 
            pol.tablename, 
            pol.cmd, 
            array_to_string(pol.roles, ','), 
            CASE WHEN pol.qual IS NOT NULL AND pol.qual <> '' THEN 'USING (' || replace(replace(pol.qual, 'public.is_admin', 'private.is_admin_v2'), 'private.is_admin(', 'private.is_admin_v2(') || ')' ELSE '' END,
            CASE WHEN pol.with_check IS NOT NULL AND pol.with_check <> '' THEN 'WITH CHECK (' || replace(replace(pol.with_check, 'public.is_admin', 'private.is_admin_v2'), 'private.is_admin(', 'private.is_admin_v2(') || ')' ELSE '' END
        );
    END LOOP;
END $$;
