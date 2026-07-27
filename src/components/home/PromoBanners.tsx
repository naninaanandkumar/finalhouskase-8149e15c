import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/common/SignedImage";

const isExternalHref = (href: string) => /^(https?:)?\/\//i.test(href) || /^(mailto:|tel:|whatsapp:)/i.test(href);

interface PromoBanner {
  id: string;
  title: string;
  offer_text: string | null;
  image_url: string;
  link: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface PromoBannersProps {
  onFetchStatus?: (status: string) => void;
}

export const PromoBanners = ({ onFetchStatus }: PromoBannersProps) => {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromoBanners = async () => {
      try {
        setLoading(true);
        onFetchStatus?.("loading");

        const { data, error: fetchError } = await supabase
          .from("promo_banners")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (fetchError) {
          console.error("Error fetching promo banners:", fetchError);
          setError(fetchError.message);
          onFetchStatus?.("error");
          return;
        }

        setBanners(data || []);
        onFetchStatus?.("success");
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Failed to load promo banners");
        onFetchStatus?.("error");
      } finally {
        setLoading(false);
      }
    };

    fetchPromoBanners();
  }, [onFetchStatus]);

  if (loading) {
    return (
      <section className="w-full py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-48 md:h-64 bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || banners.length === 0) {
    return null;
  }

  // Display banners in a responsive grid
  return (
    <section className="w-full py-8 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className={`grid gap-4 ${banners.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
          {banners.map((banner) => (
            <a
              key={banner.id}
              href={banner.link || "#"}
              target={banner.link && isExternalHref(banner.link) ? "_blank" : undefined}
              rel={banner.link && isExternalHref(banner.link) ? "noopener noreferrer" : undefined}
              className="group relative overflow-hidden rounded-lg block h-48 md:h-64"
            >
              <SignedImage
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
              {banner.title && (
                <div className="absolute inset-0 flex flex-col justify-center items-start p-6">
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-2">
                    {banner.title}
                  </h3>
                  {banner.offer_text && (
                    <p className="text-white/90 text-sm md:text-base">
                      {banner.offer_text}
                    </p>
                  )}
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
