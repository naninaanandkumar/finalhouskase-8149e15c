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

  const marqueeItems = [...banners, ...banners];

  return (
    <section className="w-full py-4 sm:py-6 bg-background">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Mobile: smooth continuous right-to-left marquee */}
        <div className="sm:hidden relative overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div
            className="flex gap-3 w-max animate-marquee hover:[animation-play-state:paused]"
            style={{ animationDuration: `${Math.max(14, banners.length * 3)}s` }}
          >
            {marqueeItems.map((banner, i) => (
              <CircleLink
                key={`${banner.id}-${i}`}
                to={banner.link}
                ariaLabel={banner.title}
                className="flex-shrink-0 w-[22vw] flex flex-col items-center gap-1.5"
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
