import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Star, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ImagePlus, X, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignedImage } from "@/components/common/SignedImage";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  review_title?: string | null;
  photos?: string[] | null;
  created_at: string;
  is_verified: boolean;
  user_id?: string | null;
}

const PER_PAGE = 6;
const MAX_PHOTOS = 4;
const MAX_PHOTO_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const ALLOWED_LABEL = "JPG, PNG, WEBP, AVIF or GIF";

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${size} ${s <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export interface ReviewStats {
  avg: number;
  total: number;
  items: { author: string; rating: number; title?: string | null; body?: string | null; date: string }[];
}

export function CustomerReviews({
  productId,
  productName,
  onStats,
}: {
  productId: string;
  productName?: string;
  productUrl?: string;
  onStats?: (stats: ReviewStats) => void;
}) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("reviewSort") || "recent";
  const page = Math.max(1, parseInt(searchParams.get("reviewPage") || "1", 10) || 1);
  const setSort = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("reviewSort", v);
    next.delete("reviewPage");
    setSearchParams(next, { replace: true });
  };
  const setPage = (v: number | ((p: number) => number)) => {
    const value = typeof v === "function" ? v(page) : v;
    const next = new URLSearchParams(searchParams);
    if (value <= 1) next.delete("reviewPage");
    else next.set("reviewPage", String(value));
    setSearchParams(next, { replace: true });
  };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchReviews = async () => {
    const { data } = await supabase.rpc("get_public_product_reviews", { _product_id: productId });
    const approved = ((data as any[]) || []).map((r) => ({ ...r, user_id: null as string | null }));
    if (user?.id) {
      const { data: mine } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, rating, review_text, review_title, photos, created_at, is_verified, user_id")
        .eq("product_id", productId)
        .eq("user_id", user.id);
      const mineArr = (mine as Review[]) || [];
      const mineIds = new Set(mineArr.map((r) => r.id));
      setReviews([...mineArr, ...approved.filter((r) => !mineIds.has(r.id))] as Review[]);
    } else {
      setReviews(approved as Review[]);
    }
    setLoading(false);
  };

  // Debounced refetch — collapses realtime bursts into a single request.
  const scheduleFetch = (delay = 300) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchReviews();
    }, delay);
  };

  useEffect(() => {
    setLoading(true);
    fetchReviews();
    const channel = supabase
      .channel(`customer_reviews:${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_reviews", filter: `product_id=eq.${productId}` },
        () => scheduleFetch()
      )
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, user?.id]);

  // Brief skeleton while sort/page (URL params) change, so the list swap isn't jarring.
  useEffect(() => {
    if (loading) return;
    setPending(true);
    const t = setTimeout(() => setPending(false), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, page]);

  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const sorted = useMemo(() => {
    const list = [...reviews];
    if (sort === "recent") list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (sort === "oldest") list.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    if (sort === "highest") list.sort((a, b) => b.rating - a.rating);
    if (sort === "lowest") list.sort((a, b) => a.rating - b.rating);
    return list;
  }, [reviews, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const current = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setRating(0);
    setHoverRating(0);
    setTitle("");
    setText("");
    setPhotos([]);
  };

  const openNew = () => {
    if (!user) {
      toast({ title: "Please login to write a review", variant: "destructive" });
      return;
    }
    setEditingId(null);
    setName(profile?.full_name || "");
    setTitle("");
    setText("");
    setPhotos([]);
    setRating(0);
    setShowForm(true);
  };

  const openEdit = (r: Review) => {
    setEditingId(r.id);
    setName(r.reviewer_name);
    setTitle(r.review_title || "");
    setText(r.review_text || "");
    setPhotos(r.photos || []);
    setRating(r.rating);
    setShowForm(true);
  };

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    const all = Array.from(files);
    const remaining = MAX_PHOTOS - photos.length;
    if (all.length > remaining) {
      toast({
        title: `You can add ${remaining} more photo${remaining === 1 ? "" : "s"}`,
        description: `A review can include up to ${MAX_PHOTOS} photos.`,
        variant: "destructive",
      });
    }
    const picked = all.slice(0, Math.max(0, remaining));
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: `"${file.name}" is not a supported image`,
          description: `Allowed formats: ${ALLOWED_LABEL}.`,
          variant: "destructive",
        });
        continue;
      }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        toast({
          title: `"${file.name}" is too large`,
          description: `Each image must be under ${MAX_PHOTO_MB}MB (this one is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
          variant: "destructive",
        });
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `reviews/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) {
        toast({ title: `Could not upload "${file.name}"`, description: error.message, variant: "destructive" });
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setPhotos((p) => [...p, ...uploaded].slice(0, MAX_PHOTOS));
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const prev = reviews;
    setReviews((rs) => rs.filter((r) => r.id !== id)); // optimistic
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) {
      setReviews(prev);
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review deleted" });
      scheduleFetch(600);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!rating) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = {
      reviewer_name: name.trim(),
      rating,
      review_title: title.trim() || null,
      review_text: text.trim() || null,
      photos,
    };
    const { error } = editingId
      ? await supabase.from("product_reviews").update(payload).eq("id", editingId)
      : await supabase.from("product_reviews").insert({
          product_id: productId,
          user_id: user.id,
          is_approved: true,
          ...payload,
        });
    setSubmitting(false);
    if (error) toast({ title: "Failed to save review", description: error.message, variant: "destructive" });
    else {
      // Optimistic UI so the change is visible before the refetch lands.
      if (editingId) {
        const id = editingId;
        setReviews((rs) => rs.map((r) => (r.id === id ? { ...r, ...payload } : r)));
      }
      toast({ title: editingId ? "Review updated!" : "Review submitted!" });
      resetForm();
      await fetchReviews();
    }
  };

  // Report aggregate stats upward so the page can embed them inside the single
  // Product JSON-LD node (avoids duplicate Product entities in rich results).
  const statsRef = useRef("");
  useEffect(() => {
    if (!onStats) return;
    const items = [...reviews]
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .slice(0, 20)
      .map((r) => ({
        author: r.reviewer_name,
        rating: r.rating,
        title: r.review_title,
        body: r.review_text,
        date: r.created_at,
      }));
    const payload: ReviewStats = { avg, total, items };
    const key = JSON.stringify(payload);
    if (key === statsRef.current) return;
    statsRef.current = key;
    onStats(payload);
  }, [reviews, avg, total, onStats]);

  return (
    <section className="mt-10" aria-labelledby="customer-reviews-heading">
      {/* Summary card */}
      <div className="rounded-lg border border-border bg-card px-4 py-6 sm:px-8">
        <h2 id="customer-reviews-heading" className="text-center text-xl font-bold text-foreground">
          Customer Reviews
        </h2>
        <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
          <div className="flex flex-col items-center gap-1">
            <Stars value={avg} />
            <span className="sr-only">{`Average rating ${avg ? avg.toFixed(2) : "0.00"} out of 5 from ${total} reviews`}</span>
            <span className="text-sm font-medium text-accent underline underline-offset-2">
              {avg ? avg.toFixed(2) : "0.00"} out of 5
            </span>
            <span className="text-sm text-muted-foreground">Based on {total} reviews</span>
          </div>

          <div className="hidden md:block h-16 w-px bg-border" />

          <div className="space-y-1.5">
            {buckets.map((b) => (
              <div key={b.star} className="flex items-center gap-3">
                <Stars value={b.star} size="h-3.5 w-3.5" />
                <div className="h-3 flex-1 overflow-hidden rounded-sm bg-secondary">
                  <div
                    className="h-full bg-accent"
                    style={{ width: total ? `${(b.count / total) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-muted-foreground">{b.count}</span>
              </div>
            ))}
          </div>

          <div className="hidden md:block h-16 w-px bg-border" />

          <div className="flex justify-center">
            <Button className="px-8" onClick={openNew}>
              {editingId ? "Edit your review" : "Write a review"}
            </Button>
          </div>
        </div>
      </div>

      {/* Write / edit review modal */}
      <Dialog open={showForm} onOpenChange={(o) => (o ? setShowForm(true) : resetForm())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit your review" : "Write a review"}</DialogTitle>
            <DialogDescription>
              Share your rating, an optional title, a description and up to {MAX_PHOTOS} photos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p id="review-rating-label" className="mb-1.5 text-sm font-medium text-foreground">
                Your rating
              </p>
              <div
                role="radiogroup"
                aria-labelledby="review-rating-label"
                aria-required="true"
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={rating === s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                        e.preventDefault();
                        setRating((r) => Math.min(5, (r || 0) + 1));
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                        e.preventDefault();
                        setRating((r) => Math.max(1, (r || 1) - 1));
                      }
                    }}
                    aria-label={`${s} ${s === 1 ? "star" : "stars"}`}
                    className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        s <= (hoverRating || rating) ? "fill-accent text-accent" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Your name</p>
              <Input aria-label="Your name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-9 text-sm" />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Review title</p>
              <Input
                aria-label="Review title"
                placeholder="Summarise your experience"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Description</p>
              <Textarea
                aria-label="Review description"
                placeholder="What did you like or dislike?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={1000}
                className="text-sm"
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                Photos <span className="font-normal text-muted-foreground">(optional, up to {MAX_PHOTOS})</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {photos.map((p) => (
                  <div key={p} className="relative h-16 w-16 overflow-hidden rounded border border-border">
                    <SignedImage src={p} alt="Review photo" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((x) => x !== p))}
                      aria-label="Remove photo"
                      className="absolute right-0 top-0 rounded-bl bg-background/90 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-border text-muted-foreground hover:bg-secondary">
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-[10px]">{uploading ? "..." : "Add"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handlePhotoSelect(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || uploading}>
              {submitting ? "Saving..." : editingId ? "Update Review" : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sort bar */}
      {total > 0 && (
      <div className="mt-3 rounded-lg border border-border bg-card px-4 py-3">
        <Select
          value={sort}
          onValueChange={(v) => {
            setSort(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[170px] border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="highest">Highest Rating</SelectItem>
            <SelectItem value="lowest">Lowest Rating</SelectItem>
          </SelectContent>
        </Select>
      </div>
      )}

      {/* Review cards */}
      {total === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-12 text-center">
          <MessageSquarePlus className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">No reviews yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Be the first to share your experience with this product and help other shoppers decide.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((r) => {
            const isOwner = !!user && r.user_id === user.id;
            return (
              <div key={r.id} className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Stars value={r.rating} size="h-3.5 w-3.5" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-[10px] font-semibold text-muted-foreground">
                    {r.reviewer_name?.[0]?.toUpperCase() || "U"}
                  </span>
                  <span className="text-sm font-medium text-accent">{r.reviewer_name}</span>
                  {r.is_verified && (
                    <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success">Verified</span>
                  )}
                  {isOwner && (
                    <span className="ml-auto flex items-center gap-1">
                      <button onClick={() => openEdit(r)} aria-label="Edit review" className="rounded p-1 hover:bg-secondary">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} aria-label="Delete review" className="rounded p-1 hover:bg-secondary">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </span>
                  )}
                </div>
                {r.review_title && (
                  <p className="mt-2 text-sm font-semibold text-foreground">{r.review_title}</p>
                )}
                {r.review_text && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.review_text}</p>
                )}
                {!!r.photos?.length && (
                  <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    {r.photos.map((p) => (
                      <a key={p} href={p} target="_blank" rel="noreferrer" className="h-14 w-14 overflow-hidden rounded border border-border">
                        <SignedImage src={p} alt={`Photo from ${r.reviewer_name}`} className="h-full w-full object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-sm sm:gap-2">
          <button onClick={() => setPage(1)} disabled={page === 1} aria-label="First page" className="p-1 disabled:opacity-30">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="p-1 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-7 w-7 rounded ${p === page ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} aria-label="Next page" className="p-1 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setPage(pageCount)} disabled={page === pageCount} aria-label="Last page" className="p-1 disabled:opacity-30">
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
