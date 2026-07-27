import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Edit, Trash2, ArrowLeft, Loader2, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  title: string | null;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number | null;
  auto_apply: boolean | null;
  show_on_product: boolean | null;
  is_active: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

const defaultForm = {
  code: "", title: "", description: "", discount_type: "percentage", discount_value: "0",
  min_order_amount: "0", max_discount_amount: "", usage_limit: "",
  auto_apply: false, show_on_product: false, is_active: true, starts_at: "", expires_at: "",
  category_id: "",
};

// Format an ISO/UTC timestamp for a <input type="datetime-local"> control in the user's local timezone.
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const { toast } = useToast();

  const fetch_ = async () => {
    setIsLoading(true);
    const [{ data: couponsData }, { data: catsData }] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
    ]);
    setCoupons((couponsData as Coupon[]) || []);
    setCategories(catsData || []);
    setIsLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "All Categories";
    return categories.find(c => c.id === categoryId)?.name || "—";
  };

  const openForm = (c?: Coupon) => {
    if (c) {
      setEditing(c);
      setForm({
        code: c.code, title: c.title || "", description: c.description || "", discount_type: c.discount_type,
        discount_value: String(c.discount_value), min_order_amount: String(c.min_order_amount || 0),
        max_discount_amount: c.max_discount_amount ? String(c.max_discount_amount) : "",
        usage_limit: c.usage_limit ? String(c.usage_limit) : "",
        auto_apply: c.auto_apply ?? false, show_on_product: c.show_on_product ?? false, is_active: c.is_active ?? true,
        starts_at: c.starts_at ? toLocalInput(c.starts_at) : "", expires_at: c.expires_at ? toLocalInput(c.expires_at) : "",
        category_id: c.category_id || "",
      });
    } else {
      setEditing(null);
      setForm(defaultForm);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code) { toast({ title: "Error", description: "Coupon code is required", variant: "destructive" }); return; }
    setIsSaving(true);
    const data: any = {
      code: form.code.toUpperCase(), title: form.title || null, description: form.description || null,
      discount_type: form.discount_type, discount_value: parseFloat(form.discount_value) || 0,
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      auto_apply: form.auto_apply, show_on_product: form.show_on_product, is_active: form.is_active,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      category_id: form.category_id || null,
    };
    if (editing) {
      await supabase.from("coupons").update(data).eq("id", editing.id);
      toast({ title: "Coupon Updated" });
    } else {
      await supabase.from("coupons").insert(data);
      toast({ title: "Coupon Created" });
    }
    setShowForm(false); setEditing(null); fetch_(); setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast({ title: "Coupon Deleted" }); fetch_();
  };

  const handleToggle = async (c: Coupon) => {
    await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    fetch_();
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><ArrowLeft className="h-5 w-5" /></Button>
              <h1 className="text-2xl font-display font-bold">{editing ? "Edit Coupon" : "Create Coupon"}</h1>
            </div>
            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Coupon Code *</Label><Input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value.toUpperCase()}))} placeholder="SAVE20" /></div>
                  <div className="space-y-2"><Label>Discount Type</Label>
                    <Select value={form.discount_type} onValueChange={v => setForm(p => ({...p, discount_type: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (₹)</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Coupon Title / Heading</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="FLAT 10% OFF" /></div>
                  <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="+ 5% off on Prepaid orders" /></div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Discount Value *</Label><Input type="number" value={form.discount_value} onChange={e => setForm(p => ({...p, discount_value: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Min Order Amount</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm(p => ({...p, min_order_amount: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Max Discount (₹)</Label><Input type="number" value={form.max_discount_amount} onChange={e => setForm(p => ({...p, max_discount_amount: e.target.value}))} placeholder="No limit" /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Usage Limit</Label><Input type="number" value={form.usage_limit} onChange={e => setForm(p => ({...p, usage_limit: e.target.value}))} placeholder="Unlimited" /></div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={v => setForm(p => ({...p, category_id: v === "all" ? "" : v}))}>
                      <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Starts At</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm(p => ({...p, starts_at: e.target.value}))} /></div>
                  <div className="space-y-2"><Label>Expires At</Label><Input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({...p, expires_at: e.target.value}))} /></div>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div><Label>Auto Apply</Label><p className="text-xs text-muted-foreground">Automatically apply at checkout</p></div>
                  <Switch checked={form.auto_apply} onCheckedChange={c => setForm(p => ({...p, auto_apply: c}))} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Show on Product Page</Label><p className="text-xs text-muted-foreground">Display coupon on product detail pages</p></div>
                  <Switch checked={form.show_on_product} onCheckedChange={c => setForm(p => ({...p, show_on_product: c}))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch checked={form.is_active} onCheckedChange={c => setForm(p => ({...p, is_active: c}))} />
                </div>
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
              <div><h1 className="text-2xl font-display font-bold">Coupons</h1></div>
              <Button onClick={() => openForm()} className="bg-gradient-accent gap-2"><Plus className="h-4 w-4" />Add Coupon</Button>
            </div>
            <Card className="shadow-card">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : coupons.length === 0 ? (
                  <div className="text-center py-12"><Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No coupons yet</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Category</TableHead><TableHead>Min Order</TableHead><TableHead>Usage</TableHead><TableHead>Auto</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {coupons.map(c => (
                        <TableRow key={c.id}>
                          <TableCell><Badge variant="outline" className="font-mono">{c.code}</Badge></TableCell>
                          <TableCell>{c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}</TableCell>
                          <TableCell><span className="text-xs text-muted-foreground">{getCategoryName(c.category_id)}</span></TableCell>
                          <TableCell>₹{c.min_order_amount || 0}</TableCell>
                          <TableCell>{c.used_count || 0}{c.usage_limit ? `/${c.usage_limit}` : ""}</TableCell>
                          <TableCell>{c.auto_apply ? <Badge className="bg-accent text-accent-foreground text-[10px]">Auto</Badge> : "—"}</TableCell>
                          <TableCell>
                            <button onClick={() => handleToggle(c)}>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded cursor-pointer ${c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openForm(c)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent>
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
