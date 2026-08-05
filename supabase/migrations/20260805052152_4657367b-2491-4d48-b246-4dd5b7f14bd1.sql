CREATE OR REPLACE FUNCTION public.validate_product_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean := (_uid IS NOT NULL AND (public.is_admin(_uid) OR public.is_super_admin()));
  _photo text;
  _path text;
  _size bigint;
BEGIN
  -- Service role / internal calls (no JWT) are trusted.
  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT _is_admin THEN
    -- Ownership: a shopper may only write rows attached to their own account.
    IF TG_OP = 'INSERT' THEN
      IF NEW.user_id IS DISTINCT FROM _uid THEN
        RAISE EXCEPTION 'You can only submit reviews as yourself.';
      END IF;
      NEW.is_approved := false;
      NEW.is_verified := COALESCE(NEW.is_verified, false) AND false;
    ELSE
      IF OLD.user_id IS DISTINCT FROM _uid THEN
        RAISE EXCEPTION 'You can only modify your own review.';
      END IF;
      NEW.user_id := OLD.user_id;
      NEW.product_id := OLD.product_id;
      NEW.is_verified := OLD.is_verified;
      NEW.created_at := OLD.created_at;
      -- Any shopper edit sends the review back for moderation.
      NEW.is_approved := false;
    END IF;
  END IF;

  IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5.';
  END IF;
  IF btrim(COALESCE(NEW.reviewer_name, '')) = '' OR length(NEW.reviewer_name) > 80 THEN
    RAISE EXCEPTION 'Reviewer name must be 1-80 characters.';
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
        RAISE EXCEPTION 'Review photos must be uploaded through the review form.';
      END IF;
      IF _path NOT LIKE 'reviews/' || _uid::text || '/%' THEN
        RAISE EXCEPTION 'Review photos must be uploaded to your own review folder.';
      END IF;
      IF lower(_path) !~ '\.(jpe?g|png|webp|avif|gif)$' THEN
        RAISE EXCEPTION 'Review photos must be JPG, PNG, WEBP, AVIF or GIF files.';
      END IF;
      SELECT (o.metadata->>'size')::bigint INTO _size
      FROM storage.objects o
      WHERE o.bucket_id = 'product-images' AND o.name = _path;
      IF _size IS NULL THEN
        RAISE EXCEPTION 'Review photo could not be found in storage.';
      END IF;
      IF _size > 5 * 1024 * 1024 THEN
        RAISE EXCEPTION 'Each review photo must be 5 MB or smaller.';
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