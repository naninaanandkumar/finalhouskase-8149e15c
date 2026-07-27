CREATE OR REPLACE FUNCTION public.ensure_initial_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := auth.jwt() ->> 'email';
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    current_user_id,
    COALESCE(NULLIF(current_email, ''), current_user_id::text || '@user.local'),
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name')
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN public.is_admin(current_user_id);
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_path_from_url(_url text, _bucket text DEFAULT 'product-images')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  marker text := '/storage/v1/object/public/' || _bucket || '/';
  marker_private text := '/storage/v1/object/sign/' || _bucket || '/';
  raw_path text;
BEGIN
  IF _url IS NULL OR btrim(_url) = '' THEN
    RETURN NULL;
  END IF;

  IF position(marker in _url) > 0 THEN
    raw_path := split_part(split_part(_url, marker, 2), '?', 1);
  ELSIF position(marker_private in _url) > 0 THEN
    raw_path := split_part(split_part(_url, marker_private, 2), '?', 1);
  ELSE
    RETURN NULL;
  END IF;

  RETURN NULLIF(raw_path, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_product_image_signed_url(_url text, _expires_in integer DEFAULT 3600)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'extensions'
AS $$
DECLARE
  object_path text;
  expiry integer := LEAST(GREATEST(COALESCE(_expires_in, 3600), 60), 86400);
BEGIN
  object_path := public.storage_path_from_url(_url, 'product-images');

  IF object_path IS NULL THEN
    RETURN _url;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'product-images'
      AND name = object_path
  ) THEN
    RETURN _url;
  END IF;

  RETURN storage.sign_url('product-images', object_path, expiry);
EXCEPTION WHEN OTHERS THEN
  RETURN _url;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_product_image_signed_urls(_urls text[], _expires_in integer DEFAULT 3600)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'extensions'
AS $$
DECLARE
  result text[] := ARRAY[]::text[];
  item text;
BEGIN
  IF _urls IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  FOREACH item IN ARRAY _urls LOOP
    result := array_append(result, public.create_product_image_signed_url(item, _expires_in));
  END LOOP;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_initial_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_path_from_url(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_image_signed_url(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_image_signed_urls(text[], integer) TO anon, authenticated;