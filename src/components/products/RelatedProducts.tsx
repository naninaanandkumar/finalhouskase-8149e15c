import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
        .limit(6);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data } = await query.order("created_at", { ascending: false });

      if (!data || data.length < 6) {
        const existing = data?.map(p => p.id) || [];
        const { data: moreData } = await supabase
          .from("products")
          .select("id, name, slug, images, guest_price, retail_price, shop_price, regular_price, has_variations")
          .eq("is_active", true)
          .not("id", "in", `(${[currentProductId, ...existing].join(",")})`)
          .order("created_at", { ascending: false })
          .limit(6 - (data?.length || 0));

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
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-display font-bold text-foreground">
          Related Products
        </h2>
        <Link to="/products" className="text-accent font-medium flex items-center gap-1 text-sm hover:gap-2 transition-all">
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {products.map((product, idx) => (
          <ProductCard key={product.id} product={product} index={idx} />
        ))}
      </div>
    </div>
  );
}
