import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Offer {
  id: string;
  offer_type: string;
  badge_label: string;
  description: string;
  details_url: string | null;
}

interface ProductOffersProps {
  categoryId?: string | null;
}

export function ProductOffers({ categoryId }: ProductOffersProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchOffers = async () => {
      let query = supabase
        .from("product_offers")
        .select("id, offer_type, badge_label, description, details_url")
        .eq("is_active", true)
        .order("sort_order");

      if (categoryId) {
        query = query.or(`category_id.eq.${categoryId},category_id.is.null`);
      } else {
        query = query.is("category_id", null);
      }

      const { data } = await query;
      setOffers(data || []);
    };

    fetchOffers();
  }, [categoryId]);

  if (offers.length === 0) return null;

  const visibleOffers = showAll ? offers : offers.slice(0, 3);

  return (
    <div className="bg-secondary/20 border border-border rounded-lg p-3.5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">Available Offers</p>
        {offers.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-accent hover:underline"
          >
            {showAll ? "Show less" : `View ${offers.length - 3} more offers`}
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        {visibleOffers.map((offer) => (
          <div key={offer.id} className="flex gap-2.5 items-start">
            <Tag className="h-4 w-4 text-accent mt-0.5 shrink-0 fill-accent/20" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-foreground">{offer.badge_label}</span>{" "}
              <span className="text-muted-foreground">{offer.description}</span>
              {offer.details_url && (
                <a
                  href={offer.details_url}
                  className="text-accent font-medium ml-1 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  T&C
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
