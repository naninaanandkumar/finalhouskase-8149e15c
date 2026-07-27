import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Star, Check, X, Trash2, MessageSquare, Search } from "lucide-react";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  is_approved: boolean | null;
  is_verified: boolean | null;
  created_at: string;
  product: { name: string } | null;
}

type Filter = "all" | "pending" | "approved" | "rejected";

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState<number>(0);

  const fetchReviews = async () => {
    setLoading(true);
    let query = supabase
      .from("product_reviews")
      .select("id, reviewer_name, rating, review_text, is_approved, is_verified, created_at, product:products(name)")
      .order("created_at", { ascending: false });

    if (filter === "pending") query = query.is("is_approved", null);
    if (filter === "approved") query = query.eq("is_approved", true);
    if (filter === "rejected") query = query.eq("is_approved", false);

    const { data } = await query;
    setReviews((data as unknown as Review[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const approveReview = async (id: string) => {
    await supabase.from("product_reviews").update({ is_approved: true }).eq("id", id);
    toast({ title: "Review approved" });
    fetchReviews();
  };

  const rejectReview = async (id: string) => {
    await supabase.from("product_reviews").update({ is_approved: false }).eq("id", id);
    toast({ title: "Review rejected" });
    fetchReviews();
  };

  const toggleVerified = async (id: string, current: boolean | null) => {
    await supabase.from("product_reviews").update({ is_verified: !current }).eq("id", id);
    fetchReviews();
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("product_reviews").delete().eq("id", id);
    toast({ title: "Review deleted" });
    fetchReviews();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (minRating > 0 && r.rating < minRating) return false;
      if (!q) return true;
      return (
        r.reviewer_name.toLowerCase().includes(q) ||
        (r.review_text || "").toLowerCase().includes(q) ||
        (r.product?.name || "").toLowerCase().includes(q)
      );
    });
  }, [reviews, search, minRating]);

  const counts = useMemo(() => ({
    total: reviews.length,
  }), [reviews]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Reviews</h1>
          <p className="text-sm text-muted-foreground">Approve, reject, or manage customer reviews</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by reviewer, product, or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1">Min rating:</span>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={minRating === n ? "default" : "outline"}
              className="h-8 w-8 p-0 text-xs"
              onClick={() => setMinRating(n)}
            >
              {n === 0 ? "All" : n}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {counts.total} reviews
      </p>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reviews found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{review.reviewer_name}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      {review.is_verified && <Badge variant="secondary" className="text-[10px] bg-success/10 text-success">Verified</Badge>}
                      {review.is_approved === null && <Badge variant="secondary" className="text-[10px] bg-warning/10 text-warning">Pending</Badge>}
                      {review.is_approved === true && <Badge variant="secondary" className="text-[10px] bg-success/10 text-success">Approved</Badge>}
                      {review.is_approved === false && <Badge variant="secondary" className="text-[10px] bg-destructive/10 text-destructive">Rejected</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Product: {review.product?.name || "Unknown"} • {new Date(review.created_at).toLocaleDateString()}
                    </p>
                    {review.review_text && (
                      <p className="text-sm text-muted-foreground">{review.review_text}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Approve" onClick={() => approveReview(review.id)}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Reject" onClick={() => rejectReview(review.id)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Toggle Verified" onClick={() => toggleVerified(review.id, review.is_verified)}>
                      <Star className="h-4 w-4 text-warning" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete" onClick={() => deleteReview(review.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
