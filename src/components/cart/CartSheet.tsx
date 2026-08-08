import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, Plus, Minus, AlertTriangle, Ticket, ChevronRight, Settings } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { SignedImage } from "@/components/common/SignedImage";
import { supabase } from "@/integrations/supabase/client";
const CHECKOUT_ICON_URL = "https://ik.imagekit.io/houskase/checkout-btn-icon.svg";

export function CartSheet() {
  const {
    items,
    isLoading,
    buyerType,
    updateQuantity,
    removeFromCart,
    getItemPrice,
    getItemMoq,
    validateMoq,
    subtotal,
    itemCount,
    allMoqValid,
  } = useCart();

  // Dynamic tiers based on unit price of first item in cart
  const firstPrice = items[0] ? getItemPrice(items[0]) : 0;
  const tiers = [
    { count: 1, label: firstPrice ? `₹${firstPrice.toLocaleString("en-IN")}` : "1 Item" },
    { count: 2, label: firstPrice ? `Buy 2 @ ${Math.round(firstPrice * 2 * 0.9).toLocaleString("en-IN")}` : "10% OFF" },
    { count: 3, label: firstPrice ? `Buy 3 @ ${Math.round(firstPrice * 3 * 0.8).toLocaleString("en-IN")}` : "20% OFF" },
  ];
  const nextTier = tiers.find((t) => itemCount < t.count);
  const progressPct = Math.min(100, (itemCount / 3) * 100);

  // Load an active coupon (if any) to show as suggestion
  const [suggestedCoupon, setSuggestedCoupon] = useState<{ code: string } | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("list_public_coupons" as any, { _category_id: null });
      const first = (Array.isArray(data) ? data[0] : null) as any;
      if (first?.code) setSuggestedCoupon({ code: String(first.code) });
    })();
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label={`Open cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`} className="relative flex flex-col items-center justify-center hover:bg-secondary/50 rounded-md transition-colors">
          <div className="relative">
            <div className="w-6 h-6 rounded-full border-2 border-foreground flex items-center justify-center">
              <ShoppingCart className="h-3.5 w-3.5 text-foreground" />
            </div>
            {itemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[9px] bg-accent">
                {itemCount}
              </Badge>
            )}
          </div>
          <span className="hidden sm:block text-[10px] text-foreground font-medium mt-0.5">Cart</span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-secondary/40">
        <SheetHeader className="px-4 py-3 bg-background border-b">
          <SheetTitle className="text-base font-semibold">
            Your Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
          </SheetTitle>
        </SheetHeader>

        {items.length > 0 && (
          <div className="bg-background px-4 py-3 border-b">
            <p className="text-center text-sm font-semibold mb-3">
              {nextTier
                ? `Add ${nextTier.count - itemCount} More to ${nextTier.label} 🎁`
                : "🎉 You unlocked all offers!"}
            </p>
            <div className="relative">
              <div className="absolute top-3 left-0 right-0 h-1 bg-border rounded-full" />
              <div
                className="absolute top-3 left-0 h-1 bg-accent rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
              <div className="relative flex justify-between">
                {tiers.map((t) => {
                  const reached = itemCount >= t.count;
                  return (
                    <div key={t.count} className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border-2 bg-background",
                        reached ? "border-accent text-accent" : "border-border text-muted-foreground"
                      )}>
                        <Settings className="h-3 w-3" />
                      </div>
                      <p className="text-[10px] font-semibold text-foreground">{t.count} {t.count === 1 ? "Item" : "Items"}</p>
                      <p className={cn("text-[10px] font-medium", reached ? "text-accent" : "text-muted-foreground")}>{t.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <Link to="/products" className="mt-4">
                <Button variant="outline">Browse Products</Button>
              </Link>
            </div>
          ) : (
            <>
              {items.map((item) => {
                const price = getItemPrice(item);
                const moq = getItemMoq(item);
                const isValidMoq = validateMoq(item);
                const productImage = item.product?.images?.[0];

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-xl bg-background border",
                      !isValidMoq ? "border-destructive" : "border-border"
                    )}
                  >
                    {/* Image */}
                    <div className="w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {productImage ? (
                        <SignedImage
                          src={productImage}
                          alt={item.product?.name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/product/${item.product_id}`} onClick={(e) => e.stopPropagation()} className="hover:text-accent transition-colors flex-1 min-w-0">
                          <h4 className="font-semibold text-xs uppercase leading-tight line-clamp-2">
                            {item.product?.name || "Unknown Product"}
                          </h4>
                        </Link>
                        <span className="text-sm font-bold whitespace-nowrap">
                          ₹{price.toLocaleString("en-IN")}
                        </span>
                      </div>
                      {item.variation && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[item.variation.size, item.variation.color].filter(Boolean).join(" / ")}
                        </p>
                      )}

                      {/* MOQ Warning */}
                      {!isValidMoq && (
                        <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          Min. {moq} units required
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-border rounded-md">
                          <button
                            aria-label="Decrease quantity"
                            onClick={() => updateQuantity(item.id, Math.max(moq, item.quantity - 1))}
                            className="p-1 hover:bg-secondary"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            aria-label="Increase quantity"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-secondary"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          aria-label="Remove item"
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Coupon row - only if there is an actual coupon */}
              {suggestedCoupon && (
                <div className="bg-background border border-border rounded-xl p-3 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-success" />
                  <span className="text-sm font-bold">{suggestedCoupon.code}</span>
                  <Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px]">
                    Save more with coupon
                  </Badge>
                  <Link to="/checkout" className="ml-auto text-sm font-semibold text-success">Apply</Link>
                </div>
              )}

              <Link
                to="/products"
                className="bg-background border border-border rounded-xl p-3 flex items-center justify-center gap-1 text-sm font-semibold text-accent"
              >
                View All Offers <ChevronRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-3 border-t pt-3 px-4 pb-4 bg-background">
            {!allMoqValid && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Some items don't meet the minimum order quantity.</span>
              </div>
            )}

            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-2 font-semibold text-sm">
                <Ticket className="h-4 w-4" /> Estimated Total
              </span>
              <span className="text-lg font-bold">₹{subtotal.toLocaleString("en-IN")}</span>
            </div>

            <Link to="/checkout" className="w-full">
              <Button
                className="w-full h-12 rounded-xl bg-[#AD1E2A] text-white hover:bg-[#8b1822] disabled:opacity-60 inline-flex items-center justify-center gap-2 px-2"
                disabled={!allMoqValid || isLoading}
              >
                <span className="text-sm font-bold tracking-wide">{isLoading ? "Loading..." : "PLACE ORDER"}</span>
                <img src={CHECKOUT_ICON_URL} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
              </Button>
            </Link>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}