import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const CSP_CONTENT = "default-src 'self' https://*.supabase.co https://*.supabase.in; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://tagmanager.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.youtube.com https://s.ytimg.com https://checkout.razorpay.com; script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://tagmanager.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.youtube.com https://s.ytimg.com https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tagmanager.google.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https: http:; media-src 'self' blob: data: https://*.supabase.co https://*.supabase.in https://ik.imagekit.io https://*.imagekit.io; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://ik.imagekit.io https://*.imagekit.io https://checkout.razorpay.com https://api.razorpay.com https://lumberjack.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net https://stats.g.doubleclick.net https://region1.google-analytics.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://api.razorpay.com https://checkout.razorpay.com https://www.googletagmanager.com https://td.doubleclick.net; frame-ancestors 'self' https://*.lovable.app;";

/**
 * SecurityHeaders component adds client-side security measures:
 * - CSP meta tags
 * - Referrer policy
 * - Anti-scraping measures
 * - Prevents sensitive route access
 */
export function SecurityHeaders() {
  useEffect(() => {
    // Disable right-click context menu on sensitive areas only
    // (inspect element is still allowed)
    
    // Prevent drag-and-drop of images to discourage easy scraping
    const preventDrag = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault();
      }
    };
    document.addEventListener("dragstart", preventDrag);

    // Block common scraper user agents via early detection
    const ua = navigator.userAgent.toLowerCase();
    const scraperPatterns = [
      "httrack", "websitecopier", "webcopier", "sitecopy", 
      "sitesucker", "webdumper", "wget", "curl/", "scrapy",
      "puppeteer", "headlesschrome", "phantomjs"
    ];

    const hostname = window.location.hostname;
    const previewExceptionEnabled = import.meta.env.VITE_ALLOW_HEADLESS_PREVIEW !== "false";
    const configuredPreviewHosts = String(
      import.meta.env.VITE_SECURITY_PREVIEW_HOSTS || "localhost,127.0.0.1,0.0.0.0,.lovable.app,.lovableproject.com"
    )
      .split(",")
      .map((host) => host.trim())
      .filter(Boolean);
    const isConfiguredPreviewHost = configuredPreviewHosts.some((host) =>
      host.startsWith(".") ? hostname.endsWith(host) : hostname === host
    );
    const allowPreviewBypass = previewExceptionEnabled && (import.meta.env.DEV || isConfiguredPreviewHost);
    const isScraper = !allowPreviewBypass && scraperPatterns.some(p => ua.includes(p));
    if (isScraper) {
      document.body.innerHTML = "<h1>403 Forbidden</h1><p>Access denied.</p>";
      return;
    }

    return () => {
      document.removeEventListener("dragstart", preventDrag);
    };
  }, []);

  return (
    <Helmet>
      {/* Content Security Policy */}
      <meta
        httpEquiv="Content-Security-Policy"
        content={CSP_CONTENT}
      />
      {/* Referrer Policy */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      {/* X-Content-Type-Options equivalent */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      {/* Prevent clickjacking */}
      <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
    </Helmet>
  );
}
