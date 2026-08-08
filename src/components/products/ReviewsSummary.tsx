import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReviewsSummaryProps {
  productId: string;
}

export function ReviewsSummary({ productId }: ReviewsSummaryProps) {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.rpc("get_product_review_stats" as any, { _product_id: productId });
      const row: any = Array.isArray(data) ? data[0] : data;
      if (row && Number(row.review_count) > 0) {
        setAvg(Math.round(Number(row.avg_rating) * 10) / 10);
        setCount(Number(row.review_count));
      }
    };
    fetch();
  }, [productId]);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${star <= Math.round(avg) ? "fill-warning text-warning" : "text-muted-foreground"}`}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-foreground">{avg}</span>
      <span className="text-xs text-muted-foreground">({count} ratings)</span>
    </div>
  );
}
