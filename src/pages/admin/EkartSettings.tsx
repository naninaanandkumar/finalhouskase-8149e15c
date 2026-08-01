import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EkartSettings() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [testTracking, setTestTracking] = useState("");
  const { toast } = useToast();

  const trackUrl = "https://app.elite.ekartlogistics.in/track/";

  const runVerify = async () => {
    setTesting(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("ekart-verify-credentials", { body: {} });
    setTesting(false);
    if (error) {
      toast({ title: "Verify failed", description: error.message, variant: "destructive" });
      setResult({ ok: false, error: error.message });
    } else {
      setResult(data);
    }
  };

  const testTrack = async () => {
    if (!testTracking.trim()) return;
    const { data, error } = await supabase.functions.invoke("ekart-track", { body: { tracking_id: testTracking.trim() } });
    if (error) toast({ title: "Track failed", description: error.message, variant: "destructive" });
    else toast({ title: "Track result", description: JSON.stringify((data as any)?.current || data).slice(0, 200) });
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast({ title: "Copied" }); };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Ekart Settings</h1>
        <p className="text-sm text-muted-foreground">Configure Ekart credentials and verify the connection.</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Credentials</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Ekart credentials are stored as backend secrets. Ask the developer to add or update the following via secure secrets:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><code>EKART_CLIENT_ID</code> — from your Ekart onboarding</li>
            <li><code>EKART_CLIENT_SECRET</code> — Ekart API secret</li>
            <li><code>EKART_WEBHOOK_SECRET</code> — optional; if set, Ekart must send it as <code>x-ekart-signature</code></li>
            <li><code>EKART_BASE_URL</code> — optional; defaults to <code>https://app.elite.ekartlogistics.in</code></li>
          </ul>
          <Alert>
            <AlertDescription className="text-xs">
              The verify button below tries to fetch a live access token from Ekart using the currently stored credentials.
            </AlertDescription>
          </Alert>
          <Button onClick={runVerify} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run verification test
          </Button>
          {result && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                {result.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <Badge variant={result.ok ? "default" : "destructive"}>{result.ok ? "Connection OK" : "Failed"}</Badge>
                {result.status_code && <span className="text-xs text-muted-foreground">HTTP {result.status_code}</span>}
              </div>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-60">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Webhook URL</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Give this URL to Ekart so shipment status updates flow into your orders automatically.</p>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copy(webhookUrl)}><Copy className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Quick tracking test</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="tt" className="text-xs">Tracking ID</Label>
          <div className="flex gap-2">
            <Input id="tt" value={testTracking} onChange={(e) => setTestTracking(e.target.value)} placeholder="Enter an Ekart tracking id" />
            <Button onClick={testTrack} disabled={!testTracking.trim()}>Track</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
