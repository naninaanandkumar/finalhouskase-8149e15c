import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DOMPurify from "dompurify";
import { ShieldCheck } from "lucide-react";

interface PageContentProps {
  pageKey: string;
  title: string;
  description?: string;
}


function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(str: string): string {
  let s = escapeHtml(str);
  // Bold: **text** or __text__
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // Italic: *text* or _text_
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
  // Auto-link URLs
  s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  // Auto-link emails
  s = s.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1">$1</a>');
  return s;
}

function formatPlainTextToHtml(text: string): string {
  if (!text?.trim()) return "";
  // If content already has real HTML block tags, trust it
  if (/<(p|h[1-6]|ul|ol|li|div|section|article|table)\b/i.test(text)) return text;

  // ---- Preprocess: recover structure from single-paragraph blobs ----
  let src = text.replace(/\r\n/g, "\n");
  // Break after "Last Updated: <date>" jammed into first sentence
  src = src.replace(/(Last Updated:\s*[A-Za-z]+\s+\d{1,2},?\s*\d{4})\s*(?=[A-Z])/g, "$1\n\n");
  // Insert blank line before numbered section headings like "1. Something"
  src = src.replace(/([a-z0-9\)\."'])\s*(\d{1,2})\.\s+(?=[A-Z])/g, "$1\n\n$2. ");
  // Split "1. Title Words Here" from body that starts right after with "Capitalletter+lower"
  // e.g. "1. Information We CollectWhen you..." -> "1. Information We Collect\n\nWhen you..."
  src = src.replace(
    /^(\d{1,2}\.\s+(?:[A-Z][A-Za-z0-9&\/]*(?:-[A-Z][A-Za-z0-9&\/]*)*(?:\s+[A-Z][A-Za-z0-9&\/]*(?:-[A-Z][A-Za-z0-9&\/]*)*){0,9}))([A-Z][a-z])/gm,
    "$1\n\n$2"
  );
  // Subheadings jammed after a period: ".Payment Information: We..."
  src = src.replace(/([\.\)])\s*([A-Z][A-Za-z][A-Za-z ]{2,50}):\s*(?=[A-Z])/g, "$1\n\n$2:\n\n");

  const lines = src.split("\n");
  let html = "";
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) { html += `</${listType}>`; listType = null; }
  };
  const openList = (type: "ul" | "ol") => {
    if (listType !== type) { closeList(); html += `<${type}>`; listType = type; }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) { closeList(); continue; }

    // Markdown headings ###/##/#
    const mdH = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (mdH) {
      closeList();
      const level = Math.min(mdH[1].length + 1, 4); // h2..h4
      html += `<h${level}>${renderInline(mdH[2])}</h${level}>`;
      continue;
    }

    // Numbered section heading: "1. INTRODUCTION" or "1. Introduction Something"
    const numH = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numH) {
      const rest = numH[2].trim();
      const isAllCaps = /^[A-Z0-9][A-Z0-9\s&,\-/']{2,}$/.test(rest);
      const isShortTitle = rest.length <= 80 && !/[.!?]$/.test(rest) && rest.split(" ").length <= 12;
      if (isAllCaps || isShortTitle) {
        closeList();
        html += `<h2>${numH[1]}. ${renderInline(rest)}</h2>`;
        continue;
      }
    }

    // ALL CAPS standalone line -> heading
    if (/^[A-Z0-9][A-Z0-9\s&,\-/']{4,}$/.test(trimmed) && trimmed.length <= 80) {
      closeList();
      html += `<h2>${renderInline(trimmed)}</h2>`;
      continue;
    }

    // Title Case / sentence-case short line that looks like a subheading
    // e.g. ends with ":" or short and next line is content
    if (/:$/.test(trimmed) && trimmed.length <= 90 && !trimmed.startsWith("•") && !trimmed.startsWith("-")) {
      closeList();
      html += `<h3>${renderInline(trimmed.replace(/:$/, ""))}</h3>`;
      continue;
    }

    // Ordered list "1) foo" or "1) foo"
    const olM = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (olM && !/^\d+\.\s+[A-Z]/.test(trimmed.slice(0, 40))) {
      openList("ol");
      html += `<li>${renderInline(olM[2])}</li>`;
      continue;
    }

    // Bulleted list
    if (/^[•\-–*]\s+/.test(trimmed) || /^\([a-z0-9]\)\s+/i.test(trimmed)) {
      openList("ul");
      const content = trimmed.replace(/^[•\-–*]\s+/, "").replace(/^\([a-z0-9]\)\s+/i, "");
      html += `<li>${renderInline(content)}</li>`;
      continue;
    }

    // Inline (a) ... (b) ... (c) split
    if (/\([a-z]\)/i.test(trimmed) && (trimmed.match(/\([a-z]\)/gi) || []).length >= 2) {
      closeList();
      const parts = trimmed.split(/\([a-z]\)\s*/i).map((p) => p.trim()).filter(Boolean);
      html += "<ul>";
      parts.forEach((p) => { html += `<li>${renderInline(p)}</li>`; });
      html += "</ul>";
      continue;
    }

    closeList();
    html += `<p>${renderInline(trimmed)}</p>`;
  }

  closeList();
  return html;
}

export default function PageContent({ pageKey, title, description }: PageContentProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", `page_${pageKey}`)
        .maybeSingle();
      if (data?.value) {
        const v = data.value as any;
        setContent(v.content || "");
      }
      setLoading(false);
    };
    fetch();
  }, [pageKey]);

  const formattedContent = useMemo(() => formatPlainTextToHtml(content), [content]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={`${title} - Houskase`} description={description || `Read the official Houskase ${title.toLowerCase()}. Terms, policies, and important information for shoppers, retailers, and bulk buyers across India.`} />
      <Header />
      <main className="pb-12">
        {/* Premium hero */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border/60">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl py-6 md:py-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-medium mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Houskase Legal
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
              {title}
            </h1>
            <p className="mt-1.5 text-xs md:text-sm text-muted-foreground">
              Last updated {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 max-w-6xl py-6 md:py-8">
          <article className="bg-card border border-border/60 rounded-xl shadow-sm p-5 md:p-8 lg:p-10">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : formattedContent ? (
              <div
                className="prose prose-sm md:prose-base max-w-none text-foreground
                  [&_h2]:text-xl md:[&_h2]:text-2xl [&_h2]:font-display [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-foreground [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border [&_h2]:tracking-tight
                  [&_h2:first-child]:mt-0
                  [&_h3]:text-base md:[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-foreground
                  [&_h4]:text-sm md:[&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-foreground
                  [&_p]:text-muted-foreground [&_p]:leading-[1.75] [&_p]:mb-4 [&_p]:text-[15px]
                  [&_ul]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:space-y-2 [&_ul]:marker:text-primary
                  [&_ol]:text-muted-foreground [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_ol]:space-y-2 [&_ol]:marker:text-primary [&_ol]:marker:font-semibold
                  [&_li]:leading-[1.7] [&_li]:pl-1
                  [&_strong]:text-foreground [&_strong]:font-semibold
                  [&_em]:text-foreground/90 [&_em]:italic
                  [&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80
                  [&_hr]:my-8 [&_hr]:border-border"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedContent, { ADD_ATTR: ["target", "rel"] }) }}
              />
            ) : (
              <p className="text-muted-foreground">This page content has not been set up yet. Please contact the admin.</p>
            )}
          </article>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Questions about this policy? Reach us at{" "}
            <a href="mailto:sales@houskase.com" className="text-primary font-medium hover:underline">sales@houskase.com</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
