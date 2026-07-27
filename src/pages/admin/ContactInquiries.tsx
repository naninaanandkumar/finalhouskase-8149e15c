import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, Phone, Search, Trash2, RefreshCcw } from "lucide-react";
import { format } from "date-fns";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "new" | "handled" | "spam";
  admin_notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  handled_at: string | null;
}

const statusStyles: Record<string, string> = {
  new: "bg-accent/15 text-accent border-accent/30",
  handled: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  spam: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function AdminContactInquiries() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("contact_inquiries" as any).select("*").order("created_at", { ascending: false }).limit(500);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error("Failed to load inquiries");
    else setRows((data as unknown as Inquiry[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return [r.name, r.email, r.subject, r.message].filter(Boolean).some(v => v!.toLowerCase().includes(s));
  });

  const updateStatus = async (id: string, status: Inquiry["status"]) => {
    const patch: any = { status };
    if (status === "handled") {
      patch.handled_at = new Date().toISOString();
      const { data: u } = await supabase.auth.getUser();
      if (u?.user?.id) patch.handled_by = u.user.id;
    }
    const { error } = await supabase.from("contact_inquiries" as any).update(patch).eq("id", id);
    if (error) return toast.error("Update failed");
    toast.success(`Marked as ${status}`);
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
    if (selected?.id === id) setSelected(s => s ? { ...s, ...patch } : s);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from("contact_inquiries" as any)
      .update({ admin_notes: notes }).eq("id", selected.id);
    setSaving(false);
    if (error) return toast.error("Failed to save notes");
    toast.success("Notes saved");
    setRows(rs => rs.map(r => r.id === selected.id ? { ...r, admin_notes: notes } : r));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this inquiry?")) return;
    const { error } = await supabase.from("contact_inquiries" as any).delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    setRows(rs => rs.filter(r => r.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Deleted");
  };

  const counts = {
    new: rows.filter(r => r.status === "new").length,
    handled: rows.filter(r => r.status === "handled").length,
    spam: rows.filter(r => r.status === "spam").length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Contact Inquiries</h1>
          <p className="text-sm text-muted-foreground">Messages submitted from the Help & Contact form.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["new", "handled", "spam"] as const).map(k => (
          <button key={k} onClick={() => setStatusFilter(k)} className={`rounded-lg border p-3 text-left transition ${statusFilter === k ? "border-accent bg-accent/5" : "border-border bg-card"}`}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
            <p className="text-2xl font-bold">{counts[k]}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, message..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="handled">Handled</SelectItem>
            <SelectItem value="spam">Spam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No inquiries found.</TableCell></TableRow>
            ) : filtered.map(r => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => { setSelected(r); setNotes(r.admin_notes || ""); }}>
                <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm">{r.email}</TableCell>
                <TableCell className="max-w-[180px] truncate">{r.subject || "—"}</TableCell>
                <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">{r.message}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusStyles[r.status]}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); remove(r.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.subject || "Contact inquiry"}</SheetTitle>
                <SheetDescription>Received {format(new Date(selected.created_at), "dd MMM yyyy 'at' HH:mm")}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">From</p>
                  <p className="font-semibold">{selected.name}</p>
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-accent hover:underline"><Mail className="h-3.5 w-3.5" />{selected.email}</a>
                  {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-accent hover:underline"><Phone className="h-3.5 w-3.5" />{selected.phone}</a>}
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Message</p>
                  <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{selected.message}</div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Status</p>
                  <div className="flex gap-2">
                    {(["new", "handled", "spam"] as const).map(s => (
                      <Button key={s} size="sm" variant={selected.status === s ? "default" : "outline"} onClick={() => updateStatus(selected.id, s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Internal notes</p>
                  <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes visible only to admins..." />
                  <Button size="sm" onClick={saveNotes} disabled={saving}>{saving ? "Saving..." : "Save notes"}</Button>
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                  {selected.ip_address && <p>IP: {selected.ip_address}</p>}
                  {selected.user_agent && <p className="truncate">UA: {selected.user_agent}</p>}
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="destructive" size="sm" onClick={() => remove(selected.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || "Your inquiry")}`}>Reply via email</a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
