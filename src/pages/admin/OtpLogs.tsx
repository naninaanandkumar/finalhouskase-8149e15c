import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RefreshCw, ShieldAlert, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OtpEvent {
  id: string;
  email: string;
  event_type: string;
  status: "success" | "warning" | "error";
  error_message: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const eventLabels: Record<string, string> = {
  sent: "Sent",
  resent: "Resent",
  verified: "Verified",
  failed: "Failed",
  expired: "Expired",
  max_attempts_reached: "Max attempts",
  send_failed: "Send failed",
  send_retry: "Send retry",
  rate_limited: "Rate limited",
  already_exists: "Already exists",
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "success") return "default";
  if (s === "warning") return "secondary";
  return "destructive";
};

const metaText = (metadata: Record<string, unknown> | null, key: string) => {
  const value = metadata?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
};

export default function AdminOtpLogs() {
  const [rows, setRows] = useState<OtpEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [correlationFilter, setCorrelationFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("signup_otp_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    else setRows((data as OtpEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const emailQ = emailFilter.trim().toLowerCase();
    const corrQ = correlationFilter.trim().toLowerCase();
    return rows.filter((r) => {
      const metadata = JSON.stringify(r.metadata ?? {}).toLowerCase();
      const chainCorrelationId = (metaText(r.metadata, "chainCorrelationId") || metaText(r.metadata, "correlationId") || "").toLowerCase();
      const requestedCorrelationId = (metaText(r.metadata, "requestedCorrelationId") || "").toLowerCase();
      const providerResponse = (metaText(r.metadata, "providerResponse") || "").toLowerCase();
      const matchesSearch = !q ||
        r.email.toLowerCase().includes(q) ||
        r.event_type.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        (r.error_message ?? "").toLowerCase().includes(q) ||
        providerResponse.includes(q) ||
        metadata.includes(q);
      const matchesEmail = !emailQ || r.email.toLowerCase().includes(emailQ);
      const matchesCorrelation = !corrQ || chainCorrelationId.includes(corrQ) || requestedCorrelationId.includes(corrQ) || metadata.includes(corrQ);
      const matchesEvent = eventFilter === "all" ||
        (eventFilter === "retry" ? r.event_type === "send_retry" : r.event_type === eventFilter);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesEmail && matchesCorrelation && matchesEvent && matchesStatus;
    });
  }, [rows, search, emailFilter, correlationFilter, eventFilter, statusFilter]);

  const stats = useMemo(() => {
    const c = { total: rows.length, verified: 0, failed: 0, expired: 0 };
    for (const r of rows) {
      if (r.event_type === "verified") c.verified++;
      else if (r.event_type === "failed" || r.event_type === "send_failed") c.failed++;
      else if (r.event_type === "expired" || r.event_type === "max_attempts_reached") c.expired++;
    }
    return c;
  }, [rows]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" /> OTP Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recent signup verification attempts (send / verify / expire / failure).
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total events", value: stats.total },
          { label: "Verified", value: stats.verified },
          { label: "Failed / Send errors", value: stats.failed },
          { label: "Expired / Max attempts", value: stats.expired },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold mt-1">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3">
            <span>Events</span>
            <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_160px_150px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search event, error, provider response…"
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Input
                placeholder="Filter email"
                className="h-9"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
              />
              <Input
                placeholder="Filter correlation ID"
                className="h-9 font-mono text-xs"
                value={correlationFilter}
                onChange={(e) => setCorrelationFilter(e.target.value)}
              />
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All events</option>
                <option value="sent">Sent</option>
                <option value="resent">Resent</option>
                <option value="send_retry">Retry</option>
                <option value="failed">Failed</option>
                <option value="send_failed">Send failed</option>
                <option value="verified">Verified</option>
                <option value="rate_limited">Rate limited</option>
                <option value="already_exists">Already exists</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All status</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-3">Failed to load: {error}</p>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Trace</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No events yet.</TableCell></TableRow>
                ) : (
                  filtered.map((r) => {
                    const correlationId = metaText(r.metadata, "chainCorrelationId") || metaText(r.metadata, "correlationId");
                    const provider = metaText(r.metadata, "provider");
                    const messageId = metaText(r.metadata, "messageId");
                    const providerResponse = metaText(r.metadata, "providerResponse");
                    const attemptNo = metaText(r.metadata, "attemptNo");
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          <div>{new Date(r.created_at).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.email}</TableCell>
                        <TableCell>{eventLabels[r.event_type] ?? r.event_type}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                        <TableCell className="max-w-[360px] text-xs text-muted-foreground">
                          <div className="truncate" title={r.error_message ?? providerResponse ?? ""}>{r.error_message ?? providerResponse ?? "—"}</div>
                          {provider && <div className="truncate">Provider: <span className="font-mono">{provider}</span>{attemptNo ? ` · Attempt ${attemptNo}` : ""}</div>}
                        </TableCell>
                        <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                          {correlationId ? <div className="truncate" title={correlationId}>CID: <span className="font-mono">{correlationId}</span></div> : <div>—</div>}
                          {messageId && <div className="truncate" title={messageId}>Msg: <span className="font-mono">{messageId}</span></div>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.ip ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
