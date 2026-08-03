import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface FeaturedProductsProps {
  onFetchStatus?: (section: string, failed: boolean) => void;
}

export function FeaturedProducts({ onFetchStatus }: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const { data, error } = await supabase
            .from("products")
            .select("id, name, slug, images, guest_price, retail_price, shop_price, regular_price, has_variations")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(6);

          if (!isMounted) return;

          setProducts(((data as unknown as Product[]) || []));

          if (!error) { onFetchStatus?.("featured", false); break; }

          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          }
        } catch (error) {
          console.error("Featured products fetch failed:", error);
          onFetchStatus?.("featured", true);
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [onFetchStatus]);

  return (
    <section className="pt-6 pb-1 sm:pt-8 sm:pb-3 bg-secondary/30">
      <div className="container mx-auto px-3 sm:px-4">
        <SectionHeading title="Trending Products" />
        <div className="flex justify-end mb-3">
          <Link to="/products" className="text-accent font-medium text-sm hover:underline flex items-center gap-1">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>


        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] md:w-[calc(16.666%-10px)] space-y-2">
                <Skeleton className="aspect-square rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
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
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-2">No Products Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Products will appear here once added</p>
            <Link to="/products">
              <Button className="bg-accent hover:bg-accent-hover text-sm">Browse Products</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
