import { useEffect, useState } from "react";
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

  if (banners.length === 0) return null;

  // Duplicate the list so the right-to-left marquee loops seamlessly.
  const loop = [...banners, ...banners];

  return (
    <section className="w-full py-4 sm:py-6 bg-background">
      <div className="container mx-auto px-3 sm:px-4 overflow-hidden marquee-track">
        {/* Smooth continuous right-to-left slider: 4 visible on phone, 5 on tablet, 7 on desktop */}
        <div className="flex w-max animate-marquee-slow gap-3 sm:gap-[15px]">
          {loop.map((banner, i) => (
            <CircleLink
              key={`${banner.id}-${i}`}
              to={banner.link}
              ariaLabel={banner.title}
              className="group flex flex-col items-center gap-1.5 sm:gap-2 flex-shrink-0 w-[calc((100vw-24px-36px)/4)] sm:w-[calc((100vw-32px-60px)/5)] lg:w-[140px]"
            >
              <div className="relative w-full aspect-square rounded-full overflow-hidden ring-2 ring-accent/30 bg-secondary transition-transform duration-300 group-hover:scale-105">
                <SignedImage
                  src={banner.mobile_image_url || banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-foreground text-center leading-tight line-clamp-2 w-full">
                {banner.title}
              </p>
              {banner.offer_text && (
                <p className="hidden sm:block text-[11px] font-medium text-accent text-center leading-tight line-clamp-1">
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
