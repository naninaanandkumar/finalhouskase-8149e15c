import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Filter, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AuditRow = {
  id: string;
  tool_name: string;
  user_id: string | null;
  input_hash: string;
  input_summary: any;
  duration_ms: number | null;
  status: string;
  error: string | null;
  client_id: string | null;
  created_at: string;
};

const TOOLS = [
  "search_products",
  "get_product",
  "list_categories",
  "list_my_orders",
  "get_order",
  "get_order_timeline",
  "list_my_rfqs",
  "create_rfq",
  "initiate_checkout",
  "get_my_profile",
];

function toCsv(rows: AuditRow[]): string {
  const headers = [
    "id",
    "tool_name",
    "user_id",
    "status",
    "duration_ms",
    "error",
    "client_id",
    "input_hash",
    "input_summary",
    "created_at",
  ];
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape((r as any)[h])).join(","));
  }
  return lines.join("\n");
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function McpAuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tool, setTool] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  // Build the current filter chain — reused by both list and export queries so
  // exports always match what the admin currently sees.
  const applyFilters = (q: any) => {
    if (tool !== "all") q = q.eq("tool_name", tool);
    if (status !== "all") q = q.eq("status", status);
    if (userId.trim()) q = q.eq("user_id", userId.trim());
    if (from) q = q.gte("created_at", new Date(from).toISOString());
    if (to) q = q.lte("created_at", new Date(to).toISOString());
    return q;
  };

  const load = async (targetPage = page) => {
    setLoading(true);
    const rangeFrom = (targetPage - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;
    let q = supabase
      .from("mcp_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);
    q = applyFilters(q);

    const { data, error, count } = await q;
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows([]);
      setTotalCount(0);
    } else {
      setRows((data ?? []) as AuditRow[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyAndReload = () => {
    setPage(1);
    load(1);
  };

  const fetchAllFiltered = async (): Promise<AuditRow[]> => {
    // Cap at 10k rows so a runaway filter can't hang the browser.
    let q = supabase
      .from("mcp_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);
    q = applyFilters(q);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
      return [];
    }
    return (data ?? []) as AuditRow[];
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const errors = rows.filter((r) => r.status === "error").length;
    const uniqueUsers = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;
    const avgMs =
      total > 0
        ? Math.round(rows.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / total)
        : 0;
    return { total, errors, uniqueUsers, avgMs };
  }, [rows]);

  const resetFilters = () => {
    setTool("all");
    setStatus("all");
    setUserId("");
    setFrom("");
    setTo("");
    setPageSize(50);
    setPage(1);
    // small delay so state settles before refetch
    setTimeout(() => load(1), 0);
  };

  const doExport = async (kind: "csv" | "json") => {
    setExporting(true);
    const all = await fetchAllFiltered();
    setExporting(false);
    if (all.length === 0) {
      toast({ title: "Nothing to export", description: "No rows match the current filters." });
      return;
    }
    const stamp = format(new Date(), "yyyyMMdd-HHmm");
    if (kind === "csv") {
      download(`mcp-audit-${stamp}.csv`, toCsv(all), "text/csv");
    } else {
      download(`mcp-audit-${stamp}.json`, JSON.stringify(all, null, 2), "application/json");
    }
    toast({ title: `Exported ${all.length} rows`, description: `Filters applied.` });
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const stamp = format(new Date(), "yyyyMMdd-HHmm");
  void stamp;


  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">MCP Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every AI agent tool call is recorded here with a hash of the input (never the raw payload).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => doExport("csv")}
            disabled={exporting || totalCount === 0}
          >
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => doExport("json")}
            disabled={exporting || totalCount === 0}
          >
            <Download className="h-4 w-4 mr-1.5" /> JSON
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Rows</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Errors</div>
          <div className="text-2xl font-bold mt-1 text-destructive">{stats.errors}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Unique users</div>
          <div className="text-2xl font-bold mt-1">{stats.uniqueUsers}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Avg latency</div>
          <div className="text-2xl font-bold mt-1">{stats.avgMs}<span className="text-sm text-muted-foreground"> ms</span></div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={resetFilters}>
            <X className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <Label className="text-xs">Tool</Label>
            <Select value={tool} onValueChange={setTool}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tools</SelectItem>
                {TOOLS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">User ID</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="uuid"
                className="pl-7 h-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Page size</Label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={applyAndReload} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Filter className="h-4 w-4 mr-1.5" />}
            Apply filters
          </Button>
        </div>
      </Card>


      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">When</th>
                <th className="text-left px-3 py-2 font-semibold">Tool</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
                <th className="text-left px-3 py-2 font-semibold">User</th>
                <th className="text-left px-3 py-2 font-semibold">Client</th>
                <th className="text-left px-3 py-2 font-semibold">Latency</th>
                <th className="text-left px-3 py-2 font-semibold">Input hash</th>
                <th className="text-left px-3 py-2 font-semibold">Error</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
                </td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">
                  No audit entries match these filters.
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "dd MMM HH:mm:ss")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.tool_name}</td>
                  <td className="px-3 py-2">
                    <Badge variant={r.status === "ok" ? "secondary" : "destructive"}>{r.status}</Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-[140px] truncate" title={r.user_id ?? ""}>
                    {r.user_id ? r.user_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate" title={r.client_id ?? ""}>
                    {r.client_id ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.duration_ms ?? 0} ms</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground max-w-[110px] truncate" title={r.input_hash}>
                    {r.input_hash.slice(0, 10)}…
                  </td>
                  <td className="px-3 py-2 text-xs text-destructive max-w-[240px] truncate" title={r.error ?? ""}>
                    {r.error ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground flex-wrap">
            <div>
              Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span>–
              <span className="font-medium text-foreground">{Math.min(page * pageSize, totalCount)}</span>{" "}
              of <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                disabled={page <= 1 || loading}
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); load(p); }}
              >
                Prev
              </Button>
              <span className="px-1 tabular-nums">Page {page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                disabled={page >= totalPages || loading}
                onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); load(p); }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

