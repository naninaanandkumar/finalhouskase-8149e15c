import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Eye } from "lucide-react";

const ORDER_STATUSES = [
  { id: "new_order", label: "New Order / Confirmed" },
  { id: "order_on_hold", label: "On Hold" },
  { id: "order_shipped", label: "Shipped" },
  { id: "order_delivered", label: "Delivered" },
  { id: "order_cancelled", label: "Cancelled" },
  { id: "order_failed", label: "Order Failed" },
  { id: "payment_failed", label: "Payment Failed" },
  { id: "payment_received", label: "Payment Received" },
];

export default function EmailPreview() {
  const [status, setStatus] = useState("new_order");
  const [orderNumber, setOrderNumber] = useState("ORD-12345");
  const [trackingNumber, setTrackingNumber] = useState("TRACK7890");
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-order-notification", {
        body: {
          type: status,
          order_number: orderNumber,
          to_email: testEmail,
          tracking_number: trackingNumber,
        },
      });

      if (error) throw error;
      toast.success(`Test email for ${status} sent to ${testEmail}`);
    } catch (err) {
      console.error("Test email error:", err);
      toast.error("Failed to send test email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Email Notification Tester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Template</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Order Number</label>
              <Input 
                value={orderNumber} 
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-XXXXX"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tracking Number</label>
              <Input 
                value={trackingNumber} 
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Email</label>
              <Input 
                type="email"
                value={testEmail} 
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSendTest} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>

          <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p><strong>Note:</strong> This tool uses the live Edge Function to send emails. Make sure your SMTP credentials are correctly configured in Lovable Cloud secrets.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
