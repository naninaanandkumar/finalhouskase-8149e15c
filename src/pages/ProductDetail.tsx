import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Truck, Shield, Minus, Plus, Check, 
  Package, Clock, Phone, MessageCircle, Factory, 
  Award, ChevronRight, ShoppingCart, Star, Zap, CheckCircle2, MapPin, X, ChevronLeft, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useRFQCart } from "@/hooks/useRFQCart";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { RelatedProducts } from "@/components/products/RelatedProducts";
import { ReviewsSummary } from "@/components/products/ReviewsSummary";
import { ReelsSection } from "@/components/reels/ReelsSection";
import { ProductOffers } from "@/components/products/ProductOffers";
import { ProductCoupons } from "@/components/products/ProductCoupons";
import { CustomerReviews, type ReviewStats } from "@/components/products/CustomerReviews";
import { Input } from "@/components/ui/input";
import { SEOHead, SchemaGenerators } from "@/components/SEOHead";
import { SignedImage } from "@/components/common/SignedImage";
import { FormattedProductText } from "@/components/products/FormattedProductText";

interface ProductVariation {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  color_image: string | null;
  gallery_images: string[] | null;
  shop_price: number;
  shop_regular_price: number | null;
  retail_price: number;
  retail_regular_price: number | null;
  guest_price: number;
  regular_price: number | null;
  shop_moq: number | null;
  retail_moq: number | null;
  stock_quantity: number | null;
  weight: number | null;
}

interface ProductAttribute {
  name: string;
  value: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  images: string[] | null;
  guest_price: number;
  shop_price: number;
  retail_price: number;
  regular_price: number;
  shop_moq: number;
  retail_moq: number;
  gst_percentage: number | null;
  gst_enabled?: boolean | null;
  gst_pricing_mode?: string | null;
  stock_quantity: number | null;
  features: string[] | null;
  has_variations: boolean | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  category_id: string | null;
  category: { name: string } | null;
  brand: { name: string } | null;
  sku: string | null;
  banner_image?: string | null;
}

function DeliveryChecker() {
  const [pincode, setPincode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    delivery_days: number;
    delivery_days_max?: number;
    city: string | null;
    state: string | null;
    is_cod_available: boolean | null;
    fallback?: boolean;
  } | null>(null);
  const [invalid, setInvalid] = useState(false);

  const isValidIndianPincode = (p: string) => /^[1-8][0-9]{5}$/.test(p);

  const getDefaultDeliveryResult = () => ({
    delivery_days: 3,
    delivery_days_max: 4,
    city: null,
    state: null,
    is_cod_available: true,
    fallback: true,
  });

  const handleCheck = async () => {
    setResult(null);
    setInvalid(false);
    if (!isValidIndianPincode(pincode)) {
      setInvalid(true);
      return;
    }
    // Every valid Indian pincode should show standard delivery availability immediately.
    // The database entry only enriches city/state/custom timeline when available.
    setResult(getDefaultDeliveryResult());
    setChecking(true);
    try {
      const { data } = await supabase
        .from("delivery_pincodes")
        .select("delivery_days, city, state, is_cod_available")
        .eq("pincode", pincode)
        .eq("is_active", true)
        .maybeSingle();
      if (data) {
        setResult({ ...data, fallback: false });
      }
    } catch {
      setResult(getDefaultDeliveryResult());
    } finally {
      setChecking(false);
    }
  };

  const minDate = result ? new Date(Date.now() + result.delivery_days * 86400000) : null;
  const maxDate = result
    ? new Date(Date.now() + (result.delivery_days_max ?? result.delivery_days) * 86400000)
    : null;
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="pt-3 border-t border-border">
      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-destructive" />
        Check Delivery Details
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Enter 6-digit Pincode"
          inputMode="numeric"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setInvalid(false);
          }}
          className="h-9 text-xs flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
        />
        <Button size="sm" className="h-9 text-xs px-4 bg-accent hover:bg-accent-hover" onClick={handleCheck} disabled={checking}>
          {checking ? "..." : "Check"}
        </Button>
      </div>
      {result && (
        <div className="mt-2 p-2.5 rounded-lg bg-success/5 border border-success/20 space-y-1">
          <p className="text-xs font-medium text-success flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Delivery available
            {result.city && (
              <span className="text-muted-foreground font-normal">
                to {result.city}{result.state ? `, ${result.state}` : ""}
              </span>
            )}
          </p>
          <p className="text-xs text-foreground">
            {result.delivery_days_max && result.delivery_days_max !== result.delivery_days ? (
              <>
                Estimated delivery between{" "}
                <span className="font-semibold">{minDate && fmt(minDate)}</span> –{" "}
                <span className="font-semibold">{maxDate && fmt(maxDate)}</span>
                <span className="text-muted-foreground"> ({result.delivery_days}-{result.delivery_days_max} days)</span>
              </>
            ) : (
              <>
                Estimated delivery by <span className="font-semibold">{minDate && fmt(minDate)}</span>
                <span className="text-muted-foreground"> ({result.delivery_days} days)</span>
              </>
            )}
          </p>
          {result.is_cod_available && <p className="text-[10px] text-success">✓ Cash on Delivery available</p>}
            <p className="text-[10px] text-muted-foreground">
              {result.fallback
                ? "Standard shipping across India via trusted courier partners."
                : "Delivery timeline is based on your serviceable pincode."}
            </p>
        </div>
      )}
      {invalid && (
        <p className="mt-2 text-xs text-destructive">Please enter a valid 6-digit Indian pincode.</p>
      )}
    </div>
  );
}


