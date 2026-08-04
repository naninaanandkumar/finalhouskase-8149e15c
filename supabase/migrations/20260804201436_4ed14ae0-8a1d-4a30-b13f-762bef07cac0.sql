ALTER TABLE public.blog_posts REPLICA IDENTITY FULL;
ALTER TABLE public.family_testimonials REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.family_testimonials;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;