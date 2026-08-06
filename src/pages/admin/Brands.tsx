import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SignedImage } from "@/components/common/SignedImage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Brand = Tables<"brands">;

const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminBrands() {
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const fetchBrands = async () => {
    setLoading(true);
    const { data } = await supabase.from("brands").select("*").order("sort_order").order("name");
    setBrands(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBrands(); }, []);

  const reset = () => {
    setEditing(null); setName(""); setSlug(""); setLogoUrl(""); setDescription(""); setSortOrder(0); setIsActive(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setName(b.name); setSlug(b.slug || ""); setLogoUrl(b.logo_url || "");
    setDescription(b.description || ""); setSortOrder(b.sort_order ?? 0); setIsActive(b.is_active ?? true);
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) { toast({ title: "Brand name is required", variant: "destructive" }); return; }
    const payload = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      logo_url: logoUrl || null,
      description: description || null,
      sort_order: sortOrder,
      is_active: isActive,
    };
    const { error } = editing
      ? await supabase.from("brands").update(payload).eq("id", editing.id)
      : await supabase.from("brands").insert(payload);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Brand updated" : "Brand created" });
    setOpen(false); reset(); fetchBrands();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Brand deleted" });
    fetchBrands();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brands</h1>
          <p className="text-sm text-muted-foreground">Manage brands available when listing products</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-accent"><Plus className="h-4 w-4 mr-2" /> Add Brand</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Houskase" />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <ImageUpload value={logoUrl} onChange={setLogoUrl} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Sort order</Label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button className="w-full bg-gradient-accent" onClick={save}>{editing ? "Update Brand" : "Create Brand"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : brands.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No brands yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {brands.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {b.logo_url ? (
                  <SignedImage src={b.logo_url} alt={b.name} className="h-10 w-10 object-contain rounded border bg-muted/30" />
                ) : (
                  <div className="h-10 w-10 rounded border bg-muted/30 flex items-center justify-center"><Tag className="h-4 w-4 text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {b.name}
                    {!b.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">/{b.slug} • Order: {b.sort_order ?? 0}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
