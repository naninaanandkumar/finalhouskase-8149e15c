import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ArrowLeft, Loader2, Users, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SignedImage } from "@/components/common/SignedImage";

interface Item {
  id: string;
  name: string;
  age: string | null;
  heading: string;
  message: string;
  rating: number;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const emptyForm = { name: "", age: "", heading: "", message: "", rating: "5", image_url: "", sort_order: "0", is_active: true };

export default function AdminFamilyTestimonials() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const load = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("family_testimonials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data as Item[]) || []);
    setIsLoading(false);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setItems(reordered); // optimistic
    const updates = reordered.map((it, i) =>
      supabase.from("family_testimonials").update({ sort_order: i }).eq("id", it.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast({ title: "Reorder failed", description: failed.error.message, variant: "destructive" });
    }
    load();
  };

  useEffect(() => { load(); }, []);

  const openForm = (i?: Item) => {
    if (i) {
      setEditing(i);
      setForm({
        name: i.name,
        age: i.age || "",
        heading: i.heading,
        message: i.message,
        rating: String(i.rating),
        image_url: i.image_url || "",
        sort_order: String(i.sort_order ?? 0),
        is_active: i.is_active,
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.heading.trim() || !form.message.trim()) {
      toast({ title: "Error", description: "Name, heading and message are required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const payload = {
      name: form.name.trim(),
      age: form.age || null,
      heading: form.heading.trim(),
      message: form.message.trim(),
      rating: Math.min(5, Math.max(1, parseInt(form.rating) || 5)),
      image_url: form.image_url || null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("family_testimonials").update(payload).eq("id", editing.id)
      : await supabase.from("family_testimonials").insert(payload);
    setIsSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Testimonial updated" : "Testimonial created" });
    setShowForm(false); setEditing(null); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("family_testimonials").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Testimonial deleted" }); load();
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-display font-bold">{editing ? "Edit Testimonial" : "Add Testimonial"}</h1>
        </div>
        <Card className="shadow-card">
          <CardContent className="pt-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Age</Label><Input value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} placeholder="38" /></div>
            </div>
            <div className="space-y-2"><Label>Heading *</Label><Input value={form.heading} onChange={(e) => setForm((p) => ({ ...p, heading: e.target.value }))} placeholder="Grease-Free, Guilt-Free" /></div>
            <div className="space-y-2"><Label>Message *</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Photo</Label>
              <ImageUpload value={form.image_url} onChange={(url) => setForm((p) => ({ ...p, image_url: url }))} bucket="product-images" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm((p) => ({ ...p, rating: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-gradient-accent">{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Create"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Trusted by Families</h1>
          <p className="text-muted-foreground text-sm">Homepage family testimonials with photos</p>
        </div>
        <Button onClick={() => openForm()} className="bg-gradient-accent gap-2"><Plus className="h-4 w-4" />Add Testimonial</Button>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-12"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No testimonials yet</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead className="w-20">Order</TableHead><TableHead>Photo</TableHead><TableHead>Name</TableHead><TableHead>Heading</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((i, idx) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === items.length - 1} onClick={() => move(idx, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                    <TableCell><SignedImage src={i.image_url} alt="" className="w-14 h-14 object-cover rounded-md" /></TableCell>
                    <TableCell className="font-medium">{i.name}{i.age ? `, ${i.age}` : ""}</TableCell>
                    <TableCell>{i.heading}</TableCell>
                    <TableCell>{i.rating}★</TableCell>
                    <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded ${i.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{i.is_active ? "Active" : "Inactive"}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openForm(i)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}