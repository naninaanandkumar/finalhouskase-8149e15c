import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Video, ExternalLink, Download, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseReelUrl } from "@/components/reels/reelUtils";
import { exportReelBreakpointPreviews } from "@/lib/previewExport";

interface Product { id: string; name: string; slug: string; images?: string[] | null; }
interface Category { id: string; name: string; }
interface Reel {
  id: string;
  product_id: string;
  category_id: string | null;
  video_url: string;
  title: string | null;
  sort_order: number;
  is_active: boolean;
  show_on_home: boolean;
  show_on_product: boolean;
  object_fit?: "contain" | "cover" | null;
  product?: { name: string; slug: string; images?: string[] | null } | null;
  category?: { name: string } | null;
}

export default function AdminReels() {
  const { toast } = useToast();
  const [reels, setReels] = useState<Reel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reel | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    product_id: "",
    category_id: "" as string,
    video_url: "",
    title: "",
    sort_order: 0,
    is_active: true,
    show_on_home: true,
    show_on_product: true,
    object_fit: "cover" as "contain" | "cover",
    export_previews_before_save: false,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_reels")
      .select("*, product:products(name, slug, images), category:categories(name)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setReels((data || []) as unknown as Reel[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setCategories((data || []) as Category[]));
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, images")
        .ilike("name", `%${productSearch}%`)
        .eq("is_active", true)
        .limit(20);
      setProducts((data || []) as Product[]);
    }, 200);
    return () => clearTimeout(t);
  }, [productSearch]);

  const resetForm = () => {
    setEditing(null);
    setForm({ product_id: "", category_id: "", video_url: "", title: "", sort_order: 0, is_active: true, show_on_home: true, show_on_product: true, object_fit: "cover", export_previews_before_save: false });
    setProductSearch("");
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEdit = (r: Reel) => {
    setEditing(r);
    setForm({
      product_id: r.product_id,
      category_id: r.category_id || "",
      video_url: r.video_url,
      title: r.title || "",
      sort_order: r.sort_order,
      is_active: r.is_active,
      show_on_home: r.show_on_home ?? true,
      show_on_product: r.show_on_product ?? true,
      object_fit: r.object_fit === "contain" ? "contain" : "cover",
      export_previews_before_save: false,
    });
    setProductSearch(r.product?.name || "");
    setOpen(true);
  };

  const save = async () => {
    if (!form.product_id || !form.video_url) {
      toast({ title: "Missing fields", description: "Pick a product and add a video URL.", variant: "destructive" });
      return;
    }
    if (!parseReelUrl(form.video_url)) {
      toast({ title: "Unsupported URL", description: "Use a YouTube, Shorts, or .mp4 link.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const selectedProduct = products.find((p) => p.id === form.product_id) || (editing?.product ? { id: form.product_id, ...editing.product } : null);
    if (form.export_previews_before_save) {
      await exportReelBreakpointPreviews({ title: form.title || "Product reel", productName: selectedProduct?.name || productSearch || "Product", coverUrl: selectedProduct?.images?.[0], objectFit: form.object_fit });
    }
    const payload = {
      product_id: form.product_id,
      category_id: form.category_id || null,
      video_url: form.video_url.trim(),
      title: form.title.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
      show_on_home: form.show_on_home,
      show_on_product: form.show_on_product,
      object_fit: form.object_fit,
    };
    const { error } = editing
      ? await supabase.from("product_reels").update(payload).eq("id", editing.id)
      : await supabase.from("product_reels").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Reel updated" : "Reel added" });
    setOpen(false);
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    const { error } = await supabase.from("product_reels").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reel deleted" });
      load();
    }
  };

  const onPickVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid file", description: "Pick an mp4 / webm video.", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Too large", description: "Video must be under 50 MB.", variant: "destructive" });
      return;
    }
    setUploadingVideo(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `reels/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, video_url: publicUrl }));
      toast({ title: "Video uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const toggleActive = async (r: Reel) => {
    const { error } = await supabase.from("product_reels").update({ is_active: !r.is_active }).eq("id", r.id);
    if (!error) load();
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Video className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
            Product Reels
          </h1>
          <p className="text-sm text-muted-foreground">Add video reels (YouTube / Shorts / MP4) linked to products.</p>
        </div>
        {!open && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Reel
          </Button>
        )}
      </div>

      {/* Inline full-width form (replaces popup) */}
      {open && (
        <Card className="border-accent/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editing ? "Edit Reel" : "Add New Reel"}</CardTitle>
            <Button size="icon" variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <Label>Product</Label>
                <Input
                  placeholder="Search product by name..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto border border-border rounded mt-1">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, product_id: p.id })); setProductSearch(p.name); }}
                      className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-secondary ${form.product_id === p.id ? "bg-secondary" : ""}`}
                    >
                      {p.name}
                    </button>
                  ))}
                  {products.length === 0 && <p className="text-xs text-muted-foreground p-2">No products found.</p>}
                </div>
                {form.product_id && <p className="text-[11px] text-success mt-1">✓ Selected</p>}
              </div>
              <div>
                <Label>Video — paste YouTube / Shorts URL or upload a video file</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://youtube.com/shorts/... or https://...mp4"
                    value={form.video_url}
                    onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                  />
                  <Button type="button" variant="outline" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}>
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={onPickVideoFile} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Supports YouTube/Shorts links, or upload .mp4/.webm up to 50MB.</p>

                <div className="mt-3">
                  <Label>Title (optional caption)</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
              <div>
                <Label>Object Fit</Label>
                <Select value={form.object_fit} onValueChange={(v: "contain" | "cover") => setForm((f) => ({ ...f, object_fit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover - fill/crop</SelectItem>
                    <SelectItem value="contain">Contain - no crop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No category —</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-between gap-2 rounded border border-border p-2">
                <div>
                  <Label className="text-xs">Export previews</Label>
                  <p className="text-[10px] text-muted-foreground">Before save</p>
                </div>
                <Switch checked={form.export_previews_before_save} onCheckedChange={(v) => setForm((f) => ({ ...f, export_previews_before_save: v }))} />
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-sm font-semibold mb-2">Show on</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.show_on_home} onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_home: v }))} />
                  Home — under Featured Products
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.show_on_product} onCheckedChange={(v) => setForm((f) => ({ ...f, show_on_product: v }))} />
                  Product pages — under Related Products
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button
                variant="outline"
                disabled={!form.product_id}
                onClick={() => {
                  const selectedProduct = products.find((p) => p.id === form.product_id) || (editing?.product ? { id: form.product_id, ...editing.product } : null);
                  exportReelBreakpointPreviews({ title: form.title || "Product reel", productName: selectedProduct?.name || productSearch || "Product", coverUrl: selectedProduct?.images?.[0], objectFit: form.object_fit });
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Preview
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editing ? "Update Reel" : "Add Reel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">All Reels ({reels.filter(r => filterCategory === "all" || r.category_id === filterCategory || (filterCategory === "uncategorized" && !r.category_id)).length})</CardTitle>
          <div className="min-w-[200px]">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue placeholder="Filter by category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="uncategorized">— Uncategorized —</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : reels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No reels yet. Click "Add Reel" to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left border-b border-border bg-muted/40">
                    <th className="py-3 px-3 w-[90px]">Preview</th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3 w-[140px]">Category</th>
                    <th className="py-3 px-3 w-[280px]">Video URL</th>
                    <th className="py-3 px-3 w-[70px]">Order</th>
                    <th className="py-3 px-3 w-[70px]">Active</th>
                    <th className="py-3 px-3 w-[110px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reels
                    .filter((r) => filterCategory === "all" || r.category_id === filterCategory || (filterCategory === "uncategorized" && !r.category_id))
                    .map((r) => {
                    const src = parseReelUrl(r.video_url);
                    return (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-3">
                          {src?.kind === "youtube" ? (
                            <img src={src.thumbnailUrl} alt="" className="h-12 w-16 object-cover rounded border border-border" />
                          ) : (
                            <div className="h-12 w-16 bg-secondary rounded flex items-center justify-center text-xs text-muted-foreground">video</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="max-w-[280px] truncate font-medium">{r.product?.name || "—"}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                            {r.category?.name || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <a
                            href={r.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent inline-flex items-center gap-1 max-w-[260px]"
                          >
                            <span className="truncate">{r.video_url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="py-3 px-3">{r.sort_order}</td>
                        <td className="py-3 px-3">
                          <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
