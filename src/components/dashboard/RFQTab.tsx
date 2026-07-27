import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileQuestion, Clock, CheckCircle, XCircle, MessageSquare, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RFQItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  target_price: number | null;
  quoted_price: number | null;
}

interface RFQRequest {
  id: string;
  rfq_number: string;
  product_name: string;
  quantity: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
  quoted_price: number | null;
  target_price: number | null;
  items?: RFQItem[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-warning/10 text-warning", label: "Pending Review" },
  quoted: { icon: MessageSquare, color: "bg-primary/10 text-primary", label: "Quote Received" },
  accepted: { icon: CheckCircle, color: "bg-success/10 text-success", label: "Accepted" },
  rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Rejected" },
  expired: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Expired" },
};

export function RFQTab() {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<RFQRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRFQs();
    }
  }, [user]);

  const fetchRFQs = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch RFQ requests
      const { data: rfqData, error } = await supabase
        .from("rfq_requests_user" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch items for each RFQ
      const rfqsWithItems = await Promise.all(
        ((rfqData as any[]) || []).map(async (rfq: any) => {
          const { data: items } = await supabase
            .from("rfq_items")
            .select("*")
            .eq("rfq_id", rfq.id);
          return { ...rfq, items: items || [] };
        })
      );

      setRfqs(rfqsWithItems);
    } catch (error) {
      console.error("Error fetching RFQs:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (rfqs.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>RFQ Requests</CardTitle>
          <CardDescription>Track your quotation requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No quotation requests yet</p>
            <Button asChild>
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>RFQ Requests</CardTitle>
        <CardDescription>Track your quotation requests and admin responses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rfqs.map((rfq) => {
            const status = statusConfig[rfq.status || "pending"];
            const StatusIcon = status.icon;
            const hasItems = rfq.items && rfq.items.length > 0;
            const totalItems = hasItems ? rfq.items!.length : 1;

            return (
              <div
                key={rfq.id}
                className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Product Images */}
                    <div className="flex -space-x-2">
                      {hasItems ? (
                        rfq.items!.slice(0, 3).map((item, idx) => (
                          <div
                            key={item.id}
                            className="w-12 h-12 rounded-lg border-2 border-background overflow-hidden bg-secondary"
                            style={{ zIndex: 3 - idx }}
                          >
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileQuestion className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                          <FileQuestion className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      {totalItems > 3 && (
                        <div className="w-12 h-12 rounded-lg border-2 border-background bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">+{totalItems - 3}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-foreground">{rfq.rfq_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {totalItems} {totalItems === 1 ? "product" : "products"} • {rfq.quantity} total units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(rfq.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge className={cn("text-xs", status.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      {rfq.quoted_price && (
                        <p className="text-lg font-bold text-success mt-1">
                          ₹{Number(rfq.quoted_price).toLocaleString("en-IN")}
                          <span className="text-xs text-muted-foreground font-normal ml-1">quoted</span>
                        </p>
                      )}
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>RFQ Details - {rfq.rfq_number}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                          {/* Status */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge className={cn(status.color)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>

                          {/* Products */}
                          <div>
                            <h4 className="font-semibold mb-3">Products</h4>
                            <div className="space-y-3">
                              {hasItems ? (
                                rfq.items!.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-4 p-3 rounded-lg border"
                                  >
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                                      {item.product_image ? (
                                        <img
                                          src={item.product_image}
                                          alt={item.product_name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <FileQuestion className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium">{item.product_name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Qty: {item.quantity}
                                        {item.target_price && ` • Target: $${item.target_price}`}
                                      </p>
                                    </div>
                                    {item.quoted_price && (
                                      <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Quoted</p>
                                        <p className="font-bold text-success">${item.quoted_price}</p>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="p-3 rounded-lg border">
                                  <p className="font-medium">{rfq.product_name}</p>
                                  <p className="text-sm text-muted-foreground">Qty: {rfq.quantity}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Admin Notes */}
                          {rfq.admin_notes && (
                            <div>
                              <h4 className="font-semibold mb-2">Admin Response</h4>
                              <div className="p-3 rounded-lg bg-muted">
                                <p className="text-sm">{rfq.admin_notes}</p>
                              </div>
                            </div>
                          )}

                          {/* Summary */}
                          {rfq.quoted_price && (
                            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">Total Quoted Price</span>
                                <span className="text-2xl font-bold text-success">
                                  ₹{Number(rfq.quoted_price).toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
