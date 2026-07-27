// PWA install diagnostics — logs why the install prompt may or may not fire.
// Enhanced: validates icons, HTTPS, SW content-type, manifest fields; exposes
// browser install criteria checklist.

export type PWAPlatform = "ios-safari" | "ios-other" | "android-chrome" | "desktop" | "unknown";

export type InstallCriterion = {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type IOSMetaCheck = {
  key: string;
  label: string;
  present: boolean;
  value?: string;
  detail?: string;
};

export type PWADiagnostics = {
  platform: PWAPlatform;
  isStandalone: boolean;
  isSecureContext: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerScope: string | null;
  serviceWorkerContentType: string | null;
  manifestLinked: boolean;
  manifestUrl: string | null;
  manifestParsed: boolean;
  manifestErrors: string[];
  manifestFields: {
    name?: string;
    short_name?: string;
    start_url?: string;
    scope?: string;
    display?: string;
    theme_color?: string;
    background_color?: string;
    icons: Array<{ src: string; sizes?: string; type?: string; purpose?: string; reachable: boolean; httpStatus?: number }>;
  };
  criteria: InstallCriterion[];
  iosMeta: IOSMetaCheck[];
  beforeInstallPromptFired: boolean;
  userAgent: string;
  url: string;
  timestamp: string;
  notes: string[];
};

declare global {
  interface Window {
    __pwaDiag?: PWADiagnostics;
    houskaseDeferredInstallPrompt?: Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
  }
}

export function detectPlatform(): PWAPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  if (isIOS) {
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return isSafari ? "ios-safari" : "ios-other";
  }
  if (/Android/.test(ua)) return "android-chrome";
  return "desktop";
}

async function checkIconReachable(src: string): Promise<{ reachable: boolean; httpStatus?: number }> {
  try {
    const res = await fetch(src, { method: "GET", cache: "no-store" });
    return { reachable: res.ok, httpStatus: res.status };
  } catch {
    return { reachable: false };
  }
}

