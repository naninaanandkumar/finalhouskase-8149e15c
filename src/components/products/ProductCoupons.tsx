import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  title?: string | null;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
}

interface ProductCouponsProps {
  categoryId?: string | null;
}

// Fixed-size ticket voucher inspired by the uploaded coupon reference.
export function ProductCoupons({ categoryId }: ProductCouponsProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCoupons = async () => {
      const { data } = await supabase.rpc("list_public_coupons" as any, {
        _category_id: categoryId ?? null,
      });
      const filtered = (Array.isArray(data) ? data : []).filter((c: any) => c.show_on_product);
      setCoupons(filtered.slice(0, 4) as Coupon[]);
    };
    fetchCoupons();
  }, [categoryId]);

  if (coupons.length === 0) return null;

  const handleCopy = (coupon: Coupon) => {
    navigator.clipboard.writeText(coupon.code);
    setCopiedId(coupon.id);
    toast({ title: "Copied!", description: `Coupon code ${coupon.code} copied.` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-extrabold tracking-[0.18em] text-foreground uppercase">
        Active Offers
      </p>
      <div className="flex flex-wrap gap-3">
        {coupons.map((c) => {
          const isCopied = copiedId === c.id;
          const headline =
            c.title || (c.discount_type === "percentage"
              ? `FLAT ${c.discount_value}% OFF`
              : `FLAT ₹${c.discount_value} OFF`);
          const subline =
            c.description ||
            (c.min_order_amount && c.min_order_amount > 0
              ? `Min order ₹${c.min_order_amount}`
              : "+ 5% off on Prepaid orders");
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCopy(c)}
              className="group relative h-[105px] w-[210px] shrink-0 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[14px] border-[1.5px] border-coupon-ink bg-coupon-surface px-[18px] py-[13px] shadow-sm">
                <div className="text-[15px] leading-none font-bold text-coupon-ink truncate">
                  {headline}
                </div>
                <div className="mt-1 text-[12px] leading-tight font-semibold text-coupon-description truncate">
                  {subline}
                </div>

                <div className="relative mt-[11px]">
                  <div
                    aria-hidden
                    className="absolute -left-[8px] top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border-[1.5px] border-coupon-ink bg-coupon-surface"
                  />
                  <div
                    aria-hidden
                    className="absolute -right-[8px] top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border-[1.5px] border-coupon-ink bg-coupon-surface"
                  />
                  <div className="flex h-[34px] items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-coupon-ink bg-coupon-code px-6">
                    <span className="relative inline-block h-[18px] w-[18px] shrink-0">
                      {isCopied ? (
                        <Check className="h-[18px] w-[18px] text-coupon-ink" />
                      ) : (
                        <>
                          <span className="absolute left-[6px] top-0 h-[14px] w-[10px] rounded-[2px] border-[1.5px] border-coupon-ink bg-coupon-code" />
                          <span className="absolute left-0 top-[4px] h-[14px] w-[10px] rounded-[2px] border-[1.5px] border-coupon-ink bg-coupon-code" />
                        </>
                      )}
                    </span>
                    <span className="min-w-0 truncate text-[19px] font-bold leading-none text-coupon-ink">{c.code}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
