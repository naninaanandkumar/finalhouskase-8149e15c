import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookEvent {
  id: string;
  provider: string;
  event_type: string | null;
  external_id: string | null;
  status: string | null;
  created_at: string;
  error_message: string | null;
}

export default function WebhookLogs() {
  const [logs, setLogs] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast({ title: "Failed to load logs", description: error.message, variant: "destructive" });
    setLogs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const runValidation = async (provider: "razorpay" | "ekart") => {
    setValidating(true);
    const fn = provider === "ekart" ? "ekart-verify-credentials" : "verify-razorpay-payment";
    // For payment verification, this is a placeholder test; actual verification requires a valid payment flow
    const { data, error } = await supabase.functions.invoke(fn, {
        body: { test: true }
    });
    setValidating(false);
    if (error) {
        toast({ title: "Validation error", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Validation check run", description: "See system logs for details." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Webhook Activity Logs</h1>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => runValidation("ekart")} disabled={validating}>
                {validating ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : "Test Ekart Credentials"}
            </Button>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Events</CardTitle></CardHeader>
        <CardContent>
            {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div> : (
                <div className="space-y-2">
                    {logs.map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                            <div className="flex items-center gap-3">
                                {log.status === 'processed' ? <CheckCircle2 className="h-4 w-4 text-green-500"/> : <AlertCircle className="h-4 w-4 text-amber-500"/>}
                                <div>
                                    <div className="font-medium">{log.provider.toUpperCase()} — {log.event_type}</div>
                                    <div className="text-muted-foreground text-xs">{new Date(log.created_at).toLocaleString()} | ID: {log.external_id}</div>
                                </div>
                            </div>
                            <div className={log.error_message ? "text-destructive" : "text-muted-foreground"}>
                                {log.error_message || log.status}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
