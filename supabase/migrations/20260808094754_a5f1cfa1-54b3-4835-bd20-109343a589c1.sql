-- Hardening RLS for orders: ensure all policies are correctly scoped and use private functions
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Admins can manage all orders"
    ON public.orders
    FOR ALL
    TO authenticated
    USING (private.has_role(auth.uid(), 'admin'))
    WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own orders"
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Hardening user_roles: only admins should see or manage roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all user roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (private.has_role(auth.uid(), 'admin'))
    WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Hardening product reviews: users can only manage their own reviews
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.product_reviews;

CREATE POLICY "Users can insert their own reviews"
    ON public.product_reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
    ON public.product_reviews
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
    ON public.product_reviews
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
    ON public.product_reviews
    FOR ALL
    TO authenticated
    USING (private.has_role(auth.uid(), 'admin'));

-- Final check on search_path for SECURITY DEFINER functions in private schema
ALTER FUNCTION private.has_role(uuid, app_role) SET search_path = private, public;
ALTER FUNCTION private.is_admin(uuid) SET search_path = private, public;
