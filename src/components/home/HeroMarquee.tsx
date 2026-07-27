import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MarqueeItem {
  id: string;
  text: string;
  icon?: string | null;
}

const DUMMY: MarqueeItem[] = [
  { id: "h1", text: "🌿 100% Bamboo — Ultra-absorbent & lint-free" },
  { id: "h2", text: "🚚 Free shipping across India on orders above ₹499" },
  { id: "h3", text: "🏆 Trusted by 25,000+ homes & businesses" },
  { id: "h4", text: "♻️ Reusable, washable & eco-friendly essentials" },
  { id: "h5", text: "💬 Bulk quote in 2–8 hours — Ask for Bulk Qty Quote" },
  { id: "h6", text: "⭐ 4.8/5 average rating from verified buyers" },
];

export function HeroMarquee() {
  const [items, setItems] = useState<MarqueeItem[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "hero_marquee")
        .maybeSingle();
      const v = data?.value as any;
      if (v?.enabled === false) {
        setEnabled(false);
        return;
      }
      if (Array.isArray(v?.items) && v.items.length) {
        setItems(
          v.items
            .filter((i: any) => i?.text)
            .map((i: any, idx: number) => ({
              id: i.id || `hm-${idx}`,
              text: i.text,
            })),
        );
      }
    })();
  }, []);

  const list = useMemo(() => (items.length ? items : DUMMY), [items]);

  if (!enabled || list.length === 0) return null;

  const loop = [...list, ...list];

  return (
    <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 border-y border-accent/20 overflow-hidden">
      <div className="marquee-track h-10 sm:h-11 flex items-center relative overflow-hidden">
        <div className="animate-marquee-fast flex whitespace-nowrap min-w-max">
          {loop.map((s, i) => (
            <span
              key={`${s.id}-${i}`}
              className="inline-flex items-center gap-2 px-6 text-[12px] sm:text-[13px] font-semibold text-foreground/85"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>{s.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
