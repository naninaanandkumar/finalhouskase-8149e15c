import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import promoOffice from "@/assets/promo-office.jpg";
import promoTowels from "@/assets/promo-towels.jpg";
import promoSports from "@/assets/promo-sports.jpg";
import promoCleaning from "@/assets/promo-cleaning.jpg";
import promoTissues from "@/assets/promo-tissues.jpg";
import { SignedImage } from "@/components/common/SignedImage";
import { HeroTemplate, HeroCta, type HeroOverlayData } from "@/components/home/HeroOverlay";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  badge_label: string | null;
  cta_text: string | null;
  cta_link: string | null;
  overlay?: HeroOverlayData | null;
}

interface PromoBanner {
  id: string;
  title: string;
  offer_text: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  link: string | null;
}

const fallbackSlides: HeroSlide[] = [];

const fallbackBanners: PromoBanner[] = [];

const isExternalHref = (href: string) => /^(https?:)?\/\//i.test(href) || /^(mailto:|tel:|whatsapp:)/i.test(href);

function SmartLink({ to, className, children, ariaLabel }: { to?: string | null; className?: string; children?: ReactNode; ariaLabel?: string }) {
  const href = to?.trim();
  if (!href || href === "#") return <>{children}</>;
  if (isExternalHref(href)) {
    return <a href={href} className={className} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer">{children}</a>;
  }
  return <Link to={href} className={className} aria-label={ariaLabel}>{children}</Link>;
}

interface HeroSectionProps {
  onFetchStatus?: (section: string, failed: boolean) => void;
}

export function HeroSection({ onFetchStatus }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>(fallbackBanners);
  const [showPromoBanners, setShowPromoBanners] = useState(true);
  const [slider, setSlider] = useState({ autoplay: true, interval: 2800, loop: true });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const [slidesRes, bannersRes, settingsRes] = await Promise.all([
            supabase.from("hero_slides").select("*").order("sort_order"),
            supabase.from("promo_banners").select("*").order("sort_order"),
            supabase.from("site_settings").select("value").eq("key", "homepage").maybeSingle(),
          ]);

          if (!isMounted) return;

          if (slidesRes.data && slidesRes.data.length > 0) {
            setHeroSlides(slidesRes.data as HeroSlide[]);
          }
          if (bannersRes.data && bannersRes.data.length > 0) {
            const fetched = bannersRes.data as PromoBanner[];
            const fallbackFill = fallbackBanners.filter((fallback) => !fetched.some((banner) => banner.title.toLowerCase() === fallback.title.toLowerCase()));
            setPromoBanners([...fetched, ...fallbackFill].slice(0, 5));
          }
          setShowPromoBanners(true);

          const hasErrors = !!(slidesRes.error || bannersRes.error || settingsRes.error);
          onFetchStatus?.("hero", hasErrors);
          if (!hasErrors) break;

          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          }
        } catch (error) {
          console.error("Hero section fetch failed:", error);
          onFetchStatus?.("hero", true);
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          }
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (heroSlides.length < 2 || !slider.autoplay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = prev + 1;
        if (next >= heroSlides.length) return slider.loop ? 0 : prev;
        return next;
      });
    }, Math.max(1000, slider.interval || 2800));
    return () => clearInterval(timer);
  }, [heroSlides.length, slider.autoplay, slider.interval, slider.loop]);

  const goToSlide = (idx: number) => setCurrentSlide(idx);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const activeSlide = heroSlides[currentSlide] || heroSlides[0];

  return (
    <section className="w-full">
      {/* Hero Slider - responsive heights to match uploaded banner aspect on desktop */}
      {heroSlides.length > 0 && (
      <div
        className="relative w-full overflow-hidden h-[500px] md:h-auto md:aspect-[2171/724]"
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={heroSlides[currentSlide]?.id || currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <HeroTemplate
              data={(activeSlide?.overlay as HeroOverlayData) || { heading: activeSlide?.title }}
              imageNode={
                <>
                  {activeSlide?.mobile_image_url && (
                    <SignedImage
                      src={activeSlide.mobile_image_url}
                      alt={activeSlide?.title}
                      loading={currentSlide === 0 ? "eager" : "lazy"}
                      {...(currentSlide === 0 ? { fetchpriority: "high" as any } : {})}
                      className="block md:hidden absolute inset-0 w-full h-full bg-muted object-cover"
                    />
                  )}
                  <SignedImage
                    src={activeSlide?.image_url}
                    alt={activeSlide?.title}
                    loading={currentSlide === 0 ? "eager" : "lazy"}
                    {...(currentSlide === 0 ? { fetchpriority: "high" as any } : {})}
                    className={`${activeSlide?.mobile_image_url ? "hidden md:block" : "block"} absolute inset-0 w-full h-full bg-muted object-cover`}
                  />
                  {activeSlide?.cta_link && (
                    <SmartLink to={activeSlide.cta_link} ariaLabel={activeSlide.title} className="absolute inset-0 z-[1]" />
                  )}
                </>
              }
              ctaNode={
                activeSlide?.overlay?.cta_text || activeSlide?.cta_text ? (
                  <SmartLink to={activeSlide?.cta_link || "/products"}>
                    <HeroCta data={{ ...(activeSlide?.overlay || {}), cta_text: activeSlide?.overlay?.cta_text || activeSlide?.cta_text || "" }} />
                  </SmartLink>
                ) : null
              }
            />
          </motion.div>
        </AnimatePresence>

        {/* Nav Arrows removed per design */}

        {/* Dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === currentSlide}
              onClick={() => goToSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide ? "bg-accent w-6" : "bg-white/50 hover:bg-white/70 w-1.5"
              }`}
            />
          ))}
        </div>
      </div>
      )}

    </section>
  );
}
