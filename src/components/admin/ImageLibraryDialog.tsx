import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/common/SignedImage";

const BUCKET = "product-images";

async function listStorageImages(prefix = "", depth = 0): Promise<string[]> {
  if (depth > 2) return [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  if (error || !data) return [];
  const urls: string[] = [];
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      urls.push(...(await listStorageImages(path, depth + 1)));
    } else if (/\.(png|jpe?g|webp|gif|avif)$/i.test(item.name)) {
      urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
  }
  return urls;
}

async function listDbImages(): Promise<string[]> {
  const urls: string[] = [];
  const [prods, vars] = await Promise.all([
    supabase.from("products").select("images, banner_image").limit(500),
    supabase.from("product_variations").select("color_image, gallery_images").limit(1000),
  ]);
  (prods.data || []).forEach((p: any) => {
    (p.images || []).forEach((u: string) => u && urls.push(u));
    if (p.banner_image) urls.push(p.banner_image);
  });
  (vars.data || []).forEach((v: any) => {
    if (v.color_image) urls.push(v.color_image);
    (v.gallery_images || []).forEach((u: string) => u && urls.push(u));
  });
  return urls;
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
  const [images, setImages] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setLoading(true);
    (async () => {
      const [storage, db] = await Promise.all([listStorageImages(), listDbImages()]);
      setImages(Array.from(new Set([...storage, ...db])).filter(Boolean));
      setLoading(false);
    })();
  }, [open]);

  const filtered = query.trim()
    ? images.filter((u) => u.toLowerCase().includes(query.trim().toLowerCase()))
    : images;

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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search image URL / file name" className="pl-9" />
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No images found yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {filtered.map((url) => {
                const isSel = selected.includes(url);
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => toggle(url)}
                    className={`relative aspect-square rounded border overflow-hidden bg-muted/30 ${isSel ? "ring-2 ring-primary" : "hover:border-primary/60"}`}
                  >
                    <SignedImage src={url} alt="" className="w-full h-full object-contain" />
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
        {multiple && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={selected.length === 0}
              onClick={() => { onSelect(selected); onOpenChange(false); }}
            >
              Add {selected.length > 0 ? `(${selected.length})` : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
