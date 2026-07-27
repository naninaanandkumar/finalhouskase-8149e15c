 import { useState, useEffect } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
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
   FileText,
   Search,
   MoreHorizontal,
   Eye,
   Clock,
   CheckCircle,
   XCircle,
   DollarSign,
   Loader2,
   Send,
   Building2,
   Store,
  Package,
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { Tables } from "@/integrations/supabase/types";
import { ScrollArea } from "@/components/ui/scroll-area";
 
 type RFQRequest = Tables<"rfq_requests">;

interface RFQItem {
  id: string;
  product_name: string;
  product_image: string | null;
  variation_details: string | null;
  quantity: number;
  target_price: number | null;
  quoted_price: number | null;
}
 
 const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
   pending: { icon: Clock, color: "bg-warning/10 text-warning", label: "Pending" },
   quoted: { icon: DollarSign, color: "bg-primary/10 text-primary", label: "Quoted" },
   accepted: { icon: CheckCircle, color: "bg-success/10 text-success", label: "Accepted" },
   rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Rejected" },
   expired: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Expired" },
 };
 
 const rfqStatuses = ["pending", "quoted", "accepted", "rejected", "expired"];
 
 export default function AdminRFQ() {
   const [rfqs, setRfqs] = useState<RFQRequest[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState("");
   const [statusFilter, setStatusFilter] = useState<string>("all");
   const [selectedRfq, setSelectedRfq] = useState<RFQRequest | null>(null);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [isUpdating, setIsUpdating] = useState(false);
   const [quotedPrice, setQuotedPrice] = useState("");
   const [adminNotes, setAdminNotes] = useState("");
  const [rfqItems, setRfqItems] = useState<RFQItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
   const { toast } = useToast();
 
   const fetchRfqs = async () => {
     setIsLoading(true);
     try {
       const { data, error } = await supabase
         .from("rfq_requests")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setRfqs(data || []);
     } catch (error) {
       console.error("Error fetching RFQs:", error);
       toast({ title: "Error", description: "Failed to load RFQ requests", variant: "destructive" });
     }
     setIsLoading(false);
   };
 
   useEffect(() => {
     fetchRfqs();
   }, []);
 
  const handleViewRfq = async (rfq: RFQRequest) => {
     setSelectedRfq(rfq);
     setQuotedPrice(rfq.quoted_price?.toString() || "");
     setAdminNotes(rfq.admin_notes || "");
     setDialogOpen(true);
    
    // Fetch RFQ items
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from("rfq_items")
        .select("*")
        .eq("rfq_id", rfq.id);

      if (error) throw error;
      setRfqItems(data || []);
    } catch (error) {
      console.error("Error fetching RFQ items:", error);
    } finally {
      setLoadingItems(false);
    }
   };
 
   const handleSendQuote = async () => {
     if (!selectedRfq || !quotedPrice) {
       toast({ title: "Error", description: "Please enter a quoted price", variant: "destructive" });
       return;
     }
 
     setIsUpdating(true);
     try {
       const { error } = await supabase
         .from("rfq_requests")
         .update({
           status: "quoted" as any,
           quoted_price: parseFloat(quotedPrice),
           admin_notes: adminNotes || null,
         })
         .eq("id", selectedRfq.id);
 
       if (error) throw error;
 
       toast({ title: "Quote Sent", description: "The quote has been sent to the buyer." });
       setDialogOpen(false);
       fetchRfqs();
     } catch (error) {
       console.error("Error sending quote:", error);
       toast({ title: "Error", description: "Failed to send quote", variant: "destructive" });
     }
     setIsUpdating(false);
   };
 
   const handleUpdateStatus = async (rfqId: string, newStatus: string) => {
     setIsUpdating(true);
     try {
       const { error } = await supabase
         .from("rfq_requests")
         .update({ status: newStatus as any })
         .eq("id", rfqId);
 
       if (error) throw error;
 
       toast({ title: "RFQ Updated", description: `Status changed to ${newStatus}` });
       fetchRfqs();
       if (selectedRfq?.id === rfqId) {
         setSelectedRfq(prev => prev ? { ...prev, status: newStatus as any } : null);
       }
     } catch (error) {
       console.error("Error updating RFQ:", error);
       toast({ title: "Error", description: "Failed to update RFQ", variant: "destructive" });
     }
     setIsUpdating(false);
   };
 
   const filteredRfqs = rfqs.filter(rfq => {
     const matchesSearch = rfq.rfq_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
       rfq.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       rfq.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       rfq.email.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesStatus = statusFilter === "all" || rfq.status === statusFilter;
     return matchesSearch && matchesStatus;
   });
 
   const getStatusStats = () => {
     return {
       total: rfqs.length,
       pending: rfqs.filter(r => r.status === "pending").length,
       quoted: rfqs.filter(r => r.status === "quoted").length,
       accepted: rfqs.filter(r => r.status === "accepted").length,
     };
   };
 
   const stats = getStatusStats();
 
   return (
     <div className="space-y-6">
       {/* Page Header */}
       <div>
         <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">RFQ Requests</h1>
         
       </div>
 
       {/* Stats */}
       <div className="grid sm:grid-cols-4 gap-4">
         <Card className="shadow-card">
           <CardContent className="pt-6">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                 <FileText className="h-6 w-6 text-primary" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{stats.total}</p>
                 <p className="text-sm text-muted-foreground">Total RFQs</p>
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
                 <p className="text-2xl font-bold">{stats.pending}</p>
                 <p className="text-sm text-muted-foreground">Pending</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card className="shadow-card">
           <CardContent className="pt-6">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                 <DollarSign className="h-6 w-6 text-accent" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{stats.quoted}</p>
                 <p className="text-sm text-muted-foreground">Quoted</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card className="shadow-card">
           <CardContent className="pt-6">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                 <CheckCircle className="h-6 w-6 text-success" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{stats.accepted}</p>
                 <p className="text-sm text-muted-foreground">Accepted</p>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Filters */}
       <Card className="shadow-card">
         <CardContent className="pt-6">
           <div className="flex flex-col sm:flex-row gap-4">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search by RFQ number, product, or buyer..."
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
                 {rfqStatuses.map(status => (
                   <SelectItem key={status} value={status}>
                     {statusConfig[status]?.label || status}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
         </CardContent>
       </Card>
 
       {/* RFQ Table */}
       <Card className="shadow-card">
         <CardContent className="p-0">
           {isLoading ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin" />
             </div>
           ) : filteredRfqs.length === 0 ? (
             <div className="text-center py-12">
               <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
               <p className="text-muted-foreground">No RFQ requests found</p>
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>RFQ #</TableHead>
                   <TableHead>Product</TableHead>
                   <TableHead>Buyer</TableHead>
                   <TableHead>Quantity</TableHead>
                   <TableHead>Target Price</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Date</TableHead>
                   <TableHead className="w-[50px]"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredRfqs.map(rfq => {
                   const status = statusConfig[rfq.status || "pending"];
                   const StatusIcon = status.icon;
                   return (
                     <TableRow key={rfq.id}>
                       <TableCell className="font-medium">{rfq.rfq_number}</TableCell>
                       <TableCell>
                         <div>
                           <p className="font-medium">{rfq.product_name}</p>
                           {rfq.category && <p className="text-sm text-muted-foreground">{rfq.category}</p>}
                         </div>
                       </TableCell>
                       <TableCell>
                         <div>
                           <p className="font-medium">{rfq.full_name}</p>
                           <p className="text-sm text-muted-foreground">{rfq.company_name || rfq.email}</p>
                         </div>
                       </TableCell>
                       <TableCell>{rfq.quantity.toLocaleString()} units</TableCell>
                       <TableCell>
                         {rfq.target_price ? `₹${Number(rfq.target_price).toLocaleString("en-IN")}` : "-"}
                       </TableCell>
                       <TableCell>
                         <Badge className={cn("gap-1", status.color)}>
                           <StatusIcon className="h-3 w-3" />
                           {status.label}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-muted-foreground">
                         {new Date(rfq.created_at).toLocaleDateString()}
                       </TableCell>
                       <TableCell>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon">
                               <MoreHorizontal className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => handleViewRfq(rfq)}>
                               <Eye className="h-4 w-4 mr-2" />
                               View & Quote
                             </DropdownMenuItem>
                             {rfqStatuses
                               .filter(s => s !== rfq.status)
                               .map(s => (
                                 <DropdownMenuItem key={s} onClick={() => handleUpdateStatus(rfq.id, s)}>
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
 
       {/* RFQ Details Dialog */}
       <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
         <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>RFQ {selectedRfq?.rfq_number}</DialogTitle>
             <DialogDescription>
               Submitted on {selectedRfq && new Date(selectedRfq.created_at).toLocaleString()}
             </DialogDescription>
           </DialogHeader>
           {selectedRfq && (
             <div className="space-y-6">
               {/* Status */}
               <div className="flex items-center gap-3">
                 <Badge className={cn("gap-1", statusConfig[selectedRfq.status || "pending"]?.color)}>
                   {statusConfig[selectedRfq.status || "pending"]?.label}
                 </Badge>
                 {selectedRfq.buyer_type && (
                   <Badge className={selectedRfq.buyer_type === "shop" ? "bg-shop/10 text-shop" : "bg-retail/10 text-retail"}>
                     {selectedRfq.buyer_type === "shop" ? <Building2 className="h-3 w-3 mr-1" /> : <Store className="h-3 w-3 mr-1" />}
                     {selectedRfq.buyer_type}
                   </Badge>
                 )}
               </div>
 
               {/* Buyer Info */}
               <div className="p-4 rounded-xl border">
                 <h4 className="font-medium mb-3">Buyer Information</h4>
                 <div className="grid sm:grid-cols-2 gap-4 text-sm">
                   <div>
                     <p className="text-muted-foreground">Name</p>
                     <p className="font-medium">{selectedRfq.full_name}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Email</p>
                     <p className="font-medium">{selectedRfq.email}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Company</p>
                     <p className="font-medium">{selectedRfq.company_name || "N/A"}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Phone</p>
                     <p className="font-medium">{selectedRfq.phone || "N/A"}</p>
                   </div>
                 </div>
               </div>
 
               {/* Product Info */}
               <div className="p-4 rounded-xl border">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Requested Products ({rfqItems.length || 1})
                </h4>
                
                {loadingItems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : rfqItems.length > 0 ? (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-3">
                      {rfqItems.map((item) => (
                        <div key={item.id} className="flex gap-4 p-3 rounded-lg bg-secondary/50 border">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={item.product_image || "/placeholder.svg"}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm truncate">{item.product_name}</h5>
                            {item.variation_details && (
                              <p className="text-xs text-muted-foreground">{item.variation_details}</p>
                            )}
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm font-medium">Qty: {item.quantity}</span>
                              {item.target_price && (
                                <span className="text-sm text-muted-foreground">
                                  Target: ₹{Number(item.target_price).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="font-medium">{selectedRfq.product_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Quantity: {selectedRfq.quantity.toLocaleString()} units
                    </p>
                    {selectedRfq.target_price && (
                      <p className="text-sm text-muted-foreground">
                        Target Price: ₹{Number(selectedRfq.target_price).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                )}

                {selectedRfq.message && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-muted-foreground text-sm mb-1">Message</p>
                    <p className="text-sm">{selectedRfq.message}</p>
                  </div>
                )}
               </div>
 
              {/* Quotation Builder */}
              {selectedRfq.status === "pending" && (
                <div className="p-4 rounded-xl border-2 border-accent/30 bg-accent/5">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Send className="h-4 w-4 text-accent" />
                    Quotation Builder
                  </h4>
                  <div className="space-y-4">
                    {/* Unit Price */}
                    <div className="space-y-2">
                      <Label htmlFor="quoted_price">Unit Price *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="quoted_price"
                          type="number"
                          value={quotedPrice}
                          onChange={(e) => setQuotedPrice(e.target.value)}
                          placeholder="0.00"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Pricing Summary */}
                    {quotedPrice && selectedRfq.quantity && (
                      <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal ({selectedRfq.quantity} units)</span>
                          <span className="font-medium">₹{(parseFloat(quotedPrice) * selectedRfq.quantity).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">GST (18%)</span>
                          <span className="font-medium">₹{(parseFloat(quotedPrice) * selectedRfq.quantity * 0.18).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="font-semibold">Total Amount</span>
                          <span className="font-bold text-accent">
                            ₹{(parseFloat(quotedPrice) * selectedRfq.quantity * 1.18).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Delivery & Payment Terms */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Delivery Timeline</Label>
                        <Select defaultValue="7-14">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3-5">3-5 Days</SelectItem>
                            <SelectItem value="7-14">7-14 Days</SelectItem>
                            <SelectItem value="14-21">14-21 Days</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quote Validity</Label>
                        <Select defaultValue="7">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 Days</SelectItem>
                            <SelectItem value="14">14 Days</SelectItem>
                            <SelectItem value="30">30 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Select defaultValue="advance">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="advance">100% Advance</SelectItem>
                          <SelectItem value="partial">50% Advance, 50% Before Dispatch</SelectItem>
                          <SelectItem value="neft">NEFT/RTGS on Delivery</SelectItem>
                          <SelectItem value="credit">Credit (For Approved Buyers)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin_notes">Notes to Buyer</Label>
                      <Textarea
                        id="admin_notes"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add terms, conditions, or special notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Quote Display */}
              {selectedRfq.quoted_price && (
                <div className="p-4 rounded-xl bg-success/5 border-2 border-success/30">
                  <h4 className="font-medium mb-2">Quoted Price</h4>
                  <p className="text-2xl font-bold text-success">
                    ₹{Number(selectedRfq.quoted_price).toLocaleString()} per unit
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total (incl. GST): ₹{(Number(selectedRfq.quoted_price) * selectedRfq.quantity * 1.18).toLocaleString()}
                  </p>
                  {selectedRfq.admin_notes && (
                    <div className="mt-3 pt-3 border-t border-success/20">
                      <p className="text-sm text-muted-foreground">Notes: {selectedRfq.admin_notes}</p>
                    </div>
                  )}
                </div>
              )}
             </div>
           )}
           <DialogFooter>
             <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
             {selectedRfq?.status === "pending" && (
               <Button onClick={handleSendQuote} disabled={isUpdating || !quotedPrice} className="bg-gradient-accent gap-2">
                 {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                 <Send className="h-4 w-4" />
                 Send Quote
               </Button>
             )}
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }