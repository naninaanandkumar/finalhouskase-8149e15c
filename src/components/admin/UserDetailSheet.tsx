import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Phone, Building2, MapPin, Package, FileText, FileQuestion } from "lucide-react";
import { format } from "date-fns";

interface UserDetail {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  gst_number: string | null;
  created_at: string;
}

interface Props {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailSheet({ userId, open, onOpenChange }: Props) {
  const [profile, setProfile] = useState<UserDetail | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !open) return;
    const load = async () => {
      setLoading(true);
      const [p, o, i, r] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("orders").select("id, order_number, status, total, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("invoices").select("id, invoice_number, status, total, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("rfq_requests").select("id, rfq_number, status, product_name, quantity, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      setProfile((p.data as UserDetail) || null);
      setOrders(o.data || []);
      setInvoices(i.data || []);
      setRfqs(r.data || []);
      setLoading(false);
    };
    load();
  }, [userId, open]);

  const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Customer Details</SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center justify-center flex-1"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !profile ? (
          <p className="text-muted-foreground text-sm py-8">No data found.</p>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
              {/* Profile */}
              <div className="space-y-2 border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-lg">{profile.full_name || "—"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{profile.email}</p>
                    {profile.phone && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{profile.phone}</p>}
                    {profile.company_name && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{profile.company_name}</p>}
                    {(profile.address || profile.city) && (
                      <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-1"><MapPin className="h-3.5 w-3.5 mt-0.5" />
                        {[profile.address, profile.city, profile.state, profile.postal_code].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {profile.gst_number && <p className="text-xs mt-2"><span className="font-medium">GST:</span> {profile.gst_number}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">Joined {format(new Date(profile.created_at), "dd MMM yyyy")}</p>
                </div>
              </div>

              <Tabs defaultValue="orders">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="orders" className="text-xs"><Package className="h-3.5 w-3.5 mr-1" /> Orders ({orders.length})</TabsTrigger>
                  <TabsTrigger value="invoices" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1" /> Invoices ({invoices.length})</TabsTrigger>
                  <TabsTrigger value="rfqs" className="text-xs"><FileQuestion className="h-3.5 w-3.5 mr-1" /> RFQs ({rfqs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="space-y-2 mt-3">
                  {orders.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p> : orders.map(o => (
                    <div key={o.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{o.order_number}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy, HH:mm")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{fmt(o.total)}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">{o.status}</Badge>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="invoices" className="space-y-2 mt-3">
                  {invoices.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet</p> : invoices.map(i => (
                    <div key={i.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{i.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(i.created_at), "dd MMM yyyy")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{fmt(i.total)}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">{i.status}</Badge>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="rfqs" className="space-y-2 mt-3">
                  {rfqs.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No RFQ requests yet</p> : rfqs.map(r => (
                    <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.rfq_number}</p>
                        <p className="text-xs text-muted-foreground">{r.product_name} × {r.quantity}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
