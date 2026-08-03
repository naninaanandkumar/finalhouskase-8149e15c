import { useEffect, useRef, useState } from "react";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "./SectionHeading";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
}

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, rating, review_text")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (!isMounted) return;
      const rows = (data as Review[] | null)?.filter((r) => r.review_text && r.review_text.trim()) || [];
      setReviews(rows);
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto slide
  useEffect(() => {
    if (reviews.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % reviews.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [reviews.length]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const card = el.children[active] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, [active]);

  return (
    <section className="py-8 sm:py-10 bg-[#ffffff]">
      <div className="container mx-auto px-3 sm:px-4">
        <SectionHeading title="Product Reviews" />

        {loading ? (
          <div className="flex gap-3 sm:gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[85%] sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3.5 w-28 mt-3" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No reviews yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Customer reviews will show up here.</p>
          </div>
        ) : (
          <>
        <div
          ref={railRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {reviews.map((r) => (
            <article
              key={r.id}
              className="relative shrink-0 snap-start w-[85%] sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <Quote className="absolute top-3 right-3 h-6 w-6 text-accent/15" />
              <div className="flex items-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">{r.review_text}</p>
              <p className="mt-3 text-sm font-semibold text-foreground">{r.reviewer_name}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          {reviews.map((r, i) => (
            <button
              key={r.id}
              type="button"
              aria-label={`Show review ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all ${active === i ? "w-5 bg-accent" : "w-2 bg-muted-foreground/30"}`}
            />
          ))}
        </div>
          </>
        )}
      </div>
    </section>
  );
}
