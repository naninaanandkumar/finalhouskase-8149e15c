type EventParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Lightweight analytics sink. Forwards to gtag/dataLayer when present and
 * always emits a DOM CustomEvent so other listeners can subscribe.
 */
export function trackEvent(name: string, params: EventParams = {}) {
  try {
    if (typeof window === "undefined") return;
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, ...params });
    }
    window.dispatchEvent(new CustomEvent("app-analytics", { detail: { name, params } }));
  } catch {
    /* analytics must never break the UI */
  }
}

export const ReviewAnalytics = {
  modalOpen: (productId: string, mode: "new" | "edit") =>
    trackEvent("review_modal_open", { product_id: productId, mode }),
  starSelect: (productId: string, rating: number) =>
    trackEvent("review_star_select", { product_id: productId, rating }),
  photoUpload: (productId: string, count: number, totalPhotos: number) =>
    trackEvent("review_photo_upload", { product_id: productId, uploaded: count, total_photos: totalPhotos }),
  submit: (productId: string, data: { rating: number; mode: "new" | "edit"; photos: number; has_text: boolean }) =>
    trackEvent("review_submit", { product_id: productId, ...data }),
  submitSuccess: (productId: string, data: { rating: number; mode: "new" | "edit"; photos: number; pending: boolean }) =>
    trackEvent("review_submit_success", { product_id: productId, ...data }),
  submitError: (productId: string, message: string) =>
    trackEvent("review_submit_error", { product_id: productId, message }),
};