export async function runPWADiagnostics(): Promise<PWADiagnostics> {
  const notes: string[] = [];
  const manifestErrors: string[] = [];

  const platform = detectPlatform();
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  const isSecureContext = window.isSecureContext;
  if (!isSecureContext) notes.push("Not a secure context — install requires HTTPS.");

  const serviceWorkerSupported = "serviceWorker" in navigator;
  let serviceWorkerRegistered = false;
  let serviceWorkerScope: string | null = null;
  let serviceWorkerContentType: string | null = null;

  if (serviceWorkerSupported) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const swReg = regs.find((r) => r.active || r.installing || r.waiting);
      serviceWorkerRegistered = !!swReg;
      serviceWorkerScope = swReg?.scope ?? null;
    } catch (err) {
      notes.push(`SW getRegistrations failed: ${(err as Error).message}`);
    }
    try {
      const swHead = await fetch("/sw.js", { method: "GET", cache: "no-store" });
      serviceWorkerContentType = swHead.headers.get("content-type");
      if (!swHead.ok) notes.push(`/sw.js HTTP ${swHead.status}`);
      else if (!/javascript|ecmascript/i.test(serviceWorkerContentType || ""))
        notes.push(`/sw.js served as ${serviceWorkerContentType} (expected JS)`);
    } catch (err) {
      notes.push(`/sw.js fetch failed: ${(err as Error).message}`);
    }
  } else {
    notes.push("Service workers not supported.");
  }

  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const manifestLinked = !!manifestLink;
  const manifestUrl = manifestLink?.href ?? null;
  let manifestParsed = false;
  const manifestFields: PWADiagnostics["manifestFields"] = { icons: [] };

  if (manifestUrl) {
    try {
      const res = await fetch(manifestUrl, { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) manifestErrors.push(`Manifest HTTP ${res.status}`);
      else {
        const m = await res.json();
        manifestParsed = true;
        manifestFields.name = m.name;
        manifestFields.short_name = m.short_name;
        manifestFields.start_url = m.start_url;
        manifestFields.scope = m.scope;
        manifestFields.display = m.display;
        manifestFields.theme_color = m.theme_color;
        manifestFields.background_color = m.background_color;
        if (!m.name && !m.short_name) manifestErrors.push("Missing name/short_name");
        if (!m.start_url) manifestErrors.push("Missing start_url");
        if (!["standalone", "fullscreen", "minimal-ui"].includes(m.display))
          manifestErrors.push(`display must be standalone/fullscreen/minimal-ui (got ${m.display})`);
        const has192 = m.icons?.some((i: any) => /(^|\s)192x192(\s|$)/.test(i.sizes || ""));
        const has512 = m.icons?.some((i: any) => /(^|\s)512x512(\s|$)/.test(i.sizes || ""));
        if (!has192) manifestErrors.push("Missing 192x192 icon");
        if (!has512) manifestErrors.push("Missing 512x512 icon");
        if (!m.theme_color) manifestErrors.push("Missing theme_color");
        // Check each icon is actually reachable
        const iconResults = await Promise.all(
          (m.icons || []).map(async (i: any) => {
            const url = new URL(i.src, manifestUrl).href;
            const status = await checkIconReachable(url);
            if (!status.reachable) manifestErrors.push(`Icon unreachable: ${i.src}`);
            return { ...i, ...status };
          })
        );
        manifestFields.icons = iconResults;
      }
    } catch (err) {
      manifestErrors.push(`Manifest fetch/parse failed: ${(err as Error).message}`);
    }
  } else {
    manifestErrors.push("No <link rel='manifest'> tag found");
  }

  const beforeInstallPromptFired = !!window.houskaseDeferredInstallPrompt;
  if (!beforeInstallPromptFired) {
    if (platform === "ios-safari") notes.push("iOS Safari never fires beforeinstallprompt — manual instructions required.");
    else if (platform === "ios-other") notes.push("iOS non-Safari browser cannot install PWAs — must use Safari.");
    else if (isStandalone) notes.push("Already installed / running standalone.");
    else notes.push("beforeinstallprompt not fired yet — engagement heuristics or install criteria may not be met.");
  }

  const criteria: InstallCriterion[] = [
    { key: "https", label: "Served over HTTPS", passed: isSecureContext },
    { key: "manifest", label: "Web app manifest linked & parsed", passed: manifestParsed },
    { key: "manifest-fields", label: "Manifest has required fields", passed: manifestParsed && manifestErrors.length === 0, detail: manifestErrors.join("; ") || undefined },
    { key: "sw", label: "Service worker registered", passed: serviceWorkerRegistered },
    { key: "sw-js", label: "/sw.js served as JavaScript", passed: !!serviceWorkerContentType && /javascript|ecmascript/i.test(serviceWorkerContentType), detail: serviceWorkerContentType || "unknown" },
    { key: "not-installed", label: "Not already installed", passed: !isStandalone },
    { key: "bip", label: "beforeinstallprompt fired (Chromium)", passed: beforeInstallPromptFired, detail: platform.startsWith("ios") ? "Not applicable on iOS" : undefined },
  ];

  // iOS-specific meta-tag checks (required for a good add-to-home-screen experience)
  const metaContent = (selector: string) =>
    document.querySelector<HTMLMetaElement | HTMLLinkElement>(selector) as (HTMLMetaElement & HTMLLinkElement) | null;
  const capable = metaContent('meta[name="apple-mobile-web-app-capable"]') as HTMLMetaElement | null;
  const statusBar = metaContent('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null;
  const iosTitle = metaContent('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
  const appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  const viewport = metaContent('meta[name="viewport"]') as HTMLMetaElement | null;
  const themeColor = metaContent('meta[name="theme-color"]') as HTMLMetaElement | null;

  const iosMeta: IOSMetaCheck[] = [
    { key: "apple-mobile-web-app-capable", label: "apple-mobile-web-app-capable = yes", present: capable?.content?.toLowerCase() === "yes", value: capable?.content, detail: capable ? undefined : "Missing tag; iOS home-screen launch will not open in standalone mode." },
    { key: "apple-mobile-web-app-status-bar-style", label: "apple-mobile-web-app-status-bar-style set", present: !!statusBar?.content, value: statusBar?.content },
    { key: "apple-mobile-web-app-title", label: "apple-mobile-web-app-title set", present: !!iosTitle?.content, value: iosTitle?.content, detail: iosTitle ? undefined : "Falls back to <title>; recommended for a short home-screen label." },
    { key: "apple-touch-icon", label: "apple-touch-icon link present", present: !!appleTouchIcon, value: appleTouchIcon?.href, detail: appleTouchIcon ? undefined : "Missing; iOS will pick a low-quality screenshot as the icon." },
    { key: "viewport", label: "viewport meta present", present: !!viewport?.content, value: viewport?.content },
    { key: "theme-color", label: "theme-color meta present", present: !!themeColor?.content, value: themeColor?.content },
  ];

  const diag: PWADiagnostics = {
    platform,
    isStandalone,
    isSecureContext,
    serviceWorkerSupported,
    serviceWorkerRegistered,
    serviceWorkerScope,
    serviceWorkerContentType,
    manifestLinked,
    manifestUrl,
    manifestParsed,
    manifestErrors,
    manifestFields,
    criteria,
    iosMeta,
    beforeInstallPromptFired,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    notes,
  };

  window.__pwaDiag = diag;
  // eslint-disable-next-line no-console
  console.info("[PWA Diagnostics]", diag);
  return diag;
}

// Manually re-register the app service worker (used from the diagnostics panel
// when the browser previously failed registration due to a transient issue).
export async function retryServiceWorkerRegistration(): Promise<{ ok: boolean; scope?: string; error?: string }> {
  if (!("serviceWorker" in navigator)) return { ok: false, error: "Service workers not supported" };
  try {
    // Confirm the file is served as JS before registering
    const res = await fetch("/sw.js", { method: "GET", cache: "no-store" });
    if (!res.ok) return { ok: false, error: `/sw.js HTTP ${res.status}` };
    const ct = res.headers.get("content-type") || "";
    if (!/javascript|ecmascript/i.test(ct)) return { ok: false, error: `/sw.js content-type ${ct}` };
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return { ok: true, scope: reg.scope };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
