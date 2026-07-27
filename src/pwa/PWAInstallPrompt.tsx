import { useEffect, useState } from "react";
import { X, Download, Share, Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { detectPlatform, runPWADiagnostics, type PWAPlatform, type PWADiagnostics } from "./pwaDiagnostics";
import { sendPWATelemetry } from "./pwaTelemetry";

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const PWAInstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);
  const [platform, setPlatform] = useState<PWAPlatform>("unknown");
  const [diag, setDiag] = useState<PWADiagnostics | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    runPWADiagnostics().then((d) => {
      setDiag(d);
      sendPWATelemetry("page_load", d, { dedupe: true });
      sendPWATelemetry("diagnostics_run", d, { dedupe: true });
      if (!d.manifestParsed || d.manifestErrors.length > 0) {
        sendPWATelemetry("manifest_invalid", d, { meta: { errors: d.manifestErrors } });
      }
    });

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const withinCooldown =
      dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone || withinCooldown) return;
    if (p === "ios-other") return;

    if (window.houskaseDeferredInstallPrompt) {
      setDeferred(window.houskaseDeferredInstallPrompt);
      setVisible(true);
    }

    const fallbackTimer = window.setTimeout(() => setVisible(true), 1200);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
      sendPWATelemetry("install_available", diag, { dedupe: true });
    };
    const onStoredBeforeInstall = () => {
      if (window.houskaseDeferredInstallPrompt) {
        setDeferred(window.houskaseDeferredInstallPrompt);
        setVisible(true);
        sendPWATelemetry("install_available", diag, { dedupe: true });
      }
    };
    const onInstalled = () => {
      setVisible(false);
      setShowIOSSheet(false);
      setDeferred(null);
      sendPWATelemetry("install_completed", diag);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("houskase-beforeinstallprompt", onStoredBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("houskase-beforeinstallprompt", onStoredBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (visible) sendPWATelemetry("install_prompt_shown", diag, { dedupe: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleInstall = async () => {
    if (platform === "ios-safari") {
      setShowIOSSheet(true);
      sendPWATelemetry("ios_instructions_shown", diag);
      return;
    }
    if (!deferred) {
      if (platform === "android-chrome")
        toast.info("Chrome menu (⋮) → ‘Install app’ / ‘Add to Home screen’.");
      else toast.info("Browser menu se ‘Install app’ select karein.");
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    sendPWATelemetry(choice.outcome === "accepted" ? "install_accepted" : "install_dismissed", diag, {
      outcome: choice.outcome,
    });
    window.houskaseDeferredInstallPrompt = undefined;
    setVisible(false);
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setShowIOSSheet(false);
    sendPWATelemetry("install_dismissed", diag, { outcome: "user_dismissed_card" });
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — long-press the URL bar to copy.");
    }
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed top-1 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1rem)] max-w-md">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg p-3">
          <img src="/favicon.png" alt="Houskase" className="h-10 w-10 rounded-lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              {document.title || "Houskase"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {(document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content ||
                "Shop Houskase for premium towels, tissues, kitchen & cleaning essentials."}
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {platform === "ios-safari" ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {platform === "ios-safari" ? "How to" : "Install"}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showIOSSheet && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSSheet(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <img src="/favicon.png" alt="Houskase" className="h-12 w-12 rounded-xl" />
              <div className="flex-1">
                <h3 className="font-semibold">Install Houskase on iPhone</h3>
                <p className="text-xs text-muted-foreground">Add to Home Screen in Safari</p>
              </div>
              <button
                onClick={() => setShowIOSSheet(false)}
                aria-label="Close"
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-border p-2">
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {window.location.href}
              </span>
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium hover:bg-secondary/80"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span className="flex flex-wrap items-center gap-1">
                  Open this page in <b>Safari</b> (paste the copied link if you're in another app).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span className="flex flex-wrap items-center gap-1">
                  Tap the Share button <Share className="inline h-4 w-4 mx-1" /> at the bottom of Safari.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span className="flex flex-wrap items-center gap-1">
                  Scroll and choose <b>Add to Home Screen</b> <Plus className="inline h-4 w-4 mx-1" />.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                <span>Tap <b>Add</b> — Houskase icon will appear on your home screen.</span>
              </li>
            </ol>

            <a
              href="/pwa-diagnostics"
              className="mt-4 block text-center text-xs text-muted-foreground underline"
            >
              Trouble installing? Open diagnostics
            </a>

            <button
              onClick={() => setShowIOSSheet(false)}
              className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
