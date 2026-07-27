
-- Fix site_settings policy: add all keys the app actually uses
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
USING (key IN (
  'store', 'homepage', 'bottom_menu',
  'store_name', 'store_logo', 'store_tagline', 'store_description',
  'store_phone', 'store_email', 'store_address',
  'currency', 'theme', 'social_links', 'footer_text',
  'whatsapp_number', 'support_email', 'seo_settings',
  'homepage_layout', 'store_favicon',
  'page_privacy_policy', 'page_terms_of_service',
  'page_payment_terms', 'page_shipping_delivery'
));
