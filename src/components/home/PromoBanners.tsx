import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/common/SignedImage";

const isExternalHref = (href: string) => /^(https?:)?\/\//i.test(href) || /^(mailto:|tel:|whatsapp:)/i.test(href);

interface PromoBanner {
  id: string;
  title: string;
  offer_text: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  link: string | null;
}

interface PromoBannersProps {
  onFetchStatus?: (status: string) => void;
}

function CircleLink({
  to,
  className,
  children,
  ariaLabel,
}: {
  to?: string | null;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const href = to?.trim() || "/products";
  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

export const PromoBanners = ({ onFetchStatus }: PromoBannersProps) => {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      onFetchStatus?.("loading");
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        onFetchStatus?.("error");
        return;
      }
      setBanners((data || []) as PromoBanner[]);
      onFetchStatus?.("success");
    })();
  }, [onFetchStatus]);

  useEffect(() => {
    if (banners.length <= 4) return;
    const el = scrollerRef.current;
    if (!el) return;
    const itemWidth = el.scrollWidth / banners.length;
    let idx = 0;
    const id = setInterval(() => {
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

  if (banners.length === 0) return null;

  return (
    <section className="w-full py-4 sm:py-6 bg-background">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Mobile: auto-scrolling circles */}
        <div
          ref={scrollerRef}
          className="sm:hidden flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-1 py-1 [&::-webkit-scrollbar]:hidden"
        >
          {banners.map((banner) => (
            <CircleLink
              key={banner.id}
              to={banner.link}
              ariaLabel={banner.title}
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
            </CircleLink>
          ))}
        </div>

        {/* Tablet + Desktop: identical circle grid, 15px gap */}
        <div className="hidden sm:flex flex-wrap items-start justify-center gap-[15px]">
          {banners.map((banner) => (
            <CircleLink
              key={banner.id}
              to={banner.link}
              ariaLabel={banner.title}
              className="group flex w-[120px] lg:w-[140px] flex-col items-center gap-2"
            >
              <div className="relative w-[110px] h-[110px] lg:w-[130px] lg:h-[130px] rounded-full overflow-hidden ring-2 ring-accent/30 bg-secondary transition-transform duration-300 group-hover:scale-105">
                <SignedImage
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs font-semibold text-foreground text-center leading-tight line-clamp-2">
                {banner.title}
              </p>
              {banner.offer_text && (
                <p className="text-[11px] font-medium text-accent text-center leading-tight line-clamp-1">
                  {banner.offer_text}
                </p>
              )}
            </CircleLink>
          ))}
        </div>

      </div>
    </section>
  );
};
