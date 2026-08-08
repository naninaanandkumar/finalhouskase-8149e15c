import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/products/ProductCard";
import { SectionHeading } from "./SectionHeading";

interface Product {
  id: string;
  name: string;
  slug: string;
  images: string[] | null;
  guest_price: number;
  retail_price: number;
  shop_price: number;
  regular_price: number;
  has_variations: boolean | null;
}

interface TaggedProductSectionProps {
  tag: string;
  title: string;
  subtitle?: string;
  limit?: number;
  className?: string;
  /** "showcase" renders a coloured panel with a sunburst label + product grid or rail */
  variant?: "grid" | "showcase";
  forceHorizontalOnTablet?: boolean;
  panelLabelTop?: string;
  panelLabelBottom?: string;
}

const tagVariants = (tag: string) => {
  const base = tag.trim();
  const lower = base.toLowerCase();
  const upper = base.toUpperCase();
  const title = lower.replace(/\b\w/g, (c) => c.toUpperCase());
  const hyphen = lower.replace(/\s+/g, "-");
  const underscore = lower.replace(/\s+/g, "_");
  return Array.from(new Set([base, lower, upper, title, hyphen, underscore]));
};

export function TaggedProductSection({
  tag,
  title,
  subtitle,
  limit = 6,
  className = "",
  variant = "grid",
  forceHorizontalOnTablet = false,
  panelLabelTop = "BEST",
  panelLabelBottom = "Sellers",
}: TaggedProductSectionProps) {

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const railRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  const handleScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const ratio = max > 0 ? el.scrollLeft / max : 0;
    setActiveDot(Math.min(2, Math.round(ratio * 2)));
  };

  const scrollToDot = (i: number) => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: (max * i) / 2, behavior: "smooth" });
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, images, guest_price, retail_price, shop_price, regular_price, has_variations")
        .eq("is_active", true)
        .overlaps("tags", tagVariants(tag))
        .order("created_at", { ascending: false })
        .limit(12);
      if (!isMounted) return;
      setProducts((data as unknown as Product[]) || []);
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [tag]);

  if (!loading && products.length === 0) return null;

  if (variant === "showcase") {
    return (
      <section className={`py-8 sm:py-10 ${className}`}>
        <div className="container mx-auto px-3 sm:px-4">
          <div className="rounded-2xl bg-primary p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Sunburst label panel - Back to fixed width on mobile/tablet rail layout */}
            <div
              className="relative shrink-0 w-full sm:w-[26%] lg:w-[21%] rounded-xl overflow-hidden flex items-center justify-center bg-primary"
              aria-hidden="true"
            >
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg at 50% 50%, hsl(var(--primary-foreground) / 0.14) 0deg 9deg, transparent 9deg 18deg)",
                }}
              />
              <div className="relative text-center px-3 py-6 sm:py-10 lg:py-14">
                <p className="font-display font-extrabold leading-none tracking-tight text-primary-foreground text-2xl sm:text-4xl lg:text-5xl animate-[pulse_2.6s_ease-in-out_infinite]">
                  {panelLabelTop}
                </p>
                <p className="font-display font-bold italic text-primary-foreground/90 text-lg sm:text-2xl lg:text-3xl -mt-1 animate-[bounce_2.6s_ease-in-out_infinite]">
                  {panelLabelBottom}
                </p>
              </div>
            </div>

            {/* Horizontal Product Rail - Back to sliding behavior */}
            <div
              ref={railRef}
              onScroll={handleScroll}
              className="flex-1 min-w-0 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {loading
                ? [...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="shrink-0 w-[70%] sm:w-[40%] lg:w-[24%] rounded-xl bg-card p-2 space-y-2"
                    >
                      <Skeleton className="aspect-square rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))
                : products.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={idx}
                      className="shrink-0 snap-start w-[70%] sm:w-[40%] lg:w-[24%] bg-card rounded-xl"
                    />
                  ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => scrollToDot(i)}
                className={`h-2 rounded-full transition-all ${
                  activeDot === i ? "w-5 bg-accent" : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="mt-4 text-center">
            <Link to="/products" className="inline-flex items-center gap-1 text-accent font-medium text-sm hover:underline">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-8 sm:py-10 ${className}`}>
      <div className="container mx-auto px-3 sm:px-4">
        <SectionHeading
          title={title}
          subtitle={subtitle}
          action={
            <Link to="/products" className="text-accent font-medium text-sm hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:flex sm:overflow-x-auto sm:snap-x sm:snap-mandatory sm:scrollbar-hide sm:pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0 gap-3">
            {products.slice(0, 10).map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={idx}
                className="w-full sm:shrink-0 sm:snap-start sm:w-[calc(25%-9px)] lg:w-full lg:shrink"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}