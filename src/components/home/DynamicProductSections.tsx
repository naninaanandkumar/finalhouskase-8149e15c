import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/products/ProductCard";

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

interface Section {
  id: string;
  title: string;
  category_id: string | null;
  background_image: string | null;
  product_limit: number;
}

interface DynamicProductSectionsProps {
  onFetchStatus?: (section: string, failed: boolean) => void;
}

export function DynamicProductSections({ onFetchStatus }: DynamicProductSectionsProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionProducts, setSectionProducts] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSections = async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const { data, error } = await supabase
            .from("homepage_sections")
            .select("id, title, category_id, background_image, product_limit")
            .eq("is_active", true)
            .order("sort_order");

          if (!isMounted) return;

          if (data && data.length > 0) {
            setSections(data);

            const productMap: Record<string, Product[]> = {};
            await Promise.all(
              data.map(async (section) => {
                let query = supabase
                  .from("products")
                  .select("id, name, slug, images, guest_price, retail_price, shop_price, regular_price, has_variations")
                  .eq("is_active", true)
                  .order("created_at", { ascending: false })
                  .limit(section.product_limit || 12);

                if (section.category_id) {
                  query = query.eq("category_id", section.category_id);
                }

                const { data: products } = await query;
                productMap[section.id] = (products as unknown as Product[]) || [];
              })
            );

            if (isMounted) {
              setSectionProducts(productMap);
            }
          }

          if (!error) { onFetchStatus?.("dynamic", false); break; }

          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          }
        } catch (error) {
          console.error("Dynamic sections fetch failed:", error);
          onFetchStatus?.("dynamic", true);
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    fetchSections();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => {
        const products = sectionProducts[section.id] || [];
        if (products.length === 0) return null;

        return (
          <section
            key={section.id}
            className="py-6 sm:py-8 relative"
            style={section.background_image ? {
              backgroundImage: `url(${section.background_image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } : undefined}
          >
            {section.background_image && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            )}
            <div className="container mx-auto px-3 sm:px-4 relative z-10">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-foreground">
                  {section.title}
                </h2>
                <Link to="/products" className="text-accent font-medium text-sm hover:underline flex items-center gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {products.slice(0, 6).map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
