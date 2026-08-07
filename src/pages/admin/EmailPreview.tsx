import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, History, RotateCcw, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

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
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("version", { ascending: false });
    setTemplates(data || []);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("email_logs")
      .select("*, orders(order_number)")
      .order("sent_at", { ascending: false })
      .limit(50);
    setLogs(data || []);
  };

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, []);

  const handleSendTest = async (specificStatus?: string) => {
    const targetStatus = specificStatus || status;
    if (!testEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-order-notification", {
        body: {
          type: targetStatus,
          order_number: orderNumber,
          to_email: testEmail,
          tracking_number: trackingNumber,
        },
      });

      if (error) throw error;
      
      // Log the attempt
      await supabase.from("email_logs").insert({
        recipient_email: testEmail,
        status: "sent",
        notification_type: targetStatus,
        metadata: { order_number: orderNumber, tracking_number: trackingNumber }
      });

      if (!specificStatus) toast.success(`Test email for ${targetStatus} sent to ${testEmail}`);
      fetchLogs();
    } catch (err) {
      console.error("Test email error:", err);
      toast.error(`Failed to send ${targetStatus} email`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAll = async () => {
    if (!testEmail) {
      toast.error("Please enter an email address");
      return;
    }
    setIsBulkLoading(true);
    try {
      for (const s of ORDER_STATUSES) {
        await handleSendTest(s.id);
      }
      toast.success("Sent test emails for all statuses!");
    } finally {
      setIsBulkLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="tester" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tester">Tester & Preview</TabsTrigger>
          <TabsTrigger value="history">Email Logs</TabsTrigger>
          <TabsTrigger value="templates">Template Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="tester">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-6 h-6" />
                Email Notification Tester
              </CardTitle>
              <Button 
                variant="outline" 
                onClick={handleSendAll} 
                disabled={isBulkLoading || !testEmail}
                className="gap-2"
              >
                {isBulkLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                Send All Statuses at Once
              </Button>
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
                <Button onClick={() => handleSendTest()} disabled={isLoading || isBulkLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Single Test Email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-6 h-6" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {format(new Date(log.sent_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>{log.recipient_email}</TableCell>
                      <TableCell className="capitalize">{log.notification_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {log.status === "sent" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-xs">{log.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setTestEmail(log.recipient_email);
                            setStatus(log.notification_type);
                            handleSendTest(log.notification_type);
                          }}
                          className="h-8 gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Resend
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Template Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground italic">
                {templates.length === 0 ? "No previous versions found. Templates are currently managed via Edge Function code." : "Version rollback system enabled."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}