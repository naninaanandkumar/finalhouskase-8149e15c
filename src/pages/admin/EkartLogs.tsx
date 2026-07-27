import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LogRow {
  id: string;
  order_id: string | null;
  order_number: string | null;
  action: string;
  endpoint: string | null;
  request_payload: unknown;
  response_payload: unknown;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  tracking_id: string | null;
  created_at: string;
}

export default function EkartLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selected, setSelected] = useState<LogRow | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ekart_integration_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast({ title: "Failed to load logs", description: error.message, variant: "destructive" });
    setLogs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const retrySync = async (orderId: string) => {
    setSyncing(orderId);
    const { data, error } = await supabase.functions.invoke("ekart-create-shipment", {
      body: { order_id: orderId },
    });
    setSyncing(null);
    if (error) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    } else if ((data as any)?.error) {
      toast({ title: "Sync failed", description: (data as any).error, variant: "destructive" });
    } else {
      toast({ title: "Shipment created", description: `Tracking: ${(data as any)?.tracking_id || "n/a"}` });
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Ekart Integration Logs</h1>
          <p className="text-sm text-muted-foreground">Every Ekart API request, response, and sync state per order.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent activity (last 200)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No Ekart activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Tracking</th>
                    <th className="py-2 pr-3">Result</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-3">{l.order_number || l.order_id?.slice(0, 8) || "—"}</td>
                      <td className="py-2 pr-3">{l.action}</td>
                      <td className="py-2 pr-3">{l.status_code ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono">{l.tracking_id || "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={l.success ? "default" : "destructive"}>
                          {l.success ? "OK" : "FAIL"}
                        </Badge>
                        {l.error_message && (
                          <div className="text-[10px] text-muted-foreground max-w-[240px] truncate">{l.error_message}</div>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setSelected(l)}>View</Button>
                          {l.order_id && !l.success && l.action === "create_shipment" && (
                            <Button size="sm" onClick={() => retrySync(l.order_id!)} disabled={syncing === l.order_id}>
                              {syncing === l.order_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Log detail — {selected?.action}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div><span className="font-semibold">Endpoint:</span> {selected.endpoint || "—"}</div>
              <div><span className="font-semibold">Status:</span> {selected.status_code ?? "—"}</div>
              <div>
                <div className="font-semibold mb-1">Request</div>
                <pre className="bg-muted p-2 rounded overflow-auto max-h-60">{JSON.stringify(selected.request_payload, null, 2)}</pre>
              </div>
              <div>
                <div className="font-semibold mb-1">Response</div>
                <pre className="bg-muted p-2 rounded overflow-auto max-h-60">{JSON.stringify(selected.response_payload, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
