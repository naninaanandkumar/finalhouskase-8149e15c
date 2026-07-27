DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
TO public
USING (
  key = ANY (ARRAY[
    'store'::text,
    'homepage'::text,
    'bottom_menu'::text,
    'store_name'::text,
    'store_logo'::text,
    'store_tagline'::text,
    'store_description'::text,
    'store_phone'::text,
    'store_email'::text,
    'store_address'::text,
    'currency'::text,
    'theme'::text,
    'social_links'::text,
    'footer_text'::text,
    'whatsapp_number'::text,
    'support_email'::text,
    'seo_settings'::text,
    'homepage_layout'::text,
    'store_favicon'::text,
    'page_privacy_policy'::text,
    'page_terms_of_service'::text,
    'page_payment_terms'::text,
    'page_shipping_delivery'::text,
    'page_shipping_policy'::text,
    'page_return_policy'::text
  ])
);