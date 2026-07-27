import { supabase } from "@/integrations/supabase/client";

const PRODUCT_BUCKET = "product-images";
const cache = new Map<string, Promise<string>>();

export function isProductBucketUrl(url?: string | null) {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${PRODUCT_BUCKET}/`) || url.includes(`/storage/v1/object/sign/${PRODUCT_BUCKET}/`);
}

export function getProductStoragePathFromUrl(url?: string | null) {
  if (!url) return null;
  const markers = [
    `/storage/v1/object/public/${PRODUCT_BUCKET}/`,
    `/storage/v1/object/sign/${PRODUCT_BUCKET}/`,
  ];
  for (const marker of markers) {
    const index = url.indexOf(marker);
    if (index >= 0) {
      const path = url.slice(index + marker.length).split("?")[0];
      return decodeURIComponent(path || "") || null;
    }
  }
  return null;
}

export async function getSignedImageUrl(url?: string | null): Promise<string> {
  if (!url || !isProductBucketUrl(url)) return url || "";

  const cached = cache.get(url);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const path = getProductStoragePathFromUrl(url);
      if (!path) return url;
      const { data, error } = await supabase.storage
        .from(PRODUCT_BUCKET)
        .createSignedUrl(path, 60 * 60 * 12);
      if (error || !data?.signedUrl) return url;
      return data.signedUrl;
    } catch (error) {
      console.warn("Signed image fallback failed", error);
      return url;
    }
  })();

  cache.set(url, promise);
  return promise;
}

export async function getSignedImageUrls(urls?: (string | null | undefined)[] | null): Promise<string[]> {
  if (!urls?.length) return [];
  return Promise.all(urls.filter(Boolean).map((url) => getSignedImageUrl(url)));
}
