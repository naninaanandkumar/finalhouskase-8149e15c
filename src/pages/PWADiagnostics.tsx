import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Check, X, RefreshCw, Copy, Download, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { runPWADiagnostics, retryServiceWorkerRegistration, type PWADiagnostics } from "@/pwa/pwaDiagnostics";
import { sendPWATelemetry } from "@/pwa/pwaTelemetry";

export default function PWADiagnosticsPage() {
  const [diag, setDiag] = useState<PWADiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingSw, setRetryingSw] = useState(false);
  const lastRunRef = useRef(0);

  const refresh = useCallback(async (reason: string = "manual") => {
    // Debounce rapid re-runs (e.g. tab focus fires multiple events)
    if (Date.now() - lastRunRef.current < 1500) return;
    lastRunRef.current = Date.now();
    setLoading(true);
    const d = await runPWADiagnostics();
    setDiag(d);
    setLoading(false);
    sendPWATelemetry("diagnostics_run", { ...d, reason } as unknown as PWADiagnostics);
  }, []);

  useEffect(() => {
    refresh("mount");

    const onVis = () => {
      if (document.visibilityState === "visible") refresh("visibilitychange");
    };
    document.addEventListener("visibilitychange", onVis);

    let onControllerChange: (() => void) | null = null;
    if ("serviceWorker" in navigator) {
      onControllerChange = () => refresh("sw-controllerchange");
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    }

    const onBip = () => refresh("beforeinstallprompt");
    window.addEventListener("beforeinstallprompt", onBip as EventListener);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (onControllerChange && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      }
      window.removeEventListener("beforeinstallprompt", onBip as EventListener);
    };
  }, [refresh]);

  const copyReport = async () => {
    if (!diag) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
      toast.success("Diagnostics copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const tryInstall = async () => {
    const evt = window.houskaseDeferredInstallPrompt;
    if (!evt) {
      toast.info("No native install prompt available on this browser/platform.");
      return;
    }
    await evt.prompt();
    const choice = await evt.userChoice;
    toast(`Install: ${choice.outcome}`);
    refresh("post-install-prompt");
  };

  const retrySw = async () => {
    setRetryingSw(true);
    const result = await retryServiceWorkerRegistration();
    setRetryingSw(false);
    if (result.ok) {
      toast.success(`Service worker registered (scope ${result.scope})`);
    } else {
      toast.error(`SW registration failed: ${result.error}`);
    }
    refresh("post-sw-retry");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Helmet>
        <title>PWA Diagnostics — Houskase</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">PWA Diagnostics</h1>
        <div className="flex gap-2">
          <button
            onClick={() => refresh("manual")}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Re-check eligibility
          </button>
          <button
            onClick={copyReport}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Copy className="h-4 w-4" /> Copy JSON
          </button>
        </div>
      </div>

      {loading || !diag ? (
        <p className="text-muted-foreground">Running checks…</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-3">Environment</h2>
            <Row label="Platform" value={diag.platform} />
            <Row label="Already installed" value={diag.isStandalone ? "Yes" : "No"} />
            <Row label="Secure context (HTTPS)" value={diag.isSecureContext ? "Yes" : "No"} />
            <Row label="URL" value={diag.url} mono />
            <Row label="User agent" value={diag.userAgent} mono small />
          </section>

          <section className="rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-3">Install criteria</h2>
            <ul className="space-y-2">
              {diag.criteria.map((c) => (
                <li key={c.key} className="flex items-start gap-2 text-sm">
                  {c.passed ? (
                    <Check className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 text-red-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium">{c.label}</div>
                    {c.detail && <div className="text-xs text-muted-foreground break-words">{c.detail}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Service worker</h2>
              <button
                onClick={retrySw}
                disabled={retryingSw}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${retryingSw ? "animate-spin" : ""}`} /> Retry registration
              </button>
            </div>
            <Row label="Supported" value={diag.serviceWorkerSupported ? "Yes" : "No"} />
            <Row label="Registered" value={diag.serviceWorkerRegistered ? "Yes" : "No"} />
            <Row label="Scope" value={diag.serviceWorkerScope ?? "—"} mono />
            <Row label="/sw.js content-type" value={diag.serviceWorkerContentType ?? "—"} mono />
          </section>

          {diag.platform.startsWith("ios") && (
            <section className="rounded-lg border border-border p-4">
              <h2 className="font-semibold mb-3">iOS meta tags</h2>
              <ul className="space-y-2">
                {diag.iosMeta.map((m) => (
                  <li key={m.key} className="flex items-start gap-2 text-sm">
                    {m.present ? (
                      <Check className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 text-red-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium">{m.label}</div>
                      {m.value && <div className="text-xs font-mono text-muted-foreground break-all">{m.value}</div>}
                      {m.detail && <div className="text-xs text-muted-foreground">{m.detail}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-3">Manifest</h2>
            <Row label="Linked" value={diag.manifestLinked ? "Yes" : "No"} />
            <Row label="URL" value={diag.manifestUrl ?? "—"} mono small />
            <Row label="Parsed" value={diag.manifestParsed ? "Yes" : "No"} />
            <Row label="Name" value={diag.manifestFields.name ?? "—"} />
            <Row label="start_url" value={diag.manifestFields.start_url ?? "—"} mono />
            <Row label="scope" value={diag.manifestFields.scope ?? "—"} mono />
            <Row label="display" value={diag.manifestFields.display ?? "—"} />
            <Row label="theme_color" value={diag.manifestFields.theme_color ?? "—"} />

            {diag.manifestFields.icons.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-1">Icons</div>
                <ul className="space-y-1 text-xs">
                  {diag.manifestFields.icons.map((i, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      {i.reachable ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-600" />
                      )}
                      <span className="font-mono truncate">{i.src}</span>
                      <span className="text-muted-foreground">
                        {i.sizes} {i.purpose ? `(${i.purpose})` : ""} {i.httpStatus ? `· ${i.httpStatus}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diag.manifestErrors.length > 0 && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-2 text-xs">
                <div className="font-medium text-red-700 dark:text-red-300 mb-1">Manifest errors</div>
                <ul className="list-disc ml-4 text-red-700 dark:text-red-300">
                  {diag.manifestErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-3">Install prompt</h2>
            <Row label="beforeinstallprompt fired" value={diag.beforeInstallPromptFired ? "Yes" : "No"} />
            {diag.notes.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                <div className="font-medium mb-1">Notes</div>
                <ul className="list-disc ml-4 space-y-0.5">
                  {diag.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}
            <button
              onClick={tryInstall}
              className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Trigger install prompt
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono" : ""} ${small ? "text-xs" : ""}`}>{value}</span>
    </div>
  );
}
