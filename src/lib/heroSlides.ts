import { emptyHeroOverlay, type HeroOverlayData } from "@/components/home/HeroOverlay";

export interface HeroSlideRecord {
  id?: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  badge_label?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  show_text?: boolean | null;
  show_buttons?: boolean | null;
  overlay?: HeroOverlayData | null;
}

export interface HeroSlidesBundle {
  kind: "houskase.hero_slides";
  version: 1;
  exported_at: string;
  slides: HeroSlideRecord[];
}

const pick = (s: any): HeroSlideRecord => ({
  title: String(s?.title ?? "Untitled"),
  subtitle: s?.subtitle ?? null,
  image_url: String(s?.image_url ?? ""),
  mobile_image_url: s?.mobile_image_url ?? null,
  badge_label: s?.badge_label ?? null,
  cta_text: s?.cta_text ?? "Shop Now",
  cta_link: s?.cta_link ?? "/products",
  sort_order: Number.isFinite(Number(s?.sort_order)) ? Number(s.sort_order) : 0,
  is_active: s?.is_active ?? true,
  show_text: s?.show_text ?? true,
  show_buttons: s?.show_buttons ?? true,
  overlay: { ...emptyHeroOverlay, ...(s?.overlay || {}) },
});

export function buildHeroBundle(slides: any[]): HeroSlidesBundle {
  return {
    kind: "houskase.hero_slides",
    version: 1,
    exported_at: new Date().toISOString(),
    slides: slides.map(pick),
  };
}

