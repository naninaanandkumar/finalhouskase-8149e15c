UPDATE public.site_settings
SET value = jsonb_set(value::jsonb, '{logoUrl}', to_jsonb('/__l5e/assets-v1/8804b781-7c18-4918-bca9-a8738f687cef/home.webp'::text)),
    updated_at = now()
WHERE key = 'store';