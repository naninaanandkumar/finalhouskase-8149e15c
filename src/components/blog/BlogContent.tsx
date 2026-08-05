import { Fragment } from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Lightweight magazine-style renderer for admin-written blog content.
 * Supported syntax (documented for admins in the Blog admin screen):
 *   # / ## / ###      headings
 *   ![alt](image-url) full-width image with caption (alt text)
 *   > quote           pull quote / callout
 *   - item            bullet list
 *   1. item           numbered list
 *   :::grid ... :::   icon + text grid, one "Title :: description" per line
 *   ---               divider
 *   **bold**  *italic*  [text](url)   inline formatting
 */

function inline(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyPrefix}-i${i++}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"));
      const href = token.slice(token.indexOf("(") + 1, -1);
      const external = /^https?:/i.test(href);
      nodes.push(
        <a
          key={key}
          href={href}
          className="text-accent underline underline-offset-2 hover:opacity-80"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
        </a>,
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function BlogContent({ content }: { content: string }) {
  const lines = (content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const push = (node: React.ReactNode) => blocks.push(<Fragment key={`b-${key++}`}>{node}</Fragment>);

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    if (trimmed.startsWith(":::grid")) {
      const rows: { title: string; text: string }[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        const raw = lines[i].trim().replace(/^-\s*/, "");
        if (raw) {
          const [title, ...rest] = raw.split("::");
          rows.push({ title: title.trim(), text: rest.join("::").trim() });
        }
        i++;
      }
      i++;
      push(
        <div className="my-6 grid gap-3 sm:grid-cols-2">
          {rows.map((r, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-card p-4">
              <CheckCircle2 className="h-5 w-5 text-accent mb-2" />
              <p className="text-sm font-semibold text-foreground">{r.title}</p>
              {r.text && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{inline(r.text, `g${idx}`)}</p>}
            </div>
          ))}
        </div>,
      );
      continue;
    }

    const img = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      push(
        <figure className="my-6">
          <img src={img[2]} alt={img[1]} loading="lazy" className="w-full rounded-xl border border-border object-cover" />
          {img[1] && <figcaption className="mt-2 text-xs text-muted-foreground text-center">{img[1]}</figcaption>}
        </figure>,
      );
      i++;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      push(<hr className="my-8 border-border" />);
      i++;
      continue;
    }

    const h = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      if (level === 1) push(<h2 className="mt-8 mb-3 text-xl sm:text-2xl font-display font-bold text-foreground">{inline(text, `h${key}`)}</h2>);
      else if (level === 2) push(<h2 className="mt-8 mb-3 text-lg sm:text-xl font-display font-bold text-foreground">{inline(text, `h${key}`)}</h2>);
      else push(<h3 className="mt-6 mb-2 text-base sm:text-lg font-semibold text-foreground">{inline(text, `h${key}`)}</h3>);
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      push(
        <blockquote className="my-6 rounded-xl border-l-4 border-accent bg-secondary/50 px-4 py-3 text-sm sm:text-base italic text-foreground/90">
          {inline(quote.join(" "), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      push(
        <ol className="my-4 list-decimal space-y-1.5 pl-5 text-sm sm:text-base text-foreground/90">
          {items.map((it, idx) => <li key={idx}>{inline(it, `o${idx}`)}</li>)}
        </ol>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      push(
        <ul className="my-4 list-disc space-y-1.5 pl-5 text-sm sm:text-base text-foreground/90">
          {items.map((it, idx) => <li key={idx}>{inline(it, `u${idx}`)}</li>)}
        </ul>,
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|:::|!\[|---+$|[-*]\s|\d+\.\s)/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length === 0) {
      // Unmatched marker line (e.g. a stray ":::"), skip it so the loop always advances.
      i++;
      continue;
    }
    push(<p className="my-4 text-sm sm:text-base leading-relaxed text-foreground/90">{inline(para.join(" "), `p${key}`)}</p>);
  }

  return <div className="blog-content">{blocks}</div>;
}
