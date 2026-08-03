import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeading } from "./SectionHeading";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
}

const FALLBACK: Review[] = [
  { id: "f1", reviewer_name: "Ananya Sharma", rating: 5, review_text: "The bamboo towels are unbelievably soft and absorbent. Zero lint even after multiple washes." },
  { id: "f2", reviewer_name: "Rahul Mehta", rating: 5, review_text: "Ordered in bulk for our office pantry. Quality is consistent and delivery was quick." },
  { id: "f3", reviewer_name: "Priya Nair", rating: 4, review_text: "Great value for money. The cleaning cloths handle kitchen grease really well." },
  { id: "f4", reviewer_name: "Vikram Singh", rating: 5, review_text: "Packaging was premium and the products feel genuinely durable. Repeat customer now." },
];

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<Review[]>(FALLBACK);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, rating, review_text")
        .eq("is_approved", true)
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!isMounted) return;
      const rows = (data as Review[] | null)?.filter((r) => r.review_text) || [];
      if (rows.length >= 3) setReviews(rows);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="py-8 sm:py-10 bg-secondary/30">
      <div className="container mx-auto px-3 sm:px-4">
        <SectionHeading title="Product Reviews" subtitle="What People Say About Us?" />

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.slice(0, 4).map((r) => (
            <article
              key={r.id}
              className="relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
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
      </div>
    </section>
  );
}
