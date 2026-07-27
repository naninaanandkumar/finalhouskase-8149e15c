// Real User Monitoring (RUM) for Core Web Vitals.
// Reports LCP, CLS, INP, FCP, TTFB to the console (dev) and dispatches a
// `web-vital` CustomEvent so anything can subscribe (e.g. an analytics sink).
// Kept lightweight and non-blocking — imported dynamically after hydration.

import type { Metric } from "web-vitals";

function report(metric: Metric) {
  // Dispatch a global event so the app / an admin dashboard can listen.
  try {
    window.dispatchEvent(new CustomEvent("web-vital", { detail: metric }));
  } catch {
    // ignore
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(
      `[web-vitals] ${metric.name} = ${metric.value.toFixed(2)} (${metric.rating})`,
    );
  }
}

export async function initWebVitals() {
  if (typeof window === "undefined") return;
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import("web-vitals");
    onLCP(report);
    onCLS(report);
    onINP(report);
    onFCP(report);
    onTTFB(report);
  } catch {
    // web-vitals not available — fail silently
  }
}
