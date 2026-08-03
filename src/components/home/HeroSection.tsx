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

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  badge_label: string | null;
  cta_text: string | null;
  cta_link: string | null;
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

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const [slidesRes, bannersRes, settingsRes] = await Promise.all([
            supabase.from("hero_slides").select("*").eq("is_active", true).order("sort_order"),
            supabase.from("promo_banners").select("*").eq("is_active", true).order("sort_order"),
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
    if (heroSlides.length < 2) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

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
            {activeSlide?.mobile_image_url && (
              <SignedImage
                src={activeSlide.mobile_image_url}
                alt={activeSlide?.title}
                loading={currentSlide === 0 ? "eager" : "lazy"}
                {...(currentSlide === 0 ? { fetchpriority: "high" as any } : {})}
                className="block md:hidden w-full h-full bg-muted object-cover"
              />
            )}
            <SignedImage
              src={activeSlide?.image_url}
              alt={activeSlide?.title}
              loading={currentSlide === 0 ? "eager" : "lazy"}
              {...(currentSlide === 0 ? { fetchpriority: "high" as any } : {})}
              className={`${activeSlide?.mobile_image_url ? "hidden md:block" : "block"} w-full h-full bg-muted object-cover`}
            />
            {activeSlide?.cta_link && (
              <SmartLink to={activeSlide.cta_link} ariaLabel={activeSlide.title} className="absolute inset-0 z-[1]" />
            )}
            
            <div className="absolute inset-0 z-[2] flex items-center py-4 sm:py-6 md:py-8 pointer-events-none" style={{ paddingLeft: "max(0.75rem, env(safe-area-inset-left))", paddingRight: "max(0.75rem, env(safe-area-inset-right))" }}>
              <div className="container mx-auto px-3 sm:px-4 md:px-6">
                <div className="max-w-[min(34rem,92vw)] pointer-events-auto">

                  {(activeSlide as any)?.show_buttons !== false && (
                    <SmartLink to={activeSlide?.cta_link || "/products"}>
                      <Button size="sm" className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg h-8 sm:h-9 text-xs sm:text-sm">
                        {activeSlide?.cta_text || "Shop Now"}
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </SmartLink>
                  )}
                </div>
              </div>
            </div>
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

function MobilePromoCircles({ banners }: { banners: PromoBanner[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (banners.length <= 4) return;
    const el = scrollerRef.current;
    if (!el) return;
    const itemWidth = el.scrollWidth / banners.length;
    let idx = 0;
    const id = setInterval(() => {
      if (!el) return;
      idx = (idx + 1) % banners.length;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const target = idx * itemWidth;
      if (target > maxScroll + 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        idx = 0;
      } else {
        el.scrollTo({ left: target, behavior: "smooth" });
      }
    }, 2500);
    return () => clearInterval(id);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="sm:hidden">
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-1 py-2 [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((banner) => (
          <SmartLink
            key={banner.id}
            to={banner.link || "/products"}
            className="flex-shrink-0 w-[calc(25%-9px)] snap-start flex flex-col items-center gap-1.5"
          >
            <div className="relative w-full aspect-square rounded-full overflow-hidden ring-2 ring-accent/30 bg-secondary">
              <SignedImage
                src={banner.mobile_image_url || banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[10px] font-semibold text-foreground leading-tight text-center line-clamp-2 w-full">
              {banner.title}
            </p>
          </SmartLink>
        ))}
      </div>
    </div>
  );
}
