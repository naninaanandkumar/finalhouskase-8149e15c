import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
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

interface RelatedProductsProps {
  currentProductId: string;
  categoryId?: string | null;
}

export function RelatedProducts({ currentProductId, categoryId }: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      setLoading(true);
      
      let query = supabase
        .from("products")
        .select("id, name, slug, images, guest_price, retail_price, shop_price, regular_price, has_variations")
        .eq("is_active", true)
        .neq("id", currentProductId)
        .limit(5);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data } = await query.order("created_at", { ascending: false });

      if (!data || data.length < 5) {
        const existing = data?.map(p => p.id) || [];
        const { data: moreData } = await supabase
          .from("products")
          .select("id, name, slug, images, guest_price, retail_price, shop_price, regular_price, has_variations")
          .eq("is_active", true)
          .not("id", "in", `(${[currentProductId, ...existing].join(",")})`)
          .order("created_at", { ascending: false })
          .limit(5 - (data?.length || 0));

        setProducts([...(data || []), ...(moreData || [])] as unknown as Product[]);
      } else {
        setProducts(data as unknown as Product[]);
      }
      
      setLoading(false);
    };

    fetchRelatedProducts();
  }, [currentProductId, categoryId]);

  if (loading) {
    return (
      <div className="mt-8">
        <Skeleton className="h-8 w-48 mb-6 mx-auto" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="related-products-heading">
      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-5">
        <span aria-hidden className="hidden sm:block h-px w-12 sm:w-24 bg-gradient-to-r from-transparent to-border" />
        <h2 id="related-products-heading" className="text-lg sm:text-xl font-display font-bold text-foreground text-center">
          Related Products
        </h2>
        <span aria-hidden className="hidden sm:block h-px w-12 sm:w-24 bg-gradient-to-l from-transparent to-border" />
      </div>

      {/* Mobile / tablet: horizontal scroller with dot indicators (no scrollbar line) */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="lg:hidden flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-3 px-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, idx) => (
          <div key={product.id} className="snap-start shrink-0 w-[46%] sm:w-[31%]">
            <ProductCard product={product} index={idx} />
          </div>
        ))}
      </div>
      <div className="lg:hidden flex items-center justify-center gap-1.5 mt-3">
        {products.map((p, i) => (
          <span
            key={p.id}
            aria-hidden
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-4 bg-primary" : "w-1.5 bg-border"}`}
          />
        ))}
      </div>

      {/* Desktop grid */}
      <div className="hidden lg:grid grid-cols-5 gap-4">
        {products.map((product, idx) => (
          <ProductCard key={product.id} product={product} index={idx} />
        ))}
      </div>
    </section>
  );
}
