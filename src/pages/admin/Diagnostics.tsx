import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProductStoragePathFromUrl } from "@/lib/signedImageUrls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Stethoscope, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface BucketCheck { name: string; exists: boolean; canUpload: boolean; canRead: boolean; publicRead?: boolean; signedFallback?: boolean; error?: string; }
interface LogEntry { ok: boolean; message: string; bucket: string; fileName?: string; at: string; }

const BUCKETS = ["product-images", "rfq-attachments"];

export default function AdminDiagnostics() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<BucketCheck[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastError, setLastError] = useState<LogEntry | null>(null);
  const [rollingLog, setRollingLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const readLogs = () => {
    try {
      setLogs(JSON.parse(localStorage.getItem("admin_upload_log") || "[]"));
      setLastError(JSON.parse(localStorage.getItem("admin_last_upload_error") || "null"));
    } catch {
      setLogs([]);
      setLastError(null);
    }
  };

  const addRollingLog = (message: string) => {
    const line = `${new Date().toLocaleTimeString()} — ${message}`;
    setRollingLog((prev) => [line, ...prev].slice(0, 50));
  };

  const run = async () => {
    setRunning(true);
    setRollingLog([]);
    addRollingLog("Starting diagnostics scan");
    // role check
    if (user) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      addRollingLog(data ? "Admin role check passed" : "Admin role check failed");
    } else setIsAdmin(false);

    const out: BucketCheck[] = [];
    for (const name of BUCKETS) {
      const c: BucketCheck = { name, exists: false, canUpload: false, canRead: false };
      try {
        addRollingLog(`Checking bucket: ${name}`);
        const listed = await supabase.storage.from(name).list("", { limit: 1 });
        c.exists = !listed.error;
        c.canRead = !listed.error;
        if (listed.error) c.error = listed.error.message;
        // probe upload of 1-byte test
        const probe = new Blob([Uint8Array.from([137, 80, 78, 71])], { type: "image/png" });
        const path = `_diagnostics/${Date.now()}.png`;
        const up = await supabase.storage.from(name).upload(path, probe);
        c.canUpload = !up.error;
        if (up.error && !c.error) c.error = up.error.message;
        addRollingLog(up.error ? `${name} upload probe failed: ${up.error.message}` : `${name} upload probe passed`);
        if (!up.error) {
          const { data: publicData } = supabase.storage.from(name).getPublicUrl(path);
          try {
            const publicRes = await fetch(publicData.publicUrl, { method: "GET", cache: "no-store" });
            c.publicRead = publicRes.ok;
            addRollingLog(publicRes.ok ? `${name} public URL works` : `${name} public URL blocked (${publicRes.status})`);
          } catch (e: any) {
            c.publicRead = false;
            addRollingLog(`${name} public URL check failed: ${e?.message || "network error"}`);
          }

          if (name === "product-images") {
            const objectPath = getProductStoragePathFromUrl(publicData.publicUrl);
            const signed = objectPath
              ? await supabase.storage.from("product-images").createSignedUrl(objectPath, 3600)
              : { data: null, error: new Error("Unable to parse storage path") };
            c.signedFallback = !signed.error && !!signed.data?.signedUrl;
            addRollingLog(c.signedFallback ? "Signed URL fallback works for product/banner images" : `Signed URL fallback failed: ${signed.error?.message || "no URL"}`);
          }

          await supabase.storage.from(name).remove([path]);
        }
      } catch (e: any) {
        c.error = e?.message;
        addRollingLog(`${name} diagnostics exception: ${e?.message || "unknown error"}`);
      }
      out.push(c);
    }
    setChecks(out);
    readLogs();
    addRollingLog("Diagnostics scan complete");
    setRunning(false);
  };

  useEffect(() => {
    readLogs();
    run();
    const handler = () => readLogs();
    window.addEventListener("admin-upload-event", handler);
    return () => window.removeEventListener("admin-upload-event", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const Yes = () => <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
  const No = () => <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fail</Badge>;
  const NA = () => <Badge variant="outline">N/A</Badge>;
  const errorLogs = logs.filter((log) => !log.ok);
  const clearLogs = () => {
    localStorage.removeItem("admin_upload_log");
    localStorage.removeItem("admin_last_upload_error");
    readLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Stethoscope className="h-6 w-6" />Image Upload Diagnostics</h1>
          <p className="text-sm text-muted-foreground mt-1">Live status of storage buckets, your admin permissions, and recent upload activity.</p>
        </div>
        <Button onClick={run} disabled={running} variant="outline" size="sm">
          {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />} Re-run
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Account</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Signed in: {user ? <Yes /> : <No />} <span className="ml-2 text-muted-foreground">{user?.email}</span></div>
          <div>Admin role: {isAdmin === null ? <Loader2 className="inline h-4 w-4 animate-spin" /> : isAdmin ? <Yes /> : <No />}</div>
          {isAdmin === false && (
            <p className="text-xs text-destructive">
              You don't have the admin role — uploads will be rejected with "row-level security policy". Open <strong>Role Management</strong> and grant yourself the admin role (first signed-up user is auto-admin).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Storage Buckets</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left p-2">Bucket</th><th className="p-2">Exists</th><th className="p-2">List</th><th className="p-2">Upload</th><th className="p-2">Public URL</th><th className="p-2">Signed fallback</th><th className="text-left p-2">Last error</th></tr></thead>
            <tbody>
              {checks.map(c => (
                <tr key={c.name} className="border-t">
                  <td className="p-2 font-mono text-xs">{c.name}</td>
                  <td className="p-2 text-center">{c.exists ? <Yes /> : <No />}</td>
                  <td className="p-2 text-center">{c.canRead ? <Yes /> : <No />}</td>
                  <td className="p-2 text-center">{c.canUpload ? <Yes /> : <No />}</td>
                  <td className="p-2 text-center">{c.publicRead === undefined ? <NA /> : c.publicRead ? <Yes /> : <No />}</td>
                  <td className="p-2 text-center">{c.signedFallback === undefined ? <NA /> : c.signedFallback ? <Yes /> : <No />}</td>
                  <td className="p-2 text-xs text-destructive">{c.error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Last Upload Error</CardTitle></CardHeader>
        <CardContent>
          {lastError ? (
            <div className="text-xs rounded border border-destructive/30 bg-destructive/5 p-3">
              <div className="font-medium text-destructive">{lastError.fileName || "Upload"} → {lastError.bucket}</div>
              <div className="mt-1 text-destructive">{lastError.message}</div>
              <div className="mt-1 text-muted-foreground">{new Date(lastError.at).toLocaleString()}</div>
            </div>
          ) : <p className="text-sm text-muted-foreground">No upload errors recorded in this browser.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rolling Diagnostics Log</CardTitle></CardHeader>
        <CardContent>
          {rollingLog.length === 0 ? <p className="text-sm text-muted-foreground">Run diagnostics to see live trace output.</p> : (
            <div className="max-h-52 overflow-auto rounded bg-muted p-3 font-mono text-xs space-y-1">
              {rollingLog.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Upload Activity</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={clearLogs}><Trash2 className="h-3.5 w-3.5 mr-1" />Clear</Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? <p className="text-sm text-muted-foreground">No uploads yet in this browser.</p> : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {logs.map((l, i) => (
                <div key={i} className="text-xs flex items-start gap-2 border-b pb-2">
                  {l.ok ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="font-medium">{l.fileName || "(no file)"} <span className="text-muted-foreground">→ {l.bucket}</span></div>
                    <div className={l.ok ? "text-muted-foreground" : "text-destructive"}>{l.message}</div>
                    <div className="text-muted-foreground">{new Date(l.at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Upload Errors</CardTitle></CardHeader>
        <CardContent>
          {errorLogs.length === 0 ? <p className="text-sm text-muted-foreground">No recent upload errors.</p> : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {errorLogs.map((l, i) => (
                <div key={i} className="text-xs rounded border border-destructive/20 p-2">
                  <div className="font-medium text-destructive">{l.fileName || "(no file)"} <span className="text-muted-foreground">→ {l.bucket}</span></div>
                  <div className="text-destructive">{l.message}</div>
                  <div className="text-muted-foreground">{new Date(l.at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}