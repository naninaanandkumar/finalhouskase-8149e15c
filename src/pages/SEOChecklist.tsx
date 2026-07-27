import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ExternalLink } from "lucide-react";

const steps = [
  {
    title: "Publish the latest build",
    detail: "Click Publish in Lovable. Sitemap regenerates automatically with today's lastmod on every build.",
  },
  {
    title: "Verify sitemap loads in a browser",
    detail: "Open https://houskase.com/sitemap.xml — it should show XML (not 404, not HTML).",
    link: "https://houskase.com/sitemap.xml",
  },
  {
    title: "Verify robots.txt points to your domain sitemap",
    detail: "Open https://houskase.com/robots.txt — bottom line must read: Sitemap: https://houskase.com/sitemap.xml",
    link: "https://houskase.com/robots.txt",
  },
  {
    title: "Open Google Search Console",
    detail: "Go to Search Console → select the houskase.com property (Domain property recommended).",
    link: "https://search.google.com/search-console",
  },
  {
    title: "Remove the old/invalid sitemap entry",
    detail: "Sitemaps → click the row showing 'Couldn't fetch' or 'Invalid' → Remove sitemap.",
  },
  {
    title: "Re-submit the sitemap",
    detail: "In the 'Add a new sitemap' box, type: sitemap.xml → Submit. Status should turn to 'Success' within a few minutes.",
  },
  {
    title: "Force a fresh fetch (optional)",
    detail: "URL Inspection → paste https://houskase.com/sitemap.xml → Test Live URL → Request Indexing.",
  },
  {
    title: "Wait for re-crawl",
    detail: "Google usually re-fetches sitemaps within 24–48 hours. 'Discovered URLs' count will populate after that.",
  },
];

export default function SEOChecklist() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Helmet>
        <title>Sitemap Re-Submit Checklist — Houskase</title>
        <meta name="description" content="Step-by-step checklist to re-submit the Houskase sitemap in Google Search Console." />
        <link rel="canonical" href="https://houskase.com/seo-checklist" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className="text-3xl font-bold mb-2">Sitemap Re-Submit Checklist</h1>
      <p className="text-muted-foreground mb-8">
        Follow these steps in order after every publish to keep Google Search Console healthy.
      </p>

      <div className="space-y-3">
        {steps.map((s, i) => (
          <Card key={i} className="p-4 flex gap-3">
            <CheckCircle2 className="w-5 h-5 mt-0.5 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold">
                {i + 1}. {s.title}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{s.detail}</div>
              {s.link && (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 mt-6 bg-muted/40">
        <div className="text-sm">
          <strong>Current config:</strong>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Canonical domain: <code>https://houskase.com</code></li>
            <li>Sitemap: <code>https://houskase.com/sitemap.xml</code> (auto-generated on every build)</li>
            <li>robots.txt: points to the sitemap above</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
