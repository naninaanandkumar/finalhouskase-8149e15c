import type { ReactNode } from "react";
import {
  Droplets,
  Ban,
  Recycle,
  Waves,
  Leaf,
  Shield,
  Sparkles,
  Feather,
  ThumbsUp,
  Star,
  Truck,
  BadgeCheck,
  Heart,
  Wind,
  ArrowRight,
} from "lucide-react";

export const HERO_ICONS = {
  droplets: Droplets,
  ban: Ban,
  recycle: Recycle,
  waves: Waves,
  leaf: Leaf,
  shield: Shield,
  sparkles: Sparkles,
  feather: Feather,
  thumbsup: ThumbsUp,
  star: Star,
  truck: Truck,
  badge: BadgeCheck,
  heart: Heart,
  wind: Wind,
} as const;

export type HeroIconKey = keyof typeof HERO_ICONS;

export interface HeroFeature {
  icon: HeroIconKey | string;
  label: string;
}

/** Crop / zoom of the background artwork inside the 2172x724 safe area. */
export interface HeroImageCrop {
  zoom?: number; // 1 = fit, up to 2.5
  x?: number; // object-position X in %
  y?: number; // object-position Y in %
}

export interface HeroOverlayData {
  enabled?: boolean;
  brand?: string;
  heading?: string;
  subheading?: string;
  tagline?: string;
  features?: HeroFeature[];
  cta_text?: string;
  theme?: "dark" | "light";
  accent?: string;
  width?: number; // percentage of banner width
  crop?: HeroImageCrop;
  mobile_crop?: HeroImageCrop;
}

export const emptyHeroOverlay: HeroOverlayData = {
  enabled: false,
  brand: "",
  heading: "",
  subheading: "",
  tagline: "",
  features: [],
  cta_text: "",
  theme: "dark",
  accent: "#C8102E",
  width: 46,
  crop: { zoom: 1, x: 50, y: 50 },
  mobile_crop: { zoom: 1, x: 50, y: 50 },
};

/** Inline style that applies a crop/zoom to a hero background image. */
export function heroCropStyle(crop?: HeroImageCrop | null) {
  const zoom = Math.min(Math.max(crop?.zoom ?? 1, 1), 2.5);
  return {
    objectPosition: `${crop?.x ?? 50}% ${crop?.y ?? 50}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    transformOrigin: `${crop?.x ?? 50}% ${crop?.y ?? 50}%`,
  } as const;
}

/**
 * Renders the editable left-side banner content (brand, heading, tagline bar,
 * icon feature grid with vertical dividers and CTA) on top of a hero image.
 * Everything scales with the banner width so it matches the 2172x724 artwork.
 */
export function HeroOverlay({
  data,
  ctaNode,
}: {
  data: HeroOverlayData;
  ctaNode?: ReactNode;
}) {
  if (!data?.enabled) return null;

  const accent = data.accent || "#C8102E";
  const light = data.theme === "light";
  const bodyColor = light ? "#ffffff" : "#1A1A1A";
  const features = (data.features || []).filter((f) => f?.label?.trim());

  return (
    <div
      className="absolute inset-y-0 left-0 z-[2] flex items-center pointer-events-none"
      style={{
        paddingLeft: "clamp(1rem, 6%, 7rem)",
        paddingRight: "1rem",
        width: `${data.width || 46}%`,
        minWidth: "min(88%, 32rem)",
        maxWidth: "92%",
      }}
    >
      <div className="pointer-events-auto w-full" style={{ color: bodyColor }}>
        {data.brand && (
          <p
            className="font-display font-extrabold uppercase leading-none tracking-tight"
            style={{ color: accent, fontSize: "clamp(1.25rem, 3.1vw, 3.4rem)" }}
          >
            {data.brand}
          </p>
        )}

        {data.heading && (
          <h2
            className="font-display font-extrabold uppercase leading-[1.05] tracking-tight whitespace-pre-line"
            style={{ fontSize: "clamp(1.15rem, 2.9vw, 3.1rem)", marginTop: "0.15em" }}
          >
            {data.heading}
          </h2>
        )}

        {data.subheading && (
          <p
            className="font-display uppercase leading-tight tracking-tight whitespace-pre-line"
            style={{ fontSize: "clamp(0.85rem, 2vw, 2.1rem)", marginTop: "0.1em", opacity: 0.92 }}
          >
            {data.subheading}
          </p>
        )}

        {data.tagline && (
          <span
            className="inline-block font-semibold uppercase tracking-wide text-white"
            style={{
              background: accent,
              marginTop: "0.7em",
              padding: "0.4em 0.9em",
              fontSize: "clamp(0.6rem, 1.15vw, 1.15rem)",
            }}
          >
            {data.tagline}
          </span>
        )}

        {features.length > 0 && (
          <div
            className="flex items-stretch"
            style={{
              marginTop: "1em",
              borderTop: `1px solid ${light ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.15)"}`,
              paddingTop: "1em",
            }}
          >
            {features.map((f, i) => {
              const Icon = HERO_ICONS[(f.icon as HeroIconKey) in HERO_ICONS ? (f.icon as HeroIconKey) : "sparkles"];
              return (
                <div
                  key={i}
                  className="flex flex-col items-center text-center justify-start"
                  style={{
                    flex: 1,
                    padding: "0 clamp(0.25rem, 0.9vw, 1rem)",
                    borderLeft: i === 0 ? "none" : `1px solid ${light ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.15)"}`,
                  }}
                >
                  <Icon
                    style={{
                      color: accent,
                      width: "clamp(1.1rem, 2.1vw, 2.2rem)",
                      height: "clamp(1.1rem, 2.1vw, 2.2rem)",
                    }}
                    strokeWidth={2.2}
                  />
                  <span
                    className="font-semibold leading-tight"
                    style={{ marginTop: "0.5em", fontSize: "clamp(0.55rem, 0.95vw, 1rem)" }}
                  >
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {ctaNode !== undefined
          ? ctaNode
          : data.cta_text && (
              <span
                className="inline-flex items-center gap-2 font-semibold uppercase tracking-wide text-white"
                style={{
                  background: accent,
                  marginTop: "1.1em",
                  padding: "0.6em 1.4em",
                  fontSize: "clamp(0.6rem, 1.05vw, 1.05rem)",
                }}
              >
                {data.cta_text}
                <ArrowRight style={{ width: "1.2em", height: "1.2em" }} />
              </span>
            )}
      </div>
    </div>
  );
}