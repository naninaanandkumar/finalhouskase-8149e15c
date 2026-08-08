import type { ReactNode } from "react";
import {
  Droplets, Ban, Recycle, Waves, Leaf, Shield, Sparkles, Feather,
  ThumbsUp, Star, Truck, BadgeCheck, Heart, Wind, ArrowRight,
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

/** Content-only model — the layout itself is fixed and never editable. */
export interface HeroOverlayData {
  enabled?: boolean;
  brand?: string;
  heading?: string;
  subheading?: string;
  tagline?: string;
  features?: HeroFeature[];
  cta_text?: string;
  theme?: "dark" | "light";
  /** Primary theme colour (brand line + icons + ribbon). */
  accent?: string;
  /** Secondary theme colour (title / body text). */
  secondary?: string;
  /** CTA button colour. */
  button_color?: string;
  align?: "left" | "center" | "right";
  badge_enabled?: boolean;
  badge_number?: string;
  badge_text?: string;
  /** Transparent product PNG shown on the right. */
  product_png?: string;
}

export const emptyHeroOverlay: HeroOverlayData = {
  enabled: true,
  brand: "",
  heading: "",
  subheading: "",
  tagline: "",
  features: [],
  cta_text: "",
  theme: "dark",
  accent: "#B40000",
  secondary: "#111111",
  button_color: "#C30000",
  align: "left",
  badge_enabled: false,
  badge_number: "",
  badge_text: "",
  product_png: "",
};

export const heroHasContent = (d?: HeroOverlayData | null) => true;

/**
 * Fixed premium hero template. Admins only supply content — spacing, sizing and
 * positioning are identical for every slide. Sizes use container query units so
 * the admin preview and the storefront render pixel-identically.
 */
export function HeroTemplate({
  data,
  ctaNode,
  imageNode,
}: {
  data: HeroOverlayData;
  ctaNode?: ReactNode;
  imageNode?: ReactNode;
}) {
  if (!heroHasContent(data)) return <>{imageNode}</>;

  const accent = data.accent || "#B40000";
  const text = data.theme === "light" ? "#ffffff" : data.secondary || "#111111";
  const btn = data.button_color || accent;
  const align = data.align || "left";
  const features = (data.features || []).filter((f) => f?.label?.trim()).slice(0, 4);
  const items = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <div className="absolute inset-0 hero-template-content" style={{ containerType: "inline-size" }}>
      {imageNode}

      {/* Right — transparent product PNG floating with a soft shadow */}
      {data.product_png && (
        <img
          src={data.product_png}
          alt={data.heading || "Product"}
          loading="lazy"
          decoding="async"
          className="absolute z-[2] object-contain"
          style={{
            right: "4cqw",
            bottom: "4cqw",
            top: "8cqw",
            maxWidth: "40cqw",
            filter: "drop-shadow(0 1.2cqw 1.6cqw rgba(0,0,0,.28))",
          }}
        />
      )}

      {/* Offer badge — top right */}
      {data.badge_enabled && (data.badge_number || data.badge_text) && (
        <div
          className="absolute z-[4] flex flex-col items-center justify-center rounded-full bg-white text-center"
          style={{
            top: "6cqw",
            right: "3cqw",
            width: "11cqw",
            height: "11cqw",
            border: `0.25cqw solid ${accent}`,
            color: accent,
            boxShadow: "0 0.4cqw 1cqw rgba(0,0,0,.18)",
          }}
        >
          <span className="font-display font-extrabold leading-none" style={{ fontSize: "clamp(18px, 3.4cqw, 60px)" }}>
            {data.badge_number}
          </span>
          <span className="font-semibold uppercase leading-tight" style={{ fontSize: "clamp(6px, 1cqw, 16px)", marginTop: "0.4cqw", padding: "0 1cqw" }}>
            {data.badge_text}
          </span>
        </div>
      )}

      {/* Left — all text content */}
      <div
        className="absolute inset-y-0 z-[3] flex flex-col justify-center pointer-events-none"
        style={{
          left: align === "right" ? "auto" : align === "center" ? "50%" : "5cqw",
          right: align === "right" ? "5cqw" : "auto",
          transform: align === "center" ? "translateX(-50%)" : undefined,
          width: "52cqw",
          alignItems: items,
          textAlign: align,
          color: text,
        }}
      >
        {data.brand && (
          <p className="font-display font-extrabold uppercase leading-none tracking-tight"
            style={{ color: accent, fontSize: "clamp(16px, 3.1cqw, 56px)" }}>
            {data.brand}
          </p>
        )}

        {data.heading && (
          <h2 className="font-display font-extrabold uppercase leading-[1.04] tracking-tight whitespace-pre-line"
            style={{ fontSize: "clamp(20px, 4.4cqw, 78px)", marginTop: "0.6cqw" }}>
            {data.heading}
          </h2>
        )}

        {data.subheading && (
          <p className="font-display uppercase leading-tight tracking-tight whitespace-pre-line"
            style={{ fontSize: "clamp(13px, 2.5cqw, 44px)", marginTop: "0.4cqw", opacity: 0.95 }}>
            {data.subheading}
          </p>
        )}

        {/* Red ribbon behind the short description */}
        {data.tagline && (
          <span className="inline-block font-semibold uppercase tracking-wide text-white"
            style={{ background: accent, marginTop: "1.6cqw", padding: "0.7cqw 1.4cqw", fontSize: "clamp(9px, 1.5cqw, 26px)" }}>
            {data.tagline}
          </span>
        )}

        {features.length > 0 && (
          <div className="flex items-start" style={{ marginTop: "2.4cqw", gap: "1.6cqw" }}>
            {features.map((f, i) => {
              const Icon = HERO_ICONS[(f.icon as HeroIconKey) in HERO_ICONS ? (f.icon as HeroIconKey) : "sparkles"];
              return (
                <div key={i} className="flex flex-col items-center text-center" style={{ width: "9cqw" }}>
                  <span className="flex items-center justify-center rounded-full"
                    style={{ background: accent, width: "4.6cqw", height: "4.6cqw" }}>
                    <Icon color="#ffffff" strokeWidth={2.2} style={{ width: "2.4cqw", height: "2.4cqw" }} />
                  </span>
                  <span className="font-semibold leading-tight"
                    style={{ marginTop: "0.8cqw", fontSize: "clamp(8px, 1.15cqw, 20px)" }}>
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {ctaNode !== undefined
          ? <div className="pointer-events-auto" style={{ marginTop: "2.4cqw" }}>{ctaNode}</div>
          : data.cta_text && (
              <span className="inline-flex items-center font-semibold uppercase tracking-wide text-white"
                style={{ background: btn, marginTop: "2.4cqw", padding: "1cqw 2cqw", gap: "0.8cqw", fontSize: "clamp(9px, 1.4cqw, 24px)" }}>
                {data.cta_text}
                <ArrowRight style={{ width: "1.2em", height: "1.2em" }} />
              </span>
            )}
      </div>
    </div>
  );
}

/** Premium CTA button with hover animation, used by the storefront. */
export function HeroCta({ data }: { data: HeroOverlayData }) {
  const btn = data.button_color || data.accent || "#C30000";
  return (
    <span
      className="group inline-flex items-center font-semibold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-[2px] hover:shadow-lg"
      style={{ background: btn, padding: "1cqw 2cqw", gap: "0.8cqw", fontSize: "clamp(9px, 1.4cqw, 24px)" }}
    >
      {data.cta_text}
      <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" style={{ width: "1.2em", height: "1.2em" }} />
    </span>
  );
}