export function downloadHeroBundle(slides: any[], filename = "hero-slides.json") {
  const blob = new Blob([JSON.stringify(buildHeroBundle(slides), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parses a pasted/uploaded bundle. Accepts a bundle, an array, or a single slide. */
export function parseHeroBundle(text: string): HeroSlideRecord[] {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That is not valid JSON.");
  }
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.slides) ? raw.slides : raw && typeof raw === "object" ? [raw] : null;
  if (!list || list.length === 0) throw new Error("No hero slides found in this file.");
  const slides = list.filter((s: any) => s && typeof s === "object").map(pick);
  const missing = slides.filter((s) => !s.image_url).length;
  if (missing) throw new Error(`${missing} slide(s) have no image URL — export again from the source environment.`);
  return slides;
}

export interface HeroWarning {
  level: "warn" | "error";
  message: string;
}

/* ---------------- CTA link validation ---------------- */

export function validateCtaLink(link?: string | null): HeroWarning[] {
  const w: HeroWarning[] = [];
  const href = (link || "").trim();
  if (!href) {
    w.push({ level: "warn", message: "No button link set — the banner will fall back to /products." });
    return w;
  }
  if (href === "#") {
    w.push({ level: "error", message: 'Button link is "#" — clicking the banner will do nothing.' });
    return w;
  }
  if (/^(mailto:|tel:|whatsapp:)/i.test(href)) return w;
  if (/^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      if (!u.hostname.includes(".")) w.push({ level: "error", message: `"${href}" is not a valid web address.` });
      if (u.protocol === "http:") w.push({ level: "warn", message: "Link uses insecure http:// — prefer https://." });
    } catch {
      w.push({ level: "error", message: `"${href}" is not a valid URL.` });
    }
    return w;
  }
  if (!href.startsWith("/")) {
    w.push({ level: "error", message: `Internal links must start with "/" — got "${href}".` });
    return w;
  }
  if (/\s/.test(href)) w.push({ level: "error", message: "Link contains spaces — remove them or use %20." });
  const path = href.split("?")[0].split("#")[0];
  const known = ["/", "/products", "/about-us", "/blog", "/rfq", "/help", "/connect", "/dashboard", "/cart", "/checkout", "/login", "/signup", "/contact"];
  const dynamic = /^\/(products|blog|guides|category|page)\/[^/]+$/.test(path);
  if (!known.includes(path) && !dynamic) {
    w.push({ level: "warn", message: `"${path}" doesn't match a known storefront route — double-check it before publishing.` });
  }
  return w;
}

/* ---------------- Contrast / readability ---------------- */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(rgb: [number, number, number]) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number | null {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return null;
  const la = luminance(ra);
  const lb = luminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Readability checks for the overlay: contrast of accent-on-white button text,
 * accent vs the assumed banner backdrop, and rendered font sizes at the
 * desktop (1440px) and tablet (768px) breakpoints.
 */
export function validateHeroAccessibility(data: HeroOverlayData): HeroWarning[] {
  const w: HeroWarning[] = [];
  if (!data?.enabled) return w;

  const accent = data.accent || "#C8102E";
  if (!hexToRgb(accent)) {
    w.push({ level: "error", message: `Accent colour "${accent}" is not a valid hex colour.` });
    return w;
  }

  // Button + tagline bar render white text on the accent fill.
  const onAccent = contrastRatio(accent, "#ffffff") ?? 21;
  if (onAccent < 3) {
    w.push({ level: "error", message: `White button/tagline text on the accent colour has only ${onAccent.toFixed(1)}:1 contrast — use a darker accent (needs 4.5:1).` });
  } else if (onAccent < 4.5) {
    w.push({ level: "warn", message: `White text on the accent colour is ${onAccent.toFixed(1)}:1 — readable at large sizes only, darken the accent for small text.` });
  }

  // Body copy sits on the artwork; theme picks the assumed backdrop.
  const light = data.theme === "light";
  const body = light ? "#ffffff" : "#1A1A1A";
  const assumedBg = light ? "#1A1A1A" : "#ffffff";
  const bodyContrast = contrastRatio(body, assumedBg) ?? 21;
  if (bodyContrast < 4.5) {
    w.push({ level: "warn", message: "Body text contrast is low for the selected theme — switch the text theme or crop to a plainer part of the image." });
  }
  const accentOnBg = contrastRatio(accent, assumedBg) ?? 21;
  if (accentOnBg < 3) {
    w.push({ level: "warn", message: `The brand line uses the accent colour and only reaches ${accentOnBg.toFixed(1)}:1 against a ${light ? "dark" : "light"} banner — pick a stronger accent.` });
  }

  // Rendered sizes: clamp(min, vw, max) evaluated at 768px (tablet) in px.
  const tabletPx = (vw: number, min: number, max: number) => Math.min(Math.max((vw / 100) * 768, min * 16), max * 16);
  const featureSize = tabletPx(0.95, 0.55, 1);
  if ((data.features || []).some((f) => f?.label?.trim()) && featureSize < 12) {
    w.push({ level: "warn", message: `Feature point text renders at ~${featureSize.toFixed(0)}px on tablet — below the 12px readable minimum. Shorten labels or reduce the number of points.` });
  }
  const ctaSize = tabletPx(1.05, 0.6, 1.05);
  if ((data.cta_text || "").trim() && ctaSize < 12) {
    w.push({ level: "warn", message: `Button label renders at ~${ctaSize.toFixed(0)}px on tablet — consider a shorter label so it can scale up.` });
  }
  const subSize = tabletPx(2, 0.85, 2.1);
  if ((data.subheading || "").trim() && subSize < 14) {
    w.push({ level: "warn", message: "Short description renders very small on tablet — move key wording into the heading." });
  }
  if (light && !data.tagline && !data.brand) {
    w.push({ level: "warn", message: "Light text has no coloured backing element — make sure the artwork behind the text is dark enough." });
  }
  return w;
}

/**
 * Layout guard rails for the 2172x724 artwork. Limits are derived from the
 * rendered clamp() font sizes at desktop (1440px) and tablet (768px) widths.
 */
export function validateHeroOverlay(data: HeroOverlayData): HeroWarning[] {
  const w: HeroWarning[] = [];
  if (!data?.enabled) return w;

  const width = data.width || 46;
  const headingLines = (data.heading || "").split("\n");
  const longest = headingLines.reduce((a, l) => Math.max(a, l.trim().length), 0);
  // ~26 chars fit at 46% width; scales linearly with the content width slider.
  const headingLimit = Math.round((width / 46) * 26);
  if (longest > headingLimit) {
    w.push({ level: "error", message: `Heading line is ${longest} characters — keep it under ${headingLimit} or it will overflow on tablet. Press Enter to split it, or widen the content.` });
  }
  if (headingLines.length > 3) {
    w.push({ level: "warn", message: `Heading has ${headingLines.length} lines — more than 3 pushes the feature points off the banner.` });
  }
  if ((data.brand || "").length > Math.round((width / 46) * 22)) {
    w.push({ level: "warn", message: "Brand line is long and may wrap on tablet." });
  }
  if ((data.subheading || "").split("\n").some((l) => l.length > Math.round((width / 46) * 34))) {
    w.push({ level: "warn", message: "Short description line is long — it may wrap onto a third line." });
  }
  if ((data.tagline || "").length > Math.round((width / 46) * 44)) {
    w.push({ level: "error", message: "Tagline bar is too long and will run past the banner edge on tablet." });
  }

  const features = (data.features || []).filter((f) => f?.label?.trim());
  if (features.length > 4) {
    w.push({ level: "error", message: `${features.length} feature points — a maximum of 4 fits inside the safe area.` });
  }
  const perPoint = features.length ? Math.max(10, Math.round(((width / 46) * 68) / Math.max(features.length, 1))) : 0;
  const tooLong = features.filter((f) => f.label.trim().length > perPoint);
  if (tooLong.length) {
    w.push({ level: "warn", message: `Feature point text is long (${tooLong.map((f) => `"${f.label.trim()}"`).join(", ")}) — keep each under ~${perPoint} characters so icons stay aligned.` });
  }

  const cta = (data.cta_text || "").trim();
  if (cta.length > 22) {
    w.push({ level: "error", message: "Button text is too long — keep it under 22 characters." });
  }

  // Total vertical budget check (in em units of the heading scale).
  const blocks =
    (data.brand ? 1 : 0) + headingLines.length + (data.subheading ? (data.subheading.split("\n").length) : 0) + (data.tagline ? 1 : 0) + (features.length ? 2 : 0) + (cta ? 1.4 : 0);
  if (blocks > 8) {
    w.push({ level: "error", message: "Too much content stacked vertically — remove a block or the banner will clip top and bottom on tablet." });
  }
  return w;
}