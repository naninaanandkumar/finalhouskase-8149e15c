
CREATE OR REPLACE FUNCTION public.validate_product_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean := (_uid IS NOT NULL AND public.is_admin(_uid));
  _photo text;
  _path text;
  _size bigint;
  _ext text;
BEGIN
  -- service role / internal (no JWT): allow through untouched
  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT _is_admin THEN
    IF TG_OP = 'INSERT' THEN
      NEW.user_id := _uid;
      NEW.is_approved := false;
      NEW.is_verified := COALESCE(NEW.is_verified, false);
    ELSE
      IF OLD.user_id IS DISTINCT FROM _uid THEN
        RAISE EXCEPTION 'You can only modify your own review.';
      END IF;
      NEW.user_id    := OLD.user_id;
      NEW.product_id := OLD.product_id;
      NEW.created_at := OLD.created_at;
      NEW.is_verified := OLD.is_verified;
      NEW.is_approved := false; -- edits need re-approval
    END IF;
  END IF;

  IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5.';
  END IF;
  IF btrim(COALESCE(NEW.reviewer_name, '')) = '' OR length(NEW.reviewer_name) > 80 THEN
    RAISE EXCEPTION 'Reviewer name is required and must be 80 characters or less.';
  END IF;
  IF NEW.review_title IS NOT NULL AND length(NEW.review_title) > 120 THEN
    RAISE EXCEPTION 'Review title must be 120 characters or less.';
  END IF;
  IF NEW.review_text IS NOT NULL AND length(NEW.review_text) > 4000 THEN
    RAISE EXCEPTION 'Review text must be 4000 characters or less.';
  END IF;

  NEW.photos := COALESCE(NEW.photos, '{}'::text[]);
  IF array_length(NEW.photos, 1) > 4 THEN
    RAISE EXCEPTION 'A review can include at most 4 photos.';
  END IF;

  IF NOT _is_admin THEN
    FOREACH _photo IN ARRAY NEW.photos LOOP
      _path := public.storage_path_from_url(_photo, 'product-images');
      IF _path IS NULL THEN
        RAISE EXCEPTION 'Review photos must be uploaded to the product-images storage bucket.';
      END IF;
      IF (storage.foldername(_path))[1] <> 'reviews'
         OR (storage.foldername(_path))[2] IS DISTINCT FROM _uid::text THEN
        RAISE EXCEPTION 'Review photos must be uploaded to your own review folder.';
      END IF;
      _ext := lower(split_part(_path, '.', array_length(string_to_array(_path, '.'), 1)));
      IF _ext NOT IN ('jpg','jpeg','png','webp','avif','gif') THEN
        RAISE EXCEPTION 'Unsupported photo format: %. Allowed: JPG, PNG, WEBP, AVIF, GIF.', _ext;
      END IF;
      SELECT (o.metadata->>'size')::bigint INTO _size
        FROM storage.objects o
       WHERE o.bucket_id = 'product-images' AND o.name = _path;
      IF _size IS NULL THEN
        RAISE EXCEPTION 'Review photo could not be verified in storage.';
      END IF;
      IF _size > 5 * 1024 * 1024 THEN
        RAISE EXCEPTION 'Each review photo must be under 5MB.';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_review_trg ON public.product_reviews;
CREATE TRIGGER validate_product_review_trg
BEFORE INSERT OR UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_product_review();

-- Tighten review photo storage uploads
DROP POLICY IF EXISTS "Users can upload review photos" ON storage.objects;
CREATE POLICY "Users can upload review photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'reviews'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND lower(split_part(name, '.', array_length(string_to_array(name, '.'), 1)))
      IN ('jpg','jpeg','png','webp','avif','gif')
);
