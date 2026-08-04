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
    try { await addToCart(product.id, 1); } finally { setIsAdding(false); }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || isBuying) return;
    setIsBuying(true);
    try {
      const added = await addToCart(product.id, 1);
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
            <h3 className="text-foreground text-[12.5px] sm:text-sm line-clamp-2 mb-1.5 leading-snug font-normal break-words min-h-[2.4em]">
              {product.name}
            </h3>

            <div className="mt-auto">
              {/* Compact rating summary — fixed height to avoid layout shift */}
              <div className="h-[18px] flex items-center gap-1.5 mb-1">
                {reviewStats === null ? (
                  <span className="h-3 w-24 rounded bg-muted animate-pulse" />
                ) : reviewStats.count > 0 ? (
                  <>
                    <span className="flex items-center gap-[1px]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${s <= Math.round(reviewStats.avg) ? "fill-[#f6a723] text-[#f6a723]" : "text-muted-foreground/40"}`}
                        />
                      ))}
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">{reviewStats.avg.toFixed(1)}</span>
                    <span className="text-[11px] text-muted-foreground">({reviewStats.count})</span>
                  </>
                ) : null}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {product.has_variations ? "From " : ""}₹{price.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-[18px] flex items-center gap-2 mt-0.5">
                {discount > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground line-through">
                      ₹{mrp.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-semibold text-[#388e3c]">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex items-stretch gap-2">
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
