import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, ArrowLeft, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SignedImage } from "@/components/common/SignedImage";

interface PromoBanner {
  id: string;
  title: string;
  offer_text: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  link: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

export default function AdminPromoBanners() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PromoBanner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ title: "", offer_text: "", image_url: "", mobile_image_url: "", link: "/products", sort_order: "0", is_active: true });
  const { toast } = useToast();

  const fetch_ = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("promo_banners").select("*").order("sort_order");
    setBanners((data as PromoBanner[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const openForm = (b?: PromoBanner) => {
    if (b) {
      setEditing(b);
      setForm({ title: b.title, offer_text: b.offer_text || "", image_url: b.image_url, mobile_image_url: b.mobile_image_url || "", link: b.link || "/products", sort_order: String(b.sort_order || 0), is_active: b.is_active ?? true });
    } else {
      setEditing(null);
      setForm({ title: "", offer_text: "", image_url: "", mobile_image_url: "", link: "/products", sort_order: "0", is_active: true });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.image_url) { toast({ title: "Error", description: "Title and Image required", variant: "destructive" }); return; }
    setIsSaving(true);
    const data: any = { title: form.title, offer_text: form.offer_text || null, image_url: form.image_url, mobile_image_url: form.mobile_image_url || null, link: form.link || "/products", sort_order: parseInt(form.sort_order) || 0, is_active: form.is_active };
    if (editing) {
      await supabase.from("promo_banners").update(data).eq("id", editing.id);
      toast({ title: "Banner Updated" });
    } else {
      await supabase.from("promo_banners").insert(data);
      toast({ title: "Banner Created" });
    }
    setShowForm(false); setEditing(null); fetch_(); setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("promo_banners").delete().eq("id", id);
    toast({ title: "Banner Deleted" }); fetch_();
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><ArrowLeft className="h-5 w-5" /></Button>
              <h1 className="text-2xl font-display font-bold">{editing ? "Edit Banner" : "Add Promo Banner"}</h1>
            </div>
            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Offer Text</Label><Input value={form.offer_text} onChange={e => setForm(p => ({...p, offer_text: e.target.value}))} placeholder="UPTO 40% OFF" /></div>
                </div>
                <div className="space-y-2">
                  <Label>Banner Image *</Label>
                  <ImageUpload 
                    value={form.image_url} 
                    onChange={(url) => setForm(p => ({...p, image_url: url}))} 
                    bucket="product-images"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Banner Image (optional, shown at 500px height on phones)</Label>
                  <ImageUpload
                    value={form.mobile_image_url}
                    onChange={(url) => setForm(p => ({...p, mobile_image_url: url}))}
                    bucket="product-images"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Link</Label><Input value={form.link} onChange={e => setForm(p => ({...p, link: e.target.value}))} placeholder="/products?category=..." /></div>
                  <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(p => ({...p, sort_order: e.target.value}))} /></div>
                </div>
                <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={c => setForm(p => ({...p, is_active: c}))} /></div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-gradient-accent">{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Create"}</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div><h1 className="text-2xl font-display font-bold">Promo Banners</h1><p className="text-muted-foreground text-sm">Manage homepage promotional banners (5 cards below slider)</p></div>
              <Button onClick={() => openForm()} className="bg-gradient-accent gap-2"><Plus className="h-4 w-4" />Add Banner</Button>
            </div>
            <Card className="shadow-card">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : banners.length === 0 ? (
                  <div className="text-center py-12"><ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No banners yet</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Offer</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {banners.map(b => (
                        <TableRow key={b.id}>
                          <TableCell><SignedImage src={b.image_url} alt="" className="w-20 h-12 object-cover rounded" /></TableCell>
                          <TableCell className="font-medium">{b.title}</TableCell>
                          <TableCell>{b.offer_text || "—"}</TableCell>
                          <TableCell>{b.sort_order}</TableCell>
                          <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded ${b.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{b.is_active ? "Active" : "Inactive"}</span></TableCell>
                          <TableCell>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openForm(b)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => handleDelete(b.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
