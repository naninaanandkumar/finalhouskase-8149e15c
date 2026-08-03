import { useEffect, useState } from "react";
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
  /** "showcase" renders a coloured panel with a sunburst label + horizontal product rail */
  variant?: "grid" | "showcase";
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
  panelLabelTop = "BEST",
  panelLabelBottom = "Sellers",
}: TaggedProductSectionProps) {

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, images, guest_price, retail_price, shop_price, regular_price, has_variations")
        .eq("is_active", true)
        .overlaps("tags", tagVariants(tag))
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!isMounted) return;
      setProducts((data as unknown as Product[]) || []);
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [tag, limit]);

  if (!loading && products.length === 0) return null;

  return (
    <section className={`py-6 sm:py-8 ${className}`}>
      <div className="container mx-auto px-3 sm:px-4">
        <SectionHeading title={title} subtitle={subtitle} />

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:overflow-x-auto sm:snap-x sm:snap-mandatory sm:pb-2 lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={idx}
                  className="sm:w-[calc(33.333%-0.5rem)] md:w-[calc(25%-0.5625rem)] lg:w-auto sm:flex-shrink-0 sm:snap-start"
                />
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                to="/products"
                className="inline-flex items-center gap-1 text-accent font-medium text-sm hover:underline"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
