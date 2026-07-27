import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, ArrowLeft, Loader2, MapPin, Upload, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeliveryPincode {
  id: string;
  pincode: string;
  city: string | null;
  state: string | null;
  delivery_days: number;
  is_cod_available: boolean | null;
  is_active: boolean | null;
}

export default function AdminPincodes() {
  const [pincodes, setPincodes] = useState<DeliveryPincode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DeliveryPincode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ pincode: "", city: "", state: "", delivery_days: "5", is_cod_available: true, is_active: true });
  const { toast } = useToast();

  const fetchPincodes = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("delivery_pincodes").select("*").order("pincode");
    setPincodes((data as DeliveryPincode[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchPincodes(); }, []);

  const openForm = (p?: DeliveryPincode) => {
    if (p) {
      setEditing(p);
      setForm({ pincode: p.pincode, city: p.city || "", state: p.state || "", delivery_days: String(p.delivery_days), is_cod_available: p.is_cod_available ?? true, is_active: p.is_active ?? true });
    } else {
      setEditing(null);
      setForm({ pincode: "", city: "", state: "", delivery_days: "5", is_cod_available: true, is_active: true });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.pincode) { toast({ title: "Error", description: "Pincode is required", variant: "destructive" }); return; }
    setIsSaving(true);
    const data = { pincode: form.pincode, city: form.city || null, state: form.state || null, delivery_days: parseInt(form.delivery_days) || 5, is_cod_available: form.is_cod_available, is_active: form.is_active };
    if (editing) {
      await supabase.from("delivery_pincodes").update(data).eq("id", editing.id);
      toast({ title: "Pincode Updated" });
    } else {
      const { error } = await supabase.from("delivery_pincodes").insert(data);
      if (error?.message?.includes("duplicate")) {
        toast({ title: "Error", description: "This pincode already exists", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      toast({ title: "Pincode Added" });
    }
    setShowForm(false); setEditing(null); fetchPincodes(); setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this pincode?")) return;
    await supabase.from("delivery_pincodes").delete().eq("id", id);
    toast({ title: "Pincode Deleted" }); fetchPincodes();
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast({ title: "Error", description: "File must have header row and data", variant: "destructive" }); setIsImporting(false); return; }
      
      const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
      const pincodeIdx = header.findIndex(h => h.includes("pincode") || h.includes("pin"));
      const cityIdx = header.findIndex(h => h.includes("city"));
      const stateIdx = header.findIndex(h => h.includes("state"));
      const daysIdx = header.findIndex(h => h.includes("day") || h.includes("delivery"));
      const codIdx = header.findIndex(h => h.includes("cod"));

      if (pincodeIdx === -1) { toast({ title: "Error", description: "CSV must have a 'pincode' column", variant: "destructive" }); setIsImporting(false); return; }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
        const pin = cols[pincodeIdx];
        if (!pin || pin.length < 4) continue;
        rows.push({
          pincode: pin,
          city: cityIdx >= 0 ? cols[cityIdx] || null : null,
          state: stateIdx >= 0 ? cols[stateIdx] || null : null,
          delivery_days: daysIdx >= 0 ? parseInt(cols[daysIdx]) || 5 : 5,
          is_cod_available: codIdx >= 0 ? cols[codIdx]?.toLowerCase() !== "no" && cols[codIdx]?.toLowerCase() !== "false" : true,
          is_active: true,
        });
      }

      if (rows.length === 0) { toast({ title: "Error", description: "No valid pincodes found", variant: "destructive" }); setIsImporting(false); return; }

      const { error } = await supabase.from("delivery_pincodes").upsert(rows, { onConflict: "pincode" });
      if (error) throw error;

      toast({ title: "Import Successful", description: `${rows.length} pincodes imported` });
      fetchPincodes();
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    }
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = search ? pincodes.filter(p => p.pincode.includes(search) || p.city?.toLowerCase().includes(search.toLowerCase()) || p.state?.toLowerCase().includes(search.toLowerCase())) : pincodes;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><ArrowLeft className="h-5 w-5" /></Button>
              <h1 className="text-2xl font-display font-bold">{editing ? "Edit Pincode" : "Add Delivery Pincode"}</h1>
            </div>
            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Pincode *</Label><Input value={form.pincode} onChange={e => setForm(p => ({...p, pincode: e.target.value}))} placeholder="110001" /></div>
                  <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} placeholder="New Delhi" /></div>
                  <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => setForm(p => ({...p, state: e.target.value}))} placeholder="Delhi" /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Delivery Days</Label><Input type="number" value={form.delivery_days} onChange={e => setForm(p => ({...p, delivery_days: e.target.value}))} /></div>
                </div>
                <div className="flex items-center justify-between"><Label>COD Available</Label><Switch checked={form.is_cod_available} onCheckedChange={c => setForm(p => ({...p, is_cod_available: c}))} /></div>
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div><h1 className="text-2xl font-display font-bold">Delivery Pincodes</h1></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="gap-2">
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Import CSV
                </Button>
                <Button onClick={() => openForm()} className="bg-gradient-accent gap-2"><Plus className="h-4 w-4" />Add Pincode</Button>
              </div>
            </div>
            <Input placeholder="Search by pincode, city or state..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
            <Card className="shadow-card">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12"><MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No pincodes found</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Pincode</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>Days</TableHead><TableHead>COD</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filtered.slice(0, 100).map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.pincode}</TableCell>
                          <TableCell>{p.city || "—"}</TableCell>
                          <TableCell>{p.state || "—"}</TableCell>
                          <TableCell>{p.delivery_days}</TableCell>
                          <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded ${p.is_cod_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{p.is_cod_available ? "Yes" : "No"}</span></TableCell>
                          <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded ${p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{p.is_active ? "Active" : "Inactive"}</span></TableCell>
                          <TableCell>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openForm(p)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => handleDelete(p.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {filtered.length > 100 && <p className="text-xs text-muted-foreground text-center py-2">Showing first 100 of {filtered.length} results</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleExcelUpload} className="hidden" />
    </div>
  );
}
