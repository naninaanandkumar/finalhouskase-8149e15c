import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ShoppingCart, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { SignedImage } from "@/components/common/SignedImage";
import { supabase } from "@/integrations/supabase/client";


interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    images?: string[] | null;
    guest_price: number;
    retail_price: number;
    shop_price: number;
    regular_price: number;
    has_variations?: boolean | null;
  };
  index?: number;
  className?: string;
}

export function ProductCard({ product, index = 0, className = "" }: ProductCardProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const price = product.guest_price > 0 ? product.guest_price : product.retail_price;
  const mrp = product.regular_price > 0 ? product.regular_price : price;
  const discount = mrp > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number } | null>(null);
  const [sizes, setSizes] = useState<{ id: string; size: string }[]>([]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const images = (product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"]) as string[];

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("get_product_review_stats", { _product_id: product.id })
      .then(({ data }) => {
        if (cancelled) return;
        const row: any = Array.isArray(data) ? data[0] : data;
        const count = Number(row?.review_count ?? 0);
        if (count === 0) {
          setReviewStats({ avg: 0, count: 0 });
        } else {
          setReviewStats({ avg: Number(row.avg_rating), count });
        }
      });
    return () => { cancelled = true; };
  }, [product.id]);

  useEffect(() => {
    if (!product.has_variations) return;
    let cancelled = false;
    supabase
      .from("product_variations")
      .select("id, size")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        const rows = (data as { id: string; size: string | null }[])
          .filter((v) => v.size && v.size.trim())
          .map((v) => ({ id: v.id, size: v.size as string }));
        setSizes(rows);
        if (rows.length > 0) setSelectedSize(rows[0].id);
      });
    return () => { cancelled = true; };
  }, [product.id, product.has_variations]);



  const startSlide = () => {
    if (images.length <= 1 || timerRef.current) return;
    timerRef.current = window.setInterval(() => {
      setImgIdx((i) => (i + 1) % images.length);
    }, 900);
  };
  const stopSlide = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setImgIdx(0);
  };
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || isBuying) return;
    setIsAdding(true);
    try { await addToCart(product.id, 1, selectedSize); } finally { setIsAdding(false); }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || isBuying) return;
    setIsBuying(true);
    try {
      const added = await addToCart(product.id, 1, selectedSize);
      if (added) navigate("/checkout");
    } finally { setIsBuying(false); }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={`min-w-0 ${className}`}
    >
      <Link
        to={`/product/${product.slug}`}
        className="group block h-full min-w-0"
        onMouseEnter={startSlide}
        onMouseLeave={stopSlide}
      >
        <div className="bg-white rounded-[5px] border border-border overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 h-full flex flex-col relative">
          <div className="relative aspect-square overflow-hidden bg-[#f5f5f5]">
            {mrp > price && (
              <span className="absolute top-2 left-0 z-10 bg-[#5cb85c] text-white text-[12px] sm:text-[14px] font-bold px-3 py-1 rounded-r-full shadow-md">
                Save ₹{(mrp - price).toLocaleString("en-IN")}
              </span>
            )}
            {images.map((src, i) => (
              <SignedImage
                key={i}
                src={src}
                alt={product.name}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${i === imgIdx ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>

          <div className="px-2.5 sm:px-3 pb-3 pt-2 flex flex-col flex-grow min-w-0">
            {reviewStats && reviewStats.count > 0 && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="flex items-center gap-[1px]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-3 w-3 ${n <= Math.round(reviewStats.avg) ? "fill-accent text-accent" : "text-muted-foreground/40"}`}
                    />
                  ))}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {reviewStats.count} {reviewStats.count === 1 ? "review" : "reviews"}
                </span>
              </div>
            )}

            <h3 className="text-foreground text-[13px] sm:text-[15px] font-semibold line-clamp-2 min-h-[2.4em] mb-1.5 leading-snug break-words">
              {product.name}
            </h3>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-base sm:text-xl font-extrabold text-foreground">
                {product.has_variations ? "From " : ""}₹{price.toLocaleString("en-IN")}
              </span>
              {discount > 0 && (
                <>
                  <span className="text-xs sm:text-sm text-muted-foreground line-through">
                    ₹{mrp.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#388e3c]">{discount}% off</span>
                </>
              )}
            </div>

            {sizes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sizes.slice(0, 4).map((v) => (
                  <button
                    key={v.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSize(v.id);
                    }}
                    className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                      selectedSize === v.id
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background text-foreground hover:border-accent"
                    }`}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto pt-3 flex gap-2">
              <button
                onClick={handleAddToCart}
                disabled={isAdding || isBuying}
                className="flex items-center justify-center w-10 h-9 border border-border rounded hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin text-foreground" /> : <ShoppingCart className="h-4 w-4 text-foreground" />}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isAdding || isBuying}
                className="flex-1 min-w-0 h-9 bg-accent hover:bg-accent-hover text-accent-foreground text-[11px] sm:text-xs font-bold rounded transition-colors uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                {isBuying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isBuying ? "Processing..." : "Buy Now"}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
