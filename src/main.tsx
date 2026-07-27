import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "./lib/webVitals";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    houskaseDeferredInstallPrompt?: BeforeInstallPromptEvent;
  }
}

// Global fallback: if any <img> fails to load, swap to placeholder to prevent broken icons
const PLACEHOLDER = "/placeholder.svg";
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.houskaseDeferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("houskase-beforeinstallprompt"));
  });

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        if (!img.src.endsWith(PLACEHOLDER)) {
          img.src = PLACEHOLDER;
        }
      }
    },
    true
  );
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Kick off Core Web Vitals reporting after the app mounts (non-blocking).
if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(() => initWebVitals());
  } else {
    setTimeout(initWebVitals, 0);
  }
}

// Register minimal service worker for PWA installability (production only).
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const host = window.location.hostname;
  const isLovableEditorPreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev");
  if (import.meta.env.PROD && !isLovableEditorPreview) {
    window.addEventListener("load", async () => {
      try {
        // Sanity-check SW file is reachable (catches 404/422/HTML fallbacks on custom domains)
        const head = await fetch("/sw.js", { method: "GET", cache: "no-store" });
        const ct = head.headers.get("content-type") || "";
        if (!head.ok || !/javascript|ecmascript/i.test(ct)) {
          console.warn("[PWA] /sw.js not served as JS", { status: head.status, contentType: ct });
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.info("[PWA] SW registered", { scope: reg.scope });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          window.location.reload();
        }
      } catch (err) {
        console.warn("[PWA] SW registration failed", err);
      }
    });
  }
}