export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addToRFQCart } = useRFQCart();
  const { user, role } = useAuth();
  const { addToCart } = useCart();
  const [isAddingToRFQ, setIsAddingToRFQ] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const handleReviewStats = useCallback((s: ReviewStats) => setReviewStats(s), []);
  const [zoomIndex, setZoomIndex] = useState(0);

  const getRolePrice = (p: Product | null, v: ProductVariation | null | undefined) => {
    const guestPrice = v?.guest_price ?? p?.guest_price ?? 0;
    return guestPrice > 0 ? guestPrice : (v?.retail_price ?? p?.retail_price ?? 0);
  };

  const getRoleMoq = (p: Product | null, v: ProductVariation | null | undefined) => {
    const moq = v?.retail_moq ?? p?.retail_moq ?? 1;
    return moq && moq > 1 ? moq : 1;
  };

  const getMrp = (p: Product | null, v: ProductVariation | null | undefined) => {
    const varRegular = v?.regular_price ?? 0;
    if (varRegular > 0) return varRegular;
    const regularPrice = p?.regular_price ?? 0;
    return regularPrice > 0 ? regularPrice : (v?.guest_price ?? p?.guest_price ?? p?.retail_price ?? 0);
  };

  const getPriceLabel = () => null;

  const fetchProductAttributes = async (productId: string) => {
    const { data } = await supabase
      .from("product_attribute_assignments")
      .select("*, attribute:product_attributes(name), attribute_value:product_attribute_values(value)")
      .eq("product_id", productId)
      .eq("visible_on_product", true);
    if (data) {
      setProductAttributes(data.map((a: any) => ({
        name: a.attribute?.name || "",
        value: a.attribute_value?.value || "",
      })));
    }
  };

  // Reset selection state when product changes
  useEffect(() => {
    setSelectedSize(null);
    setSelectedColor(null);
    setSelectedVariationId(null);
    setSelectedImage("");
    setQuantity(1);
    setVariations([]);
    setProductAttributes([]);
  }, [id]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`*, category:categories(name), brand:brands(name)`)
        .eq("slug", id)
        .maybeSingle();

      if (productError || !productData) {
        const { data: productById } = await supabase
          .from("products")
          .select(`*, category:categories(name), brand:brands(name)`)
          .eq("id", id)
          .maybeSingle();
        
        if (productById) {
          setProduct(productById as unknown as Product);
          if (productById.images?.[0]) setSelectedImage(productById.images[0]);
          setQuantity(1);
          
          if (productById.has_variations) {
            const { data: vars } = await supabase
              .from("product_variations")
              .select("*")
              .eq("product_id", productById.id)
              .eq("is_active", true);
            setVariations(vars || []);
          }
          await fetchProductAttributes(productById.id);
        }
      } else {
        setProduct(productData as unknown as Product);
        if (productData.images?.[0]) setSelectedImage(productData.images[0]);
        setQuantity(1);
        
        if (productData.has_variations) {
          const { data: vars } = await supabase
            .from("product_variations")
            .select("*")
            .eq("product_id", productData.id)
            .eq("is_active", true);
          setVariations(vars || []);
        }
        await fetchProductAttributes(productData.id);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  const { uniqueSizes, uniqueColors, colorImageMap } = useMemo(() => {
    const sizes = [...new Set(variations.map(v => v.size).filter(Boolean))] as string[];
    const colors = [...new Set(variations.map(v => v.color).filter(Boolean))] as string[];
    const imageMap: Record<string, string> = {};
    variations.forEach(v => {
      if (v.color && v.color_image) {
        imageMap[v.color] = v.color_image;
      }
    });
    return { uniqueSizes: sizes, uniqueColors: colors, colorImageMap: imageMap };
  }, [variations]);

  const selectedVariation = useMemo(() => {
    if (!product?.has_variations || variations.length === 0) return null;
    if (selectedVariationId) {
      return variations.find(v => v.id === selectedVariationId);
    }
    // Only filter by size/color if they actually exist in variations
    const hasSizeVariants = variations.some(v => v.size);
    const hasColorVariants = variations.some(v => v.color);
    return variations.find(v => 
      (!hasSizeVariants || !selectedSize || v.size === selectedSize) && 
      (!hasColorVariants || !selectedColor || v.color === selectedColor)
    );
  }, [variations, selectedSize, selectedColor, selectedVariationId, product]);

  const currentMoq = getRoleMoq(product, selectedVariation);
  const hasExplicitMoq = Boolean(
    (selectedVariation?.shop_moq && selectedVariation.shop_moq > 1) ||
    (selectedVariation?.retail_moq && selectedVariation.retail_moq > 1) ||
    (product?.shop_moq && product.shop_moq > 1) ||
    (product?.retail_moq && product.retail_moq > 1)
  );
  const currentPrice = getRolePrice(product, selectedVariation);
  const currentMrp = getMrp(product, selectedVariation);
  const gstPercent = Number(product?.gst_percentage ?? 0);
  const gstEnabled = product?.gst_enabled !== false && gstPercent > 0;
  const gstInclusive = gstEnabled && product?.gst_pricing_mode === "inclusive";
  const displayInclPrice = gstInclusive ? currentPrice : Math.round(currentPrice * (1 + gstPercent / 100));
  const currentStock = selectedVariation?.stock_quantity ?? product?.stock_quantity ?? 0;
  const moqValid = quantity >= currentMoq;

  const handleAddToRFQ = async () => {
    if (!product) return;
    setIsAddingToRFQ(true);
    try {
      await addToRFQCart(product.id, quantity, selectedVariation?.id);
    } finally {
      setIsAddingToRFQ(false);
    }
  };

  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const handleAddToCartClick = async () => {
    if (!product || !moqValid) return;
    setIsAddingToCart(true);
    try {
      const success = await addToCart(product.id, quantity, selectedVariation?.id);
      return success;
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || !moqValid || isBuyingNow) return;
    setIsBuyingNow(true);
    try {
      const success = await handleAddToCartClick();
      if (success) window.location.href = "/checkout";
    } finally {
      setIsBuyingNow(false);
    }
  };

  useEffect(() => {
    if (selectedColor && colorImageMap[selectedColor]) {
      setSelectedImage(colorImageMap[selectedColor]);
    }
  }, [selectedColor, colorImageMap]);

  useEffect(() => {
    if (uniqueSizes.length > 0 && !selectedSize) {
      setSelectedSize(uniqueSizes[0]);
    }
    if (uniqueColors.length > 0 && !selectedColor) {
      setSelectedColor(uniqueColors[0]);
    }
  }, [uniqueSizes, uniqueColors, selectedSize, selectedColor]);

  // Update quantity when buyerType or MOQ changes (e.g., after auth loads)
  useEffect(() => {
    if (product && currentMoq > 0) {
      setQuantity(prev => Math.max(prev, currentMoq));
    }
  }, [currentMoq, product]);

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= currentMoq && newQty <= Math.max(currentStock, 9999)) {
      setQuantity(newQty);
    }
  };

  const handleWhatsAppClick = () => {
    if (!product) return;
    const url = `${window.location.origin}/product/${product.slug}`;
    const message = encodeURIComponent(
      `Hi, I'm interested in:\n\n*${product.name}*\nQuantity: ${quantity}\n${selectedVariation ? `Variation: ${selectedSize || ""} ${selectedColor || ""}` : ""}\n\n${url}\n\nPlease provide pricing and availability.`
    );
    window.open(`https://wa.me/919266129195?text=${message}`, "_blank");
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariationId(variantId);
    const variant = variations.find(v => v.id === variantId);
    if (variant) {
      if (variant.size) setSelectedSize(variant.size);
      if (variant.color) setSelectedColor(variant.color);
      // Show variation's feature image, or first gallery image, or keep current
      if (variant.color_image) {
        setSelectedImage(variant.color_image);
      } else if (variant.gallery_images?.length) {
        setSelectedImage(variant.gallery_images[0]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-4 pb-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-12 gap-6">
              <div className="md:col-span-5">
                <Skeleton className="aspect-square rounded-lg" />
              </div>
              <div className="md:col-span-7 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Product not found</h1>
            <Link to="/products">
              <Button>Back to Products</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Merge product images with selected variation's gallery images
  const baseImages = product.images?.length ? product.images : ["/placeholder.svg"];
  const variationGallery = selectedVariation?.gallery_images?.length ? selectedVariation.gallery_images : [];
  const variationFeatureImage = selectedVariation?.color_image ? [selectedVariation.color_image] : [];
  const productImages = [
    ...variationFeatureImage,
    ...variationGallery.filter(img => !variationFeatureImage.includes(img)),
    ...baseImages.filter(img => !variationFeatureImage.includes(img) && !variationGallery.includes(img)),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${product.name}${product.category?.name ? ` — ${product.category.name}` : ""} | Houskase`}
        description={product.short_description?.slice(0, 160) || product.description?.replace(/<[^>]*>/g, "").substring(0, 160) || `Buy ${product.name} at Houskase. Premium quality, ₹${currentPrice} only. Fast shipping across India.`}
        keywords={`${product.name}, buy ${product.name} online, ${product.category?.name || "Houskase"}, ${product.brand?.name || ""}, India`}
        ogType="product"
        ogImage={productImages[0] !== "/placeholder.svg" ? productImages[0] : undefined}
        jsonLd={[
          {
            ...SchemaGenerators.product({
              name: product.name,
              description: product.short_description || product.description?.substring(0, 300) || undefined,
              image: productImages[0] !== "/placeholder.svg" ? productImages[0] : undefined,
              price: currentPrice,
              sku: product.sku || undefined,
              brand: product.brand?.name || undefined,
              category: product.category?.name || undefined,
              url: `${window.location.origin}/product/${product.slug}`,
              inStock: (currentStock ?? 0) > 0,
            }),
            "@id": `${window.location.origin}/product/${product.slug}#product`,
            ...(reviewStats && reviewStats.total > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: Number(reviewStats.avg.toFixed(2)),
                    reviewCount: reviewStats.total,
                    bestRating: 5,
                    worstRating: 1,
                  },
                  review: reviewStats.items.map((r) => ({
                    "@type": "Review",
                    author: { "@type": "Person", name: r.author },
                    datePublished: r.date,
                    ...(r.title ? { name: r.title } : {}),
                    ...(r.body ? { reviewBody: r.body } : {}),
                    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
                  })),
                }
              : {}),
          },
          SchemaGenerators.breadcrumb([
            { name: "Home", url: window.location.origin },
            { name: "Products", url: `${window.location.origin}/products` },
            ...(product.category ? [{ name: product.category.name, url: `${window.location.origin}/products?category=${product.category.name.toLowerCase()}` }] : []),
            { name: product.name, url: `${window.location.origin}/product/${product.slug}` },
          ]),
        ]}
      />
      <Header />
      
      <main className="pt-0">
        <div className="container mx-auto px-3 sm:px-4 py-2 max-w-full">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 overflow-hidden whitespace-nowrap">
            <Link to="/" className="hover:text-accent transition-colors flex-shrink-0">Home</Link>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <Link to="/products" className="hover:text-accent transition-colors flex-shrink-0">Products</Link>
            {product.category && (
              <>
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                <Link to={`/products?category=${product.category.name.toLowerCase()}`} className="hover:text-accent transition-colors flex-shrink-0">
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <span className="text-foreground truncate">{product.name}</span>
          </nav>

          {/* Main Product Section - modern 2-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-5 lg:gap-10 items-start min-w-0">
            {/* Left: Image Gallery - STICKY */}
            <div className="md:sticky md:top-5 min-w-0">
              <div className="space-y-3">
                {/* Main Image */}
                <div
                  className="relative bg-card rounded-lg overflow-hidden border border-border cursor-zoom-in aspect-square"
                  onClick={() => {
                    const idx = productImages.indexOf(selectedImage || productImages[0]);
                    setZoomIndex(idx >= 0 ? idx : 0);
                    setZoomOpen(true);
                  }}
                >
                  <SignedImage
                    src={selectedImage || productImages[0]}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>

                {/* Thumbnail Gallery - max 6 visible, scrollable */}
                <div className="relative group">
                  {productImages.length > 6 && (
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={() => {
                        const el = document.getElementById('thumb-scroll');
                        if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 border border-border rounded-full w-6 h-6 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >

                      <ChevronRight className="h-3 w-3 rotate-180" />
                    </button>
                  )}
                  <div
                    id="thumb-scroll"
                    className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-full"
                  >
                    {productImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(img)}
                        className={cn(
                          "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                          selectedImage === img 
                            ? "border-accent" 
                            : "border-border hover:border-accent/50"
                        )}
                      >
                        <SignedImage src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  {productImages.length > 6 && (
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={() => {
                        const el = document.getElementById('thumb-scroll');
                        if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 border border-border rounded-full w-6 h-6 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >

                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Product Info + Buy Box in one column */}
            <div className="space-y-5 min-w-0">
              {/* Title & Meta */}
              <div>
                <h1 className="text-lg sm:text-xl md:text-lg lg:text-xl md:font-semibold font-bold text-foreground leading-snug mb-2">
                  {product.name}
                </h1>
                
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  {product.sku && <span>SKU: {product.sku}</span>}
                  {product.brand && (
                    <>
                      <span>•</span>
                      <span>Brand: <span className="text-foreground font-medium">{product.brand.name}</span></span>
                    </>
                  )}
                </div>

                <ReviewsSummary productId={product.id} />

                {/* Price */}
                <div className="mt-3">
                  {getPriceLabel() && (
                    <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded mb-1.5 inline-block">
                      {getPriceLabel()}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-bold text-foreground">₹{currentPrice.toLocaleString("en-IN")}</span>
                    {currentMrp > currentPrice && (
                      <>
                        <span className="text-base text-muted-foreground line-through">₹{currentMrp.toLocaleString("en-IN")}</span>
                        <span className="text-sm font-semibold text-success">
                          {Math.round(((currentMrp - currentPrice) / currentMrp) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {gstEnabled && (
                      <p className="text-xs text-muted-foreground">
                        ₹{displayInclPrice.toLocaleString("en-IN")} (Incl. of all taxes) ·{" "}
                        <span className="text-success font-medium">
                          {gstInclusive ? `GST included (${gstPercent}%)` : `+${gstPercent}% GST`}
                        </span>
                      </p>
                    )}
                    {currentMrp > currentPrice && (
                      <p className="text-xs text-success font-medium">
                        You save ₹{(currentMrp - currentPrice).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Variant Selection */}
              {variations.length > 0 && (uniqueSizes.length > 0 || uniqueColors.length > 0) && (
                <div className="space-y-5">
                  {uniqueSizes.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-foreground mb-2.5">
                        Size: <span className="font-normal">{selectedSize || "Select"}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {uniqueSizes.map((size) => {
                          const sizeVariation = variations.find(v => v.size === size && (!selectedColor || v.color === selectedColor));
                          const sizePrice = sizeVariation ? getRolePrice(product, sizeVariation) : 0;
                          const sizeMrp = sizeVariation ? getMrp(product, sizeVariation) : 0;
                          const hasColors = uniqueColors.length > 0;
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              onClick={() => {
                                setSelectedSize(size);
                                if (sizeVariation) handleVariantSelect(sizeVariation.id);
                              }}
                              className={cn(
                                "rounded-lg border-2 text-left transition-all overflow-hidden min-w-[100px] max-w-[140px]",
                                isSelected
                                  ? "border-[#007185] shadow-sm"
                                  : "border-border hover:border-[#007185]/50"
                              )}
                            >
                              <div className={cn(
                                "px-2.5 py-1.5",
                                isSelected ? "bg-[#edfdff]" : "bg-background"
                              )}>
                                <p className="text-[11px] font-bold text-foreground leading-tight">{size}</p>
                              </div>
                              {sizePrice > 0 && (
                                <div className="px-2.5 py-1.5 border-t border-border bg-background">
                                  <p className="text-xs font-bold text-foreground leading-none">₹{sizePrice.toLocaleString("en-IN")}</p>
                                  {sizeMrp > sizePrice && (
                                    <p className="text-[10px] text-muted-foreground line-through leading-none mt-0.5">₹{sizeMrp.toLocaleString("en-IN")}</p>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {uniqueColors.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-foreground mb-2.5">
                        Colour: <span className="font-normal">{selectedColor || "Select"}</span>
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {uniqueColors.map((color) => {
                          // For color-only products, don't filter by selectedSize since variations won't have size
                          const shouldFilterBySize = uniqueSizes.length > 0 && selectedSize;
                          const colorVariation = variations.find(v => v.color === color && (!shouldFilterBySize || v.size === selectedSize));
                          const colorPrice = colorVariation ? getRolePrice(product, colorVariation) : 0;
                          const colorMrp = colorVariation ? getMrp(product, colorVariation) : 0;
                          const hasImage = colorImageMap[color];
                          const hasSizes = uniqueSizes.length > 0;
                          return (
                            <button
                              key={color}
                              onClick={() => {
                                setSelectedColor(color);
                                if (colorVariation) handleVariantSelect(colorVariation.id);
                              }}
                              className={cn(
                                "rounded-lg border-2 overflow-hidden transition-all",
                                selectedColor === color
                                  ? "border-[#007185] shadow-sm"
                                  : "border-border hover:border-[#007185]/50"
                              )}
                            >
                              {hasImage ? (
                                <SignedImage src={hasImage} alt={color} className="w-full aspect-square object-cover" />
                              ) : (
                                <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                                  <span className="text-[10px] text-muted-foreground font-medium">{color}</span>
                                </div>
                              )}
                              {!hasSizes && (
                                <div className="p-1.5">
                                  {colorPrice > 0 && (
                                    <p className="text-sm font-bold text-foreground">₹{colorPrice.toLocaleString("en-IN")}</p>
                                  )}
                                  {colorMrp > 0 && colorMrp > colorPrice && (
                                    <p className="text-[10px] text-muted-foreground line-through">₹{colorMrp.toLocaleString("en-IN")}</p>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Buy Box */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                {/* Quantity Selector */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-full">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= currentMoq}
                      className="p-2 hover:bg-secondary rounded-l-full transition-colors disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => handleQuantityChange(1)}
                      className="p-2 hover:bg-secondary rounded-r-full transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasExplicitMoq ? <>Minimum Order Quantity- {currentMoq}</> : "Quantity"}
                  </p>
                </div>

                {hasExplicitMoq && !moqValid && (
                  <p className="text-xs text-destructive font-medium">
                    Minimum order quantity for this product is {currentMoq} units
                  </p>
                )}

                {/* CTA Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    className="bg-accent hover:bg-accent-hover text-xs sm:text-sm font-bold h-11 uppercase tracking-wide rounded-lg px-2 inline-flex items-center justify-center gap-1.5"
                    onClick={handleAddToCartClick}
                    disabled={isAddingToCart || isBuyingNow || !moqValid}
                  >
                    {isAddingToCart ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    {isAddingToCart ? "Adding..." : "ADD TO CART"}
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-xs sm:text-sm font-bold h-11 uppercase tracking-wide rounded-lg px-2 inline-flex items-center justify-center gap-1.5"
                    onClick={handleBuyNow}
                    disabled={isAddingToCart || isBuyingNow || !moqValid}
                  >
                    {isBuyingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {isBuyingNow ? "PROCESSING..." : "BUY NOW"}
                  </Button>
                </div>

                {/* Quick Actions Row */}
                <div className="grid grid-cols-3 divide-x divide-border border border-border rounded-lg">
                  <button
                    onClick={() => window.open("tel:+919266129195")}
                    className="flex flex-col items-center gap-1.5 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="text-[10px] text-center text-muted-foreground leading-tight">
                      Call us at<br />+91 92661 29195
                    </span>
                  </button>
                  <button
                    onClick={handleWhatsAppClick}
                    className="flex flex-col items-center gap-1.5 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5 text-success" />
                    <span className="text-[10px] text-center text-muted-foreground leading-tight">
                      Buy on<br />Chat
                    </span>
                  </button>
                  <button
                    onClick={handleAddToRFQ}
                    className="flex flex-col items-center gap-1.5 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-accent" />
                    <span className="text-[10px] text-center text-muted-foreground leading-tight">
                      Ask for Bulk<br />Qty Quote
                    </span>
                  </button>
                </div>

                {/* Delivery Pincode Check */}
                <DeliveryChecker />

                {/* Returns + Shipping */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-secondary/20">
                    <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-tight">Returns</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">As per Brand / 7 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-secondary/20">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-tight">Shipping</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Free for bulk orders</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Available Offers */}
              <ProductOffers categoryId={product.category_id} />

              {/* Available Coupons */}
              <ProductCoupons categoryId={product.category_id} />

              {/* Features Table */}
              {productAttributes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">FEATURES</p>
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden text-xs">
                    {(() => {
                      const grouped: Record<string, string[]> = {};
                      productAttributes.forEach(a => {
                        if (!grouped[a.name]) grouped[a.name] = [];
                        grouped[a.name].push(a.value);
                      });
                      return Object.entries(grouped).map(([name, values], idx) => {
                        // Show only the selected value for Color/Size attributes
                        let displayValues = values;
                        const nameLower = name.toLowerCase();
                        if (nameLower === "color" || nameLower === "colour") {
                          displayValues = selectedColor ? [selectedColor] : values;
                        } else if (nameLower === "size") {
                          displayValues = selectedSize ? [selectedSize] : values;
                        }
                        return (
                          <div key={name} className={cn("grid grid-cols-2 divide-x divide-border", idx > 0 && "border-t border-border")}>
                            <div className="p-2.5 bg-secondary/30">
                              <span className="text-muted-foreground">{name}</span>
                            </div>
                            <div className="p-2.5">
                              <span className="font-medium text-foreground">{displayValues.join(", ")}</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {product.category && (
                      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                        <div className="p-2.5 bg-secondary/30">
                          <span className="text-muted-foreground">Category</span>
                        </div>
                        <div className="p-2.5">
                          <span className="font-medium text-foreground">{product.category.name}</span>
                        </div>
                      </div>
                    )}
                    {hasExplicitMoq && (
                      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                        <div className="p-2.5 bg-secondary/30">
                          <span className="text-muted-foreground">MOQ</span>
                        </div>
                        <div className="p-2.5">
                          <span className="font-medium text-foreground">{currentMoq} units</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {productAttributes.length === 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">FEATURES</p>
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden text-xs">
                    {product.category && (
                      <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="p-2.5 bg-secondary/30">
                          <span className="text-muted-foreground">Category</span>
                        </div>
                        <div className="p-2.5">
                          <span className="font-medium text-foreground">{product.category.name}</span>
                        </div>
                      </div>
                    )}
                    {hasExplicitMoq && (
                      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                        <div className="p-2.5 bg-secondary/30">
                          <span className="text-muted-foreground">MOQ</span>
                        </div>
                        <div className="p-2.5">
                          <span className="font-medium text-foreground">{currentMoq} units</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Overview */}
              {(product.short_description || product.description) && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">OVERVIEW</p>
                  <div 
                    className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap
                      [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-2
                      [&_h2]:text-xs [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1
                      [&_p]:mb-2 [&_p]:leading-relaxed
                      [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-0.5
                      [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2
                      [&_strong]:text-foreground [&_strong]:font-semibold
                      [&_em]:italic [&_br]:block"
                  >
                    <FormattedProductText text={product.short_description || product.description} />
                  </div>
                </div>
              )}
            </div>

          </div>


          {/* Promotional banner (admin-uploadable per product) */}
          {product.banner_image && (
            <div className="mt-6 rounded-xl overflow-hidden border border-border">
              <SignedImage
                src={product.banner_image}
                alt={`${product.name} promotional banner`}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Related products → Trending reels → Reviews */}
          <RelatedProducts currentProductId={product.id} categoryId={product.category_id} />
          <div className="mt-[30px]">
            <ReelsSection title="Trending Reels" placement="product" />
          </div>
          <CustomerReviews
            productId={product.id}
            productName={product.name}
            onStats={handleReviewStats}
          />
        </div>
      </main>

      <Footer />

      {/* Image Zoom Modal - Amazon Style */}
      {zoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setZoomOpen(false)}>
          <div
            className="relative bg-background rounded-xl shadow-2xl w-[95vw] h-[90vh] md:w-[85vw] md:h-[85vh] flex flex-col md:flex-row overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-3 right-3 z-20 bg-background/80 border border-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Main Image Area with hover zoom */}
            <div className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden">
              {/* Mobile swipe area */}
              <div
                className="w-full h-full flex items-center justify-center p-4 md:p-6 cursor-zoom-in group"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as any)._touchStartX = touch.clientX;
                }}
                onTouchEnd={(e) => {
                  const startX = (e.currentTarget as any)._touchStartX;
                  if (startX === undefined) return;
                  const endX = e.changedTouches[0].clientX;
                  const diff = startX - endX;
                  if (Math.abs(diff) > 50) {
                    if (diff > 0 && zoomIndex < productImages.length - 1) {
                      setZoomIndex(zoomIndex + 1);
                    } else if (diff < 0 && zoomIndex > 0) {
                      setZoomIndex(zoomIndex - 1);
                    }
                  }
                }}
                onMouseMove={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (!img) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  img.style.transformOrigin = `${x}% ${y}%`;
                  img.style.transform = 'scale(2)';
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) {
                    img.style.transform = 'scale(1)';
                    img.style.transformOrigin = 'center center';
                  }
                }}
              >
                <SignedImage
                  src={productImages[zoomIndex]}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain select-none transition-transform duration-150 ease-out"
                  draggable={false}
                />
              </div>

              {/* Desktop navigation arrows */}
              {zoomIndex > 0 && (
                <button
                  onClick={() => setZoomIndex(zoomIndex - 1)}
                  className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 bg-background/90 border border-border rounded-full w-9 h-9 items-center justify-center shadow-sm hover:bg-secondary transition-colors z-10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {zoomIndex < productImages.length - 1 && (
                <button
                  onClick={() => setZoomIndex(zoomIndex + 1)}
                  className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 bg-background/90 border border-border rounded-full w-9 h-9 items-center justify-center shadow-sm hover:bg-secondary transition-colors z-10"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Right side panel - product info + thumbnails (desktop) / bottom strip (mobile) */}
            <div className="flex flex-row md:flex-col gap-2 p-3 md:p-4 overflow-x-auto md:overflow-y-auto md:w-[280px] border-t md:border-t-0 md:border-l border-border bg-secondary/10 scrollbar-hide">
              {/* Product info - desktop only */}
              <div className="hidden md:block mb-2">
                <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-3 mb-1.5">{product.name}</h3>
                {selectedSize && (
                  <p className="text-xs text-muted-foreground">Size: <span className="font-medium text-foreground">{selectedSize}</span></p>
                )}
                {selectedColor && (
                  <p className="text-xs text-muted-foreground">Colour: <span className="font-medium text-foreground">{selectedColor}</span></p>
                )}
              </div>

              {/* Thumbnail grid - wrapping on desktop, horizontal on mobile */}
              <div className="flex md:flex-wrap gap-2">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setZoomIndex(idx)}
                    className={cn(
                      "flex-shrink-0 w-14 h-14 md:w-[60px] md:h-[60px] rounded-lg overflow-hidden border-2 transition-all",
                      zoomIndex === idx
                        ? "border-accent shadow-sm"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <SignedImage src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile image counter */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 md:hidden bg-black/60 text-white text-xs px-3 py-1 rounded-full">
              {zoomIndex + 1} / {productImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
