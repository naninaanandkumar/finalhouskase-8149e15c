import { useState, useEffect, useMemo, useCallback } from "react";
import { Star, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ImagePlus, X, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignedImage } from "@/components/common/SignedImage";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReviewAnalytics } from "@/lib/analytics";
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
  is_approved?: boolean | null;
  user_id?: string | null;
}

const PER_PAGE = 6;
const MAX_PHOTOS = 4;
const MAX_PHOTO_MB = 5;

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} aria-hidden="true" className={`${size} ${s <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export function CustomerReviews({ productId }: { productId: string }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
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
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number; author: string } | null>(null);

  const fetchReviews = async () => {
    const { data } = await supabase.rpc("get_public_product_reviews", { _product_id: productId });
    const approved = ((data as any[]) || []).map((r) => ({ ...r, user_id: null as string | null, is_approved: true }));
    if (user?.id) {
      const { data: mine } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, rating, review_text, review_title, photos, created_at, is_verified, is_approved, user_id")
        .eq("product_id", productId)
        .eq("user_id", user.id);
      const mineArr = (mine as Review[]) || [];
      const mineIds = new Set(mineArr.map((r) => r.id));
      setReviews([...mineArr, ...approved.filter((r) => !mineIds.has(r.id))] as Review[]);
    } else {
      setReviews(approved as Review[]);
    }
  };

  useEffect(() => {
    fetchReviews();
    const channel = supabase
      .channel(`customer_reviews:${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_reviews", filter: `product_id=eq.${productId}` },
        () => fetchReviews()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, user?.id]);

  // Ratings summary is based on published (approved) reviews only.
  const published = useMemo(() => reviews.filter((r) => r.is_approved !== false), [reviews]);
  const total = published.length;
  const avg = total ? published.reduce((s, r) => s + r.rating, 0) / total : 0;
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: published.filter((r) => r.rating === star).length,
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
    ReviewAnalytics.modalOpen(productId, "new");
  };

  const openEdit = (r: Review) => {
    setEditingId(r.id);
    setName(r.reviewer_name);
    setTitle(r.review_title || "");
    setText(r.review_text || "");
    setPhotos(r.photos || []);
    setRating(r.rating);
    setShowForm(true);
    ReviewAnalytics.modalOpen(productId, "edit");
  };

  const selectRating = (s: number) => {
    setRating(s);
    ReviewAnalytics.starSelect(productId, s);
  };

  const handleStarKeyDown = (e: React.KeyboardEvent, s: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      selectRating(Math.min(5, (rating || s) + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      selectRating(Math.max(1, (rating || s) - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      selectRating(1);
    } else if (e.key === "End") {
      e.preventDefault();
      selectRating(5);
    }
  };

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    const picked = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Only image files are allowed", variant: "destructive" });
        continue;
      }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        toast({ title: `Each image must be under ${MAX_PHOTO_MB}MB`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `reviews/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    const next = [...photos, ...uploaded].slice(0, MAX_PHOTOS);
    setPhotos(next);
    setUploading(false);
    if (uploaded.length) ReviewAnalytics.photoUpload(productId, uploaded.length, next.length);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Review deleted" });
      fetchReviews();
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
    const mode = editingId ? "edit" : "new";
    ReviewAnalytics.submit(productId, { rating, mode, photos: photos.length, has_text: !!text.trim() });
    const payload = {
      reviewer_name: name.trim(),
      rating,
      review_title: title.trim() || null,
      review_text: text.trim() || null,
      photos,
      // Any new or edited review goes back into moderation.
      is_approved: false,
    };
    const { error } = editingId
      ? await supabase.from("product_reviews").update(payload).eq("id", editingId)
      : await supabase.from("product_reviews").insert({
          product_id: productId,
          user_id: user.id,
          ...payload,
        });
    setSubmitting(false);
    if (error) {
      ReviewAnalytics.submitError(productId, error.message);
      toast({ title: "Failed to save review", description: error.message, variant: "destructive" });
    } else {
      ReviewAnalytics.submitSuccess(productId, { rating, mode, photos: photos.length, pending: true });
      toast({
        title: editingId ? "Review updated — pending approval" : "Review submitted — pending approval",
        description: "It will appear publicly once our team approves it. You can still see it marked as pending.",
      });
      resetForm();
      fetchReviews();
    }
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const stepLightbox = useCallback((dir: 1 | -1) => {
    setLightbox((lb) => (lb ? { ...lb, index: (lb.index + dir + lb.photos.length) % lb.photos.length } : lb));
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") stepLightbox(1);
      if (e.key === "ArrowLeft") stepLightbox(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox, stepLightbox]);

  const hasAny = reviews.length > 0;

  return (
    <section className="mt-10" aria-labelledby="customer-reviews-heading">
      {/* Summary card — hidden when there is nothing to summarise */}
      {hasAny && (
        <div className="rounded-lg border border-border bg-card px-4 py-6 sm:px-8">
          <h2 id="customer-reviews-heading" className="text-center text-xl font-bold text-foreground">Customer Reviews</h2>
          <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
            <div className="flex flex-col items-center gap-1">
              <Stars value={avg} />
              <span className="text-sm font-medium text-accent underline underline-offset-2">
                {avg ? avg.toFixed(2) : "0.00"} out of 5
              </span>
              <span className="text-sm text-muted-foreground">Based on {total} reviews</span>
            </div>

            <div className="hidden md:block h-16 w-px bg-border" aria-hidden="true" />

            <ul className="space-y-1.5">
              {buckets.map((b) => (
                <li key={b.star} className="flex items-center gap-3">
                  <Stars value={b.star} size="h-3.5 w-3.5" />
                  <div
                    className="h-3 flex-1 overflow-hidden rounded-sm bg-secondary"
                    role="progressbar"
                    aria-label={`${b.star} star reviews`}
                    aria-valuenow={b.count}
                    aria-valuemin={0}
                    aria-valuemax={total}
                  >
                    <div
                      className="h-full bg-accent"
                      style={{ width: total ? `${(b.count / total) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">{b.count}</span>
                </li>
              ))}
            </ul>

            <div className="hidden md:block h-16 w-px bg-border" aria-hidden="true" />

            <div className="flex justify-center">
              <Button className="px-8" onClick={openNew}>
                Write a review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Write / edit review modal */}
      <Dialog open={showForm} onOpenChange={(o) => (o ? setShowForm(true) : resetForm())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" aria-describedby="review-form-desc">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit your review" : "Write a review"}</DialogTitle>
            <DialogDescription id="review-form-desc">
              Reviews are published after moderation. Required: a star rating and your name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p id="review-rating-label" className="mb-1.5 text-sm font-medium text-foreground">Your rating</p>
              <div
                className="flex items-center gap-1"
                role="radiogroup"
                aria-labelledby="review-rating-label"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={rating === s}
                    tabIndex={rating === s || (!rating && s === 1) ? 0 : -1}
                    onClick={() => selectRating(s)}
                    onKeyDown={(e) => handleStarKeyDown(e, s)}
                    onMouseEnter={() => setHoverRating(s)}
                    aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                    className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Star
                      aria-hidden="true"
                      className={`h-7 w-7 transition-colors ${
                        s <= (hoverRating || rating) ? "fill-accent text-accent" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="review-name" className="mb-1.5 block text-sm font-medium text-foreground">Your name</label>
              <Input id="review-name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-9 text-sm" />
            </div>
            <div>
              <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium text-foreground">Review title</label>
              <Input
                id="review-title"
                placeholder="Summarise your experience"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label htmlFor="review-text" className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
              <Textarea
                id="review-text"
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
                      className="absolute right-0 top-0 rounded-bl bg-background/90 p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label
                    htmlFor="review-photos"
                    className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-border text-muted-foreground hover:bg-secondary focus-within:ring-2 focus-within:ring-ring"
                  >
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    <span className="text-[10px]">{uploading ? "..." : "Add"}</span>
                    <input
                      id="review-photos"
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      aria-label="Upload review photos"
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
      {hasAny && (
        <div className="mt-3 rounded-lg border border-border bg-card px-4 py-3">
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Sort reviews" className="h-8 w-[170px] border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0">
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
      {!hasAny ? (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-12 text-center">
          <MessageSquarePlus className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
          <h2 id="customer-reviews-heading" className="text-sm font-medium text-foreground">No reviews yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Be the first to share your experience with this product and help other shoppers decide.
          </p>
          <Button className="mt-1 px-8" onClick={openNew}>
            Write a review
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((r) => {
            const isOwner = !!user && r.user_id === user.id;
            const isPending = r.is_approved === false;
            return (
              <article key={r.id} className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Stars value={r.rating} size="h-3.5 w-3.5" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
                {isPending && (
                  <span className="mt-2 w-fit rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    Pending approval — only visible to you
                  </span>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-[10px] font-semibold text-muted-foreground">
                    {r.reviewer_name?.[0]?.toUpperCase() || "U"}
                  </span>
                  <span className="text-sm font-medium text-accent">{r.reviewer_name}</span>
                  {r.is_verified && (
                    <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success">Verified</span>
                  )}
                  {isOwner && (
                    <span className="ml-auto flex items-center gap-1">
                      <button onClick={() => openEdit(r)} aria-label={`Edit your review titled ${r.review_title || "untitled"}`} className="rounded p-1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} aria-label={`Delete your review titled ${r.review_title || "untitled"}`} className="rounded p-1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </div>
                {r.review_title && (
                  <h3 className="mt-2 text-sm font-semibold text-foreground">{r.review_title}</h3>
                )}
                {r.review_text && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.review_text}</p>
                )}
                {!!r.photos?.length && (
                  <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    {r.photos.map((p, i) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setLightbox({ photos: r.photos as string[], index: i, author: r.reviewer_name })}
                        aria-label={`View photo ${i + 1} of ${r.photos!.length} from ${r.reviewer_name}`}
                        className="h-14 w-14 overflow-hidden rounded border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <SignedImage src={p} alt={`Photo from ${r.reviewer_name}`} className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Photo lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => (o ? null : closeLightbox())}>
        <DialogContent className="max-w-3xl p-0" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>
              {lightbox ? `Review photo ${lightbox.index + 1} of ${lightbox.photos.length} by ${lightbox.author}` : "Review photo"}
            </DialogTitle>
          </DialogHeader>
          {lightbox && (
            <div className="relative flex items-center justify-center bg-background">
              <SignedImage
                src={lightbox.photos[lightbox.index]}
                alt={`Review photo ${lightbox.index + 1} by ${lightbox.author}`}
                className="max-h-[80vh] w-full object-contain"
              />
              {lightbox.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => stepLightbox(-1)}
                    aria-label="Previous photo"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepLightbox(1)}
                    aria-label="Next photo"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-background/90 px-2 py-0.5 text-xs text-muted-foreground">
                    {lightbox.index + 1} / {lightbox.photos.length}
                  </span>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {pageCount > 1 && (
        <nav aria-label="Reviews pagination" className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-sm sm:gap-2">
          <button onClick={() => setPage(1)} disabled={page === 1} aria-label="First page" className="rounded p-1 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page" className="rounded p-1 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`h-7 w-7 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${p === page ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} aria-label="Next page" className="rounded p-1 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button onClick={() => setPage(pageCount)} disabled={page === pageCount} aria-label="Last page" className="rounded p-1 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </section>
  );
}
