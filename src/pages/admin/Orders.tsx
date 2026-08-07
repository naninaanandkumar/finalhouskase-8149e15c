import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  Search,
  MoreHorizontal,
  Eye,
  Clock,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  Loader2,
  Building2,
  Store,
  ArrowLeft,
  Download,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { generateGSTInvoice } from "@/lib/generateInvoice";
import { fetchStoreSettings } from "@/lib/storeSettings";
import { buildInvoiceItems, calculateOrderDiscount, getInvoicePartyData } from "@/lib/invoiceHelpers";
import { format } from "date-fns";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;

interface OrderWithProfile extends Order {
  profile?: {
    full_name: string | null;
    email: string;
    company_name: string | null;
    phone: string | null;
    gst_number: string | null;
  };
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-warning/10 text-warning", label: "Pending" },
  confirmed: { icon: CheckCircle, color: "bg-primary/10 text-primary", label: "Confirmed" },
  processing: { icon: Package, color: "bg-accent/10 text-accent", label: "Processing" },
  shipped: { icon: Truck, color: "bg-info/10 text-info", label: "Shipped" },
  delivered: { icon: CheckCircle, color: "bg-success/10 text-success", label: "Delivered" },
  cancelled: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Cancelled" },
};

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithProfile | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(ordersData?.map(o => o.user_id).filter(Boolean))];
      let profiles: any[] = [];

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, company_name, phone, gst_number")
          .in("user_id", userIds);
        profiles = profilesData || [];
      }

      const ordersWithProfiles: OrderWithProfile[] = (ordersData || []).map(order => ({
        ...order,
        profile: profiles.find(p => p.user_id === order.user_id),
      }));

      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleViewOrder = async (order: OrderWithProfile) => {
    setSelectedOrder(order);
    try {
      const { data } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);
      setOrderItems(data || []);
    } catch (error) {
      console.error("Error fetching order items:", error);
    }
  };

  const handleDownloadInvoice = async (order: OrderWithProfile) => {
    try {
      const [invoiceResult, storeSettings, fallbackItemsResult] = await Promise.all([
        supabase.from("invoices").select("*").eq("order_id", order.id).maybeSingle(),
        fetchStoreSettings(),
        orderItems.length === 0
          ? supabase.from("order_items").select("*").eq("order_id", order.id)
          : Promise.resolve({ data: orderItems, error: null } as any),
      ]);

      const invoice = invoiceResult.data;
      const invoiceNumber = invoice?.invoice_number || `INV-${order.order_number.replace("ORD-", "")}`;
      const shipping = order.shipping_address as any;
      const billing = order.billing_address as any;
      const itemsForInvoice = (fallbackItemsResult.data || orderItems) as any[];

      const productIds = [...new Set(itemsForInvoice.map((item: any) => item.product_id).filter(Boolean))] as string[];
      const { data: productsData } = productIds.length > 0
        ? await supabase.from("products").select("id, hsn_code").in("id", productIds)
        : { data: [] as any[] };

      const productHsnMap = new Map<string, string>();
      (productsData || []).forEach((product: any) => {
        if (product?.id && product?.hsn_code) {
          productHsnMap.set(product.id, product.hsn_code);
        }
      });

      const partyData = getInvoicePartyData({
        shippingAddress: shipping,
        billingAddress: billing,
        profile: order.profile,
        userEmail: order.profile?.email,
      });

      const discountTotal = calculateOrderDiscount({
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
      });

      const doc = generateGSTInvoice({
        invoice_number: invoiceNumber,
        order_number: order.order_number,
        date: format(new Date(order.created_at), "dd MMM yyyy"),
        buyer_name: partyData.buyerName,
        bill_to_name: partyData.billToName,
        ship_to_name: partyData.shipToName,
        buyer_email: partyData.buyerEmail,
        buyer_phone: partyData.buyerPhone,
        company_name: partyData.companyName,
        gst_number: partyData.gstNumber,
        billing_address: partyData.billingAddress,
        shipping_address: partyData.shippingAddress,
        items: buildInvoiceItems(itemsForInvoice, productHsnMap, Number(order.subtotal), discountTotal),
        subtotal: Number(order.subtotal),
        tax: Number(order.tax || 0),
        gst_percentage: 18,
        shipping: Number(order.shipping || 0),
        total: Number(order.total),
        discount_total: discountTotal,
        ...storeSettings,
      });

      (await doc).save(`Invoice-${order.order_number}.pdf`);
      toast({ title: "Invoice Downloaded", description: `PDF saved as Invoice-${order.order_number}.pdf` });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({ title: "Error", description: "Failed to download invoice", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: newStatus as any })
        .eq("id", orderId)
        .select("id, status")
        .maybeSingle();

      if (error) {
        const msg = (error.message || "").toLowerCase();
        let description = error.message || "Failed to update order";
        if (msg.includes("row-level security") || msg.includes("rls")) {
          description = "Permission denied by RLS. Aap admin role se logged-in ho? (user_roles table check karo)";
        } else if (msg.includes("permission")) {
          description = "Permission denied. Admin role required.";
        }
        toast({ title: "Update Failed", description, variant: "destructive" });
        return;
      }

      if (!data || data.status !== newStatus) {
        toast({
          title: "Update Blocked by Trigger",
          description:
            "restrict_buyer_order_updates trigger ne status revert kar diya. Aapka session admin nahi hai — public.is_admin(auth.uid()) false return kar raha hai. user_roles me apna admin role verify karo.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Order Updated", description: `Order status changed to ${newStatus}` });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast({ title: "Error", description: error?.message || "Failed to update order", variant: "destructive" });
    }
    setIsUpdating(false);
  };

  const handleTestTrigger = async (order: OrderWithProfile) => {
    setIsUpdating(true);
    const original = order.status || "pending";
    const testStatus = original === "processing" ? "confirmed" : "processing";
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: testStatus as any })
        .eq("id", order.id)
        .select("id, status")
        .maybeSingle();

      if (error) {
        toast({
          title: "❌ Test Failed",
          description: `DB error: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        toast({
          title: "❌ Test Failed",
          description: "Update returned no row — RLS SELECT/UPDATE policy blocked it.",
          variant: "destructive",
        });
        return;
      }

      if (data.status !== testStatus) {
        toast({
          title: "⚠️ Trigger Reverted Update",
          description: `Attempted "${testStatus}", DB kept "${data.status}". You are NOT recognized as admin. Check public.is_admin(auth.uid()) and user_roles table.`,
          variant: "destructive",
        });
        return;
      }

      // Success — revert back
      await supabase.from("orders").update({ status: original as any }).eq("id", order.id);
      toast({
        title: "✅ Test Passed",
        description: `Trigger allowed admin update. Status reverted to "${original}".`,
      });
      fetchOrders();
    } catch (e: any) {
      toast({ title: "Test Error", description: e?.message || "Unknown", variant: "destructive" });
    }
    setIsUpdating(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    processing: orders.filter(o => ["confirmed", "processing", "shipped"].includes(o.status || "")).length,
    completed: orders.filter(o => o.status === "delivered").length,
  };

  // If an order is selected, show inline detail view
  if (selectedOrder) {
    const status = statusConfig[selectedOrder.status || "pending"];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Order {selectedOrder.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              Placed on {new Date(selectedOrder.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Update */}
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("gap-1", status?.color)}>
                      {status?.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Current Status</span>
                  </div>
                  <Select
                    value={selectedOrder.status || "pending"}
                    onValueChange={(v) => handleUpdateStatus(selectedOrder.id, v)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map(s => (
                        <SelectItem key={s} value={s}>{statusConfig[s]?.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Diagnostic: verify Supabase admin trigger allows status updates.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => handleTestTrigger(selectedOrder)} disabled={isUpdating}>
                    Test Status Update
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.functions.invoke("send-order-notification", {
                          body: {
                            type: selectedOrder.status || "new_order",
                            order_number: selectedOrder.order_number,
                            to_email: (selectedOrder.billing_address as any)?.email || selectedOrder.profile?.email,
                          },
                        });
                        if (error) throw error;
                        
                        await supabase.from("email_logs").insert({
                          order_id: selectedOrder.id,
                          recipient_email: (selectedOrder.billing_address as any)?.email || selectedOrder.profile?.email || "unknown",
                          status: "sent",
                          notification_type: selectedOrder.status || "new_order"
                        });
                        
                        toast({ title: "Email Resent", description: "Notification has been sent to the customer." });
                      } catch (err) {
                        toast({ title: "Failed to resend", description: "Check SMTP configuration.", variant: "destructive" });
                      }
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Resend Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4">Items</h4>
                <div className="space-y-3">
                  {orderItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        {item.variation_details && (
                          <p className="text-sm text-muted-foreground">{item.variation_details}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{Number(item.total_price).toLocaleString("en-IN")}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × ₹{Number(item.unit_price).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{Number(selectedOrder.subtotal).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>₹{Number(selectedOrder.tax || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>₹{Number(selectedOrder.shipping || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-base">
                    <span>Total</span>
                    <span>₹{Number(selectedOrder.total).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Customer Info */}
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Customer</h4>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleDownloadInvoice(selectedOrder)}>
                    <Download className="h-3.5 w-3.5" />
                    Invoice
                  </Button>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{(selectedOrder.billing_address as any)?.full_name || (selectedOrder.shipping_address as any)?.full_name || selectedOrder.profile?.full_name || "Guest"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{(selectedOrder.billing_address as any)?.email || selectedOrder.profile?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{(selectedOrder.billing_address as any)?.phone || (selectedOrder.shipping_address as any)?.phone || selectedOrder.profile?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Company</p>
                    <p className="font-medium">{(selectedOrder.billing_address as any)?.company || selectedOrder.profile?.company_name || "N/A"}</p>
                  </div>
                  {((selectedOrder.billing_address as any)?.gst_number || selectedOrder.profile?.gst_number) && (
                    <div>
                      <p className="text-muted-foreground">GST Number</p>
                      <p className="font-medium">{(selectedOrder.billing_address as any)?.gst_number || selectedOrder.profile?.gst_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Buyer Type</p>
                    <Badge className="bg-primary/10 text-primary">Buyer</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedOrder.shipping_address && (
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">Shipping Address</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {typeof selectedOrder.shipping_address === 'object'
                      ? Object.values(selectedOrder.shipping_address as Record<string, string>).filter(Boolean).join(', ')
                      : String(selectedOrder.shipping_address)}
                  </p>
                </CardContent>
              </Card>
            )}

            {selectedOrder.notes && (
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Orders</h1>
        
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: stats.total, icon: ShoppingCart, color: "bg-primary/10 text-primary" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "bg-warning/10 text-warning" },
          { label: "In Progress", value: stats.processing, icon: Truck, color: "bg-accent/10 text-accent" },
          { label: "Delivered", value: stats.completed, icon: CheckCircle, color: "bg-success/10 text-success" },
        ].map(s => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", s.color.split(" ")[0])}>
                  <s.icon className={cn("h-6 w-6", s.color.split(" ")[1])} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {orderStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {statusConfig[status]?.label || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => {
                  const st = statusConfig[order.status || "pending"];
                  const StatusIcon = st.icon;
                  return (
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => handleViewOrder(order)}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.profile?.full_name || "Guest"}</p>
                          <p className="text-sm text-muted-foreground">{order.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">₹{Number(order.total).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", st.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {orderStatuses
                              .filter(s => s !== order.status)
                              .map(s => (
                                <DropdownMenuItem key={s} onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, s); }}>
                                  Mark as {statusConfig[s]?.label}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
