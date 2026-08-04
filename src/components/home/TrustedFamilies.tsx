import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/common/SignedImage";

interface FamilyTestimonial {
  id: string;
  name: string;
  age: string | null;
  heading: string;
  message: string;
  rating: number;
  image_url: string | null;
}

export function TrustedFamilies() {
  const [items, setItems] = useState<FamilyTestimonial[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchItems = async () => {
      const { data } = await supabase
        .from("family_testimonials")
        .select("id, name, age, heading, message, rating, image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!cancelled) setItems((data as FamilyTestimonial[]) || []);
    };
    fetchItems();
    // Instant refresh when an admin adds / edits / reorders / deletes a testimonial.
    const channel = supabase
      .channel("family_testimonials_public")
      .on("postgres_changes", { event: "*", schema: "public", table: "family_testimonials" }, fetchItems)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const pages = Math.max(1, Math.ceil(items.length / 2));

  useEffect(() => {
    if (items.length <= 2) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % pages), 4000);
    return () => window.clearInterval(id);
  }, [items.length, pages]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const card = el.children[active * 2] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, [active]);

  if (items.length === 0) return null;

  return (
    <section className="py-10 sm:py-14 bg-foreground">
      <div className="container mx-auto px-3 sm:px-4">
        <h2 className="text-center text-2xl sm:text-4xl font-display font-bold text-background mb-6 sm:mb-10">
          Trusted by Families
        </h2>

        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1"
        >
          {items.map((item) => (
            <article
              key={item.id}
              className="shrink-0 snap-start w-[90%] sm:w-[calc(50%-0.5rem)] rounded-xl overflow-hidden bg-muted/10 flex flex-col sm:flex-row"
            >
              {item.image_url && (
                <div className="sm:w-2/5 aspect-[4/3] sm:aspect-auto bg-secondary/20">
                  <SignedImage src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 p-4 sm:p-5">
                <h3 className="text-background font-bold text-sm sm:text-base">{item.heading}</h3>
                <p className="mt-2 text-background/80 text-sm leading-relaxed line-clamp-6">{item.message}</p>
                <p className="mt-3 text-background font-bold text-sm">
                  {item.name}
                  {item.age ? `, ${item.age}` : ""}
                </p>
                <div className="mt-1 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${n <= item.rating ? "fill-accent text-accent" : "text-accent"}`}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {pages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-2 w-2 rounded-full transition-colors ${i === active ? "bg-background" : "bg-background/40"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}