import { useState, useEffect, useMemo } from "react";
import { Star, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ImagePlus, X, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignedImage } from "@/components/common/SignedImage";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${size} ${s <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
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
    setPhotos((p) => [...p, ...uploaded].slice(0, MAX_PHOTOS));
    setUploading(false);
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
      toast({ title: editingId ? "Review updated!" : "Review submitted!" });
      resetForm();
      fetchReviews();
    }
  };

  return (
    <section className="mt-10">
      {/* Summary card */}
      <div className="rounded-lg border border-border bg-card px-4 py-6 sm:px-8">
        <h2 className="text-center text-xl font-bold text-foreground">Customer Reviews</h2>
        <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
          <div className="flex flex-col items-center gap-1">
            <Stars value={avg} />
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

      {showForm && (
        <div ref={formRef} className="mt-3 space-y-3 rounded-lg border border-border bg-card p-4">
          <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)} aria-label={`Rate ${s} stars`}>
                <Star className={`h-6 w-6 ${s <= rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Write your review (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Update Review" : "Submit Review"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Sort bar */}
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

      {/* Review cards */}
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((r) => {
            const isOwner = !!user && r.user_id === user.id;
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4">
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
                {r.review_text && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.review_text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
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
