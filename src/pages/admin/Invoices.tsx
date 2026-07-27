import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt, Search, MoreHorizontal, Download, Loader2, IndianRupee, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { generateGSTInvoice } from "@/lib/generateInvoice";
import { buildInvoiceItems, calculateOrderDiscount, getInvoicePartyData } from "@/lib/invoiceHelpers";
import { fetchStoreSettings } from "@/lib/storeSettings";

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  user_id: string | null;
  amount: number;
  tax: number | null;
  total: number;
  status: string | null;
  pdf_url: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function AdminInvoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({ title: "Error", description: "Failed to load invoices", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const [orderResult, storeSettings] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").eq("id", invoice.order_id).single(),
        fetchStoreSettings(),
      ]);

      const order = orderResult.data;
      if (!order) {
        toast({ title: "Error", description: "Order not found", variant: "destructive" });
        return;
      }

      const orderItems = (order.order_items || []) as any[];
      const productIds = [...new Set(orderItems.map((item: any) => item.product_id).filter(Boolean))] as string[];

      const [profileResult, productsResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", order.user_id).maybeSingle(),
        productIds.length > 0
          ? supabase.from("products").select("id, hsn_code").in("id", productIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const profile = profileResult.data;
      const productHsnMap = new Map<string, string>();
      (productsResult.data || []).forEach((product: any) => {
        if (product?.id && product?.hsn_code) {
          productHsnMap.set(product.id, product.hsn_code);
        }
      });

      const shipping = order.shipping_address as any;
      const billing = order.billing_address as any;

      const partyData = getInvoicePartyData({
        shippingAddress: shipping,
        billingAddress: billing,
        profile,
        userEmail: profile?.email,
      });

      const discountTotal = calculateOrderDiscount({
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: invoice.total,
      });

      const doc = generateGSTInvoice({
        invoice_number: invoice.invoice_number,
        order_number: order.order_number,
        date: format(new Date(invoice.created_at), "dd MMM yyyy"),
        buyer_name: partyData.buyerName,
        bill_to_name: partyData.billToName,
        ship_to_name: partyData.shipToName,
        buyer_email: partyData.buyerEmail,
        buyer_phone: partyData.buyerPhone,
        company_name: partyData.companyName,
        gst_number: partyData.gstNumber,
        billing_address: partyData.billingAddress,
        shipping_address: partyData.shippingAddress,
        items: buildInvoiceItems(orderItems, productHsnMap, Number(order.subtotal), discountTotal),
        subtotal: Number(invoice.amount),
        tax: Number(invoice.tax || 0),
        gst_percentage: 18,
        shipping: Number(order.shipping || 0),
        total: Number(invoice.total),
        discount_total: discountTotal,
        ...storeSettings,
      });

      (await doc).save(`invoice-${invoice.invoice_number}.pdf`);
      toast({ title: "Invoice Downloaded", description: `PDF saved as invoice-${invoice.invoice_number}.pdf` });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({ title: "Error", description: "Failed to download invoice", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success/10 text-success">Paid</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-destructive/10 text-destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status || "Draft"}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + Number(i.total), 0);
  const pendingAmount = invoices.filter(i => i.status === "pending").reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Invoices</h1>
        
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoices.length}</p>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
                <p className="text-sm text-muted-foreground">Paid Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{pendingAmount.toLocaleString("en-IN")}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{format(new Date(invoice.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>₹{Number(invoice.amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>₹{Number(invoice.tax || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="font-semibold">₹{Number(invoice.total).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
