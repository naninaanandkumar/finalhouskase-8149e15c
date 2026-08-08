import { useEffect, useMemo, useState } from "react";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  text: string;
  code?: string | null;
}

export function AnnouncementBar() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "announcement_bar")
        .maybeSingle();
      const saved = setting?.value as any;
      if (saved?.enabled === false) {
        setEnabled(false);
        return;
      }
      if (Array.isArray(saved?.items) && saved.items.length) {
        setItems(
          saved.items
            .filter((i: any) => i?.text)
            .map((i: any, idx: number) => ({
              id: i.id || `custom-${idx}`,
              text: i.text,
              code: i.code || null,
            })),
        );
        return;
      }

      const { data } = await supabase.rpc("list_public_coupons" as any, { _category_id: null });
      const mapped: Announcement[] = (Array.isArray(data) ? data : []).slice(0, 6).map((c: any) => ({
        id: c.id,
        text:
          c.description ||
          (c.discount_type === "percentage"
            ? `Flat ${c.discount_value}% OFF`
            : `Flat ₹${c.discount_value} OFF`),
        code: c.code,
      }));
      setItems(mapped);
    })();
  }, []);

  const slides = useMemo(() => {
    if (items.length > 0) return items;
    return [
      { id: "d1", text: "Free Shipping on Orders Above ₹499", code: null },
      { id: "d2", text: "Buy Any 3 Products @ ₹1149 + Free Gift", code: "BUY1149" },
      { id: "d3", text: "Flat 10% OFF on Prepaid Orders", code: "HYP15" },
      { id: "d4", text: "New arrivals every week — Premium bamboo essentials", code: null },
    ];
  }, [items]);

  if (!enabled || slides.length === 0) return null;

  // Repeat enough times so duplicated content always exceeds viewport width (seamless loop)
  const baseRepeats = Math.max(2, Math.ceil(20 / slides.length));
  const repeats = baseRepeats % 2 === 0 ? baseRepeats : baseRepeats + 1;
  const loop = Array.from({ length: repeats }).flatMap(() => slides);

  return (
    <div className="bg-background text-foreground border-y border-border overflow-hidden">
      <div className="marquee-track h-8 flex items-center relative overflow-hidden">
        <div className="animate-marquee flex whitespace-nowrap min-w-max">
          {loop.map((s, i) => (
            <span
              key={`${s.id}-${i}`}
              className="inline-flex items-center gap-2 px-6 text-[12px] sm:text-[13px] font-medium"
            >
              <Gift className="h-3.5 w-3.5 shrink-0" />
              <span>{s.text}</span>
              {s.code && (
                <span className="opacity-90">
                  • Use Code: <b className="font-bold tracking-wide">{s.code}</b>
                </span>
              )}
              <span className="mx-2 opacity-40">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
