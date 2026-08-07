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