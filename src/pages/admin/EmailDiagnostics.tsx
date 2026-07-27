import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw, Mail, Globe, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DnsCheck {
  record: string;
  name: string;
  found: boolean;
  values: string[];
  ok: boolean;
  message: string;
}
interface DnsResponse {
  domain: string;
  allOk: boolean;
  results: DnsCheck[];
  checkedAt: string;
}

export default function EmailDiagnostics() {
  const [domain, setDomain] = useState("houskase.com");
  const [dns, setDns] = useState<DnsResponse | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Houskase SMTP test");
  const [message, setMessage] = useState("Hello from the Houskase admin diagnostics page.");
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const runDnsCheck = async () => {
    setDnsLoading(true);
    setDns(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-email-dns", {
        method: "GET",
        // supabase-js doesn't add query strings for GET; pass via body-less URL manually
      } as any);
      // fallback: call via fetch to include query param
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/check-email-dns?domain=${encodeURIComponent(domain)}`;
      const resp = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const json = (await resp.json()) as DnsResponse;
      setDns(json);
      if (error) console.warn(error);
    } catch (e: any) {
      toast({ title: "DNS check failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setDnsLoading(false);
    }
  };

  useEffect(() => { runDnsCheck(); /* eslint-disable-next-line */ }, []);

  const sendTest = async () => {
    if (!to) {
      toast({ title: "Enter a recipient email", variant: "destructive" });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: { to, subject, message },
      });
      if (error) {
        setTestResult({ success: false, errorMessage: error.message, raw: error });
        toast({ title: "SMTP test failed", description: error.message, variant: "destructive" });
      } else {
        setTestResult(data as Record<string, unknown>);
        if ((data as any)?.success) {
          toast({ title: "Test email sent", description: `Delivered to ${to}` });
        } else {
          toast({ title: "SMTP responded with error", description: (data as any)?.errorMessage, variant: "destructive" });
        }
      }
    } catch (e: any) {
      setTestResult({ success: false, errorMessage: e?.message });
      toast({ title: "Send failed", description: e?.message, variant: "destructive" });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Mail className="h-6 w-6" /> Email Diagnostics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verify DNS records for your sender domain and send test emails through Hostinger SMTP.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> DNS propagation check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="houskase.com" />
            <Button onClick={runDnsCheck} disabled={dnsLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${dnsLoading ? "animate-spin" : ""}`} />
              {dnsLoading ? "Checking..." : "Check DNS"}
            </Button>
          </div>

          {dns && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={dns.allOk ? "default" : "destructive"}>
                  {dns.allOk ? "All records healthy" : "Issues detected"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Last checked {new Date(dns.checkedAt).toLocaleString()}
                </span>
              </div>
              <div className="space-y-2">
                {dns.results.map((r) => (
                  <div key={r.record} className="border rounded-md p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {r.ok ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="font-medium text-sm">{r.record}</span>
                          <span className="text-xs text-muted-foreground">{r.name}.{dns.domain}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{r.message}</p>
                        {r.values.length > 0 && (
                          <pre className="mt-2 text-[11px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
                            {r.values.join("\n")}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Send test email (Hostinger SMTP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button onClick={sendTest} disabled={testLoading}>
            {testLoading ? "Sending..." : "Send test email"}
          </Button>

          {testResult && (
            <div className={`border rounded-md p-3 text-xs ${(testResult as any).success ? "border-green-500/40 bg-green-500/5" : "border-destructive/40 bg-destructive/5"}`}>
              <div className="flex items-center gap-2 mb-2">
                {(testResult as any).success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="font-medium">
                  {(testResult as any).success ? "SMTP accepted the message" : "SMTP returned an error"}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-all bg-background p-2 rounded border overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
