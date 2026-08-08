INSERT INTO public.user_roles (user_id, role)
VALUES ('19d2d9f7-17fc-41dd-a99b-02573566b78b', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
