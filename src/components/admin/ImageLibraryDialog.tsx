import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/common/SignedImage";

const BUCKET = "product-images";
const PAGE_SIZE = 30;

interface LibImage {
  url: string;
  name: string;
  createdAt: number;
}

function fileNameOf(url: string) {
  try {
    return decodeURIComponent(url.split("?")[0].split("/").pop() || url);
  } catch {
    return url;
  }
}

async function listStorageImages(prefix = "", depth = 0): Promise<LibImage[]> {
  if (depth > 2) return [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
  if (error || !data) return [];
  const out: LibImage[] = [];
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      out.push(...(await listStorageImages(path, depth + 1)));
    } else if (/\.(png|jpe?g|webp|gif|avif)$/i.test(item.name)) {
      out.push({
        url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
        name: item.name,
        createdAt: item.created_at ? new Date(item.created_at).getTime() : 0,
      });
    }
  }
  return out;
}

async function listDbImages(): Promise<LibImage[]> {
  const out: LibImage[] = [];
  const push = (u?: string | null, at?: string | null) => {
    if (u) out.push({ url: u, name: fileNameOf(u), createdAt: at ? new Date(at).getTime() : 0 });
  };
  const [prods, vars] = await Promise.all([
    supabase.from("products").select("images, banner_image, created_at").limit(500),
    supabase.from("product_variations").select("color_image, gallery_images, created_at").limit(1000),
  ]);
  (prods.data || []).forEach((p: any) => {
    (p.images || []).forEach((u: string) => push(u, p.created_at));
    push(p.banner_image, p.created_at);
  });
  (vars.data || []).forEach((v: any) => {
    push(v.color_image, v.created_at);
    (v.gallery_images || []).forEach((u: string) => push(u, v.created_at));
  });
  return out;
}

interface ImageLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  maxSelect?: number;
}

export function ImageLibraryDialog({ open, onOpenChange, onSelect, multiple = false, maxSelect = 10 }: ImageLibraryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<LibImage[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQuery("");
    setDebounced("");
    setPage(0);
    setLoading(true);
    (async () => {
      const [storage, db] = await Promise.all([listStorageImages(), listDbImages()]);
      const map = new Map<string, LibImage>();
      [...storage, ...db].forEach((img) => {
        if (!img.url) return;
        const prev = map.get(img.url);
        if (!prev || img.createdAt > prev.createdAt) map.set(img.url, img);
      });
      setImages(Array.from(map.values()));
      setLoading(false);
    })();
  }, [open]);

  // Debounced search keeps typing snappy even with hundreds of images.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query.trim().toLowerCase());
      setPage(0);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const list = debounced
      ? images.filter((i) => i.name.toLowerCase().includes(debounced) || i.url.toLowerCase().includes(debounced))
      : images.slice();
    list.sort((a, b) => {
      if (sort === "oldest") return a.createdAt - b.createdAt;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [images, debounced, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const toggle = (url: string) => {
    if (!multiple) {
      onSelect([url]);
      onOpenChange(false);
      return;
    }
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : prev.length >= maxSelect ? prev : [...prev, url]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Image library</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search file name or URL" className="pl-9" />
          </div>
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(0); }}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : current.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No images found.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {current.map((img) => {
                const isSel = selected.includes(img.url);
                return (
                  <button
                    key={img.url}
                    type="button"
                    title={img.name}
                    onClick={() => toggle(img.url)}
                    className={`group relative aspect-square rounded border overflow-hidden bg-muted/30 ${isSel ? "ring-2 ring-primary" : "hover:border-primary/60"}`}
                  >
                    <SignedImage
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-150"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-background/85 text-[10px] px-1 py-0.5 truncate text-left opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.name}
                    </span>
                    {isSel && (
                      <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {filtered.length} image{filtered.length === 1 ? "" : "s"} · page {page + 1} of {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {multiple && (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="button" disabled={selected.length === 0} onClick={() => { onSelect(selected); onOpenChange(false); }}>
                  Add {selected.length > 0 ? `(${selected.length})` : ""}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
