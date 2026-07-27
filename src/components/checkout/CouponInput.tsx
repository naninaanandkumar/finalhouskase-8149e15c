import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { Ticket, X, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const logCouponAttempt = async (payload: {
  code: string;
  subtotal: number;
  status: string;
  discount?: number;
  error_code?: string;
  error_message?: string;
}) => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("coupon_apply_logs" as any).insert({
      user_id: auth?.user?.id ?? null,
      code: payload.code,
      subtotal: payload.subtotal,
      discount: payload.discount ?? null,
      status: payload.status,
      error_code: payload.error_code ?? null,
      error_message: payload.error_message ?? null,
    });
  } catch {
    /* best-effort logging */
  }
};

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
}

interface CouponInputProps {
  subtotal: number;
  onApply: (discount: number, coupon: AppliedCoupon | null) => void;
}

export function CouponInput({ subtotal, onApply }: CouponInputProps) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [autoApplied, setAutoApplied] = useState(false);
  const { toast } = useToast();

  // Auto-apply coupon on mount
  useEffect(() => {
    const tryAutoApply = async () => {
      const { data } = await supabase.rpc("get_auto_apply_coupon", { _subtotal: subtotal });
      const c = Array.isArray(data) ? data[0] : data;
      if (c) {
        const disc = calcDiscount(c, subtotal);
        setApplied(c as AppliedCoupon);
        setAutoApplied(true);
        onApply(disc, c as AppliedCoupon);
      }
    };
    if (subtotal > 0 && !applied) tryAutoApply();
  }, [subtotal]);

  // Recalculate discount when subtotal changes for already-applied coupon
  useEffect(() => {
    if (applied && subtotal > 0) {
      const disc = calcDiscount(applied, subtotal);
      onApply(disc, applied);
    }
  }, [subtotal, applied]);

  const calcDiscount = (c: any, sub: number) => {
    let disc = c.discount_type === "percentage" ? (sub * c.discount_value) / 100 : c.discount_value;
    if (c.max_discount_amount && disc > c.max_discount_amount) disc = c.max_discount_amount;
    return Math.round(disc * 100) / 100;
  };

  const handleApply = async () => {
    const codeUpper = code.trim().toUpperCase();
    if (!codeUpper) return;
    setChecking(true);
    const { data: rows, error } = await supabase.rpc("validate_coupon", {
      _code: codeUpper,
      _subtotal: subtotal,
    });
    const data: any = Array.isArray(rows) ? rows[0] : rows;

    const showError = (title: string, description: string, errorCode: string) => {
      logCouponAttempt({ code: codeUpper, subtotal, status: "failed", error_code: errorCode, error_message: description });
      toast({
        title,
        description,
        variant: "destructive",
        action: (
          <ToastAction altText="Retry coupon" onClick={() => handleApply()}>
            Retry
          </ToastAction>
        ),
      });
      setChecking(false);
    };

    if (error) {
      showError("Coupon check failed", error.message, "rpc_error");
      return;
    }
    const errorMap: Record<string, { title: string; description: string }> = {
      invalid: { title: "Invalid Coupon", description: "This coupon code does not exist." },
      inactive: { title: "Coupon Inactive", description: "This coupon has been disabled." },
      not_started: {
        title: "Coupon Not Started",
        description: data?.starts_at
          ? `Valid from ${new Date(data.starts_at).toLocaleString()}`
          : "This coupon isn't active yet.",
      },
      expired: { title: "Coupon Expired", description: "This coupon has expired." },
      min_not_met: { title: "Minimum Not Met", description: `Min order ₹${data?.min_order_amount} required.` },
      exhausted: { title: "Coupon Exhausted", description: "This coupon has been fully used." },
    };
    if (!data || data.error) {
      const errCode = data?.error ?? "invalid";
      const e = errorMap[errCode] ?? errorMap.invalid;
      showError(e.title, e.description, errCode);
      return;
    }

    const disc = calcDiscount(data, subtotal);
    setApplied(data as AppliedCoupon);
    setAutoApplied(false);
    onApply(disc, data as AppliedCoupon);
    logCouponAttempt({ code: codeUpper, subtotal, status: "applied", discount: disc });
    toast({ title: "Coupon Applied!", description: `You save ₹${disc.toLocaleString("en-IN")}` });
    setChecking(false);
  };

  const handleRemove = () => {
    setApplied(null);
    setAutoApplied(false);
    setCode("");
    onApply(0, null);
  };

  if (applied) {
    const disc = calcDiscount(applied, subtotal);
    return (
      <div className="flex items-center justify-between p-2.5 rounded-lg border border-success/30 bg-success/5">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-success" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {applied.code} {autoApplied && <span className="text-[10px] text-muted-foreground font-normal">(Auto-applied)</span>}
            </p>
            <p className="text-[10px] text-success">You save ₹{disc.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <button onClick={handleRemove} className="text-muted-foreground hover:text-destructive transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
        <Ticket className="h-3.5 w-3.5 text-accent" />
        Have a coupon code?
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Enter coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="h-9 text-xs flex-1"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApply())}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 text-xs px-4"
          onClick={handleApply}
          disabled={checking || !code.trim()}
        >
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
        </Button>
      </div>
    </div>
  );
}
