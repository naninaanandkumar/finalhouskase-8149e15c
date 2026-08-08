import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, Star, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FormattedProductText } from "@/components/products/FormattedProductText";
import DOMPurify from "dompurify";

interface ProductTabsProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    short_description?: string | null;
    features: string[] | null;
    weight: number | null;
    length: number | null;
    width: number | null;
    sku: string | null;
    category: { name: string } | null;
    brand: { name: string } | null;
  };
  selectedSize: string | null;
  selectedColor: string | null;
  currentMoq: number;
  hasExplicitMoq?: boolean;
  attributes?: { name: string; value: string }[];
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  is_verified: boolean;
  user_id?: string | null;
}

interface CustomTab {
  id: string;
  tab_title: string;
  tab_content: string;
}

export function ProductTabs({ product, selectedSize, selectedColor, currentMoq, hasExplicitMoq = false, attributes = [] }: ProductTabsProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const ratingRef = useRef<HTMLDivElement | null>(null);

  const fetchReviews = async () => {
    const { data } = await supabase.rpc("get_public_product_reviews" as any, { _product_id: product.id });
    const approved = ((data as any[]) || []).map((r) => ({ ...r, user_id: null as string | null }));

    // Merge current user's own reviews (may include pending) so they can edit/delete
    if (user?.id) {
      const { data: mine } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, rating, review_text, created_at, is_verified, user_id")
        .eq("product_id", product.id)
        .eq("user_id", user.id);
      const mineArr = (mine as Review[]) || [];
      const mineIds = new Set(mineArr.map((r) => r.id));
      const merged = [...mineArr, ...approved.filter((r) => !mineIds.has(r.id))];
      merged.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      setReviews(merged as Review[]);
    } else {
      setReviews(approved as Review[]);
    }
  };

  useEffect(() => {
    fetchReviews();
    supabase
      .from("product_custom_tabs")
      .select("id, tab_title, tab_content")
      .eq("product_id", product.id)
      .order("sort_order")
      .then(({ data }) => setCustomTabs((data as CustomTab[]) || []));

    const channel = supabase
      .channel(`product_reviews:${product.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_reviews", filter: `product_id=eq.${product.id}` },
        () => fetchReviews()
      )
      .subscribe();

    const onFocus = () => fetchReviews();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [product.id]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const resetForm = () => {
    setShowReviewForm(false);
    setEditingId(null);
    setReviewText("");
    setReviewRating(0);
    setRatingError(false);
  };

  const openNewForm = () => {
    setEditingId(null);
    setReviewerName(profile?.full_name || "");
    setReviewText("");
    setReviewRating(0);
    setRatingError(false);
    setShowReviewForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const openEditForm = (r: Review) => {
    setEditingId(r.id);
    setReviewerName(r.reviewer_name);
    setReviewText(r.review_text || "");
    setReviewRating(r.rating);
    setRatingError(false);
    setShowReviewForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review deleted" });
      fetchReviews();
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: "Please login to submit a review", variant: "destructive" });
      return;
    }
    if (!reviewerName.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setRatingError(true);
      toast({ title: "Please select a star rating (1-5)", variant: "destructive" });
      ratingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("product_reviews")
        .update({
          reviewer_name: reviewerName.trim(),
          rating: reviewRating,
          review_text: reviewText.trim() || null,
        })
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("product_reviews").insert({
        product_id: product.id,
        user_id: user.id,
        reviewer_name: reviewerName.trim(),
        rating: reviewRating,
        review_text: reviewText.trim() || null,
        is_approved: true,
      }));
    }
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to save review", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Review updated!" : "Review submitted!" });
      resetForm();
      fetchReviews();
    }
  };

  const specRows = (() => {
    const grouped: Record<string, string[]> = {};
    attributes.forEach((attribute) => {
      if (!attribute.name || !attribute.value) return;
      if (!grouped[attribute.name]) grouped[attribute.name] = [];
      grouped[attribute.name].push(attribute.value);
    });

    const rows = Object.entries(grouped).map(([name, values]) => {
      const lower = name.toLowerCase();
      let displayValues = values;
      if ((lower === "color" || lower === "colour") && selectedColor) displayValues = [selectedColor];
      if (lower === "size" && selectedSize) displayValues = [selectedSize];
      return { label: name, value: displayValues.join(", ") };
    });

    if (selectedSize) rows.unshift({ label: "Variant", value: `${selectedSize}${selectedColor ? ` - ${selectedColor}` : ""}` });
    if (product.weight != null && product.weight > 0) rows.push({ label: "Weight", value: `${product.weight} kg` });
    if (product.length != null && product.length > 0) rows.push({ label: "Length", value: `${product.length} cm` });
    if (product.width != null && product.width > 0) rows.push({ label: "Diameter", value: `${product.width} mm` });
    if (product.sku) rows.push({ label: "SKU", value: product.sku });
    if (product.brand) rows.push({ label: "Brand", value: product.brand.name });
    if (product.category && !rows.some((row) => row.label.toLowerCase() === "type of product")) {
      rows.push({ label: "Type of Product", value: product.category.name });
    }
    if (hasExplicitMoq) rows.push({ label: "MOQ", value: `${currentMoq} units` });

    return rows;
  })();

  return (
    <div className="mt-8">
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="w-full justify-start h-10 p-0 bg-transparent border-b border-border rounded-none overflow-x-auto">
          <TabsTrigger
            value="description"
            className="text-sm px-6 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent"
          >
            DESCRIPTION
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className="text-sm px-6 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent"
          >
            SPECIFICATIONS
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="text-sm px-6 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent"
          >
            REVIEWS ({reviews.length})
          </TabsTrigger>
          {customTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={`custom-${tab.id}`}
              className="text-sm px-6 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent"
            >
              {tab.tab_title.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="description" className="mt-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="prose prose-sm max-w-none text-muted-foreground
              [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-3
              [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2
              [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-2
              [&_p]:mb-3 [&_p]:leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
              [&_strong]:text-foreground [&_strong]:font-semibold
              [&_em]:italic
              [&_br]:block [&_br]:mb-1
            ">
              {product.description || product.short_description ? (
                <FormattedProductText text={product.description || product.short_description} />
              ) : (
                <p>No detailed description available for this product.</p>
              )}
              {Array.isArray((product as any).description_blocks) && (product as any).description_blocks.length > 0 && (
                <div className="mt-6 space-y-4 not-prose">
                  {((product as any).description_blocks as Array<{ image?: string; text?: string }>).map((block, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      {block.image ? (
                        <img
                          src={block.image}
                          alt=""
                          loading="lazy"
                          className="w-full rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div />
                      )}
                      {block.text ? (
                        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          <FormattedProductText text={block.text} />
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {product.features && product.features.filter(f => f.trim()).length > 0 && (
                <ul className="mt-4 space-y-2">
                  {product.features
                    .filter((f) => f.trim().length > 0)
                    .map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="specs" className="mt-4">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {specRows.length > 0 ? (
              specRows.map((row, index) => <SpecRow key={`${row.label}-${index}`} label={row.label} value={row.value} border={index > 0} />)
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No specifications available for this product.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-foreground">{avgRating}</span>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{reviews.length} reviews</p>
                </div>
              </div>
              {user && !showReviewForm && (
                <Button size="sm" variant="outline" onClick={openNewForm}>
                  Write a Review
                </Button>
              )}
            </div>

            {showReviewForm && (
              <div ref={formRef} className="border border-border rounded-lg p-4 space-y-3">
                <Input
                  placeholder="Your name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="h-9 text-sm"
                />
                <div ref={ratingRef}>
                  <div
                    className={`flex items-center gap-1 p-2 rounded-md border ${
                      ratingError ? "border-destructive bg-destructive/5" : "border-transparent"
                    }`}
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setReviewRating(s);
                          setRatingError(false);
                        }}
                        aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            s <= reviewRating ? "fill-warning text-warning" : "text-muted-foreground/30 hover:text-warning/50"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {reviewRating > 0 ? `${reviewRating}/5` : "Required"}
                    </span>
                  </div>
                  {ratingError && (
                    <p className="text-xs text-destructive mt-1">Please select a rating between 1 and 5 stars.</p>
                  )}
                </div>
                <Textarea
                  placeholder="Write your review (optional)"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmitReview} disabled={submitting}>
                    {submitting ? "Saving..." : editingId ? "Update Review" : "Submit Review"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reviews yet. Be the first to review this product!
              </p>
            ) : (
              <div className="space-y-4 divide-y divide-border">
                {reviews.map((review) => {
                  const isOwner = !!user && review.user_id === user.id;
                  return (
                    <div key={review.id} className="pt-4 first:pt-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{review.reviewer_name}</span>
                          {review.is_verified && (
                            <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded">Verified</span>
                          )}
                          {isOwner && (
                            <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">You</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                          {isOwner && (
                            <>
                              <button
                                onClick={() => openEditForm(review)}
                                className="p-1 hover:bg-secondary rounded"
                                aria-label="Edit review"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleDelete(review.id)}
                                className="p-1 hover:bg-secondary rounded"
                                aria-label="Delete review"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${s <= review.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                      {review.review_text && (
                        <p className="text-sm text-muted-foreground">{review.review_text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {customTabs.map((tab) => (
          <TabsContent key={tab.id} value={`custom-${tab.id}`} className="mt-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tab.tab_content ?? "") }} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SpecRow({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`grid grid-cols-2 divide-x divide-border text-sm ${border ? "border-t border-border" : ""}`}>
      <div className="p-3 bg-secondary/30">{label}</div>
      <div className="p-3">{value}</div>
    </div>
  );
}
