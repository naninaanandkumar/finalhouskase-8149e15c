// Generates public/sitemap.xml with accurate lastmod on each build.
// Runs on predev/prebuild.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://houskase.com";
const today = new Date().toISOString().slice(0, 10);

interface Entry {
  path: string;
  changefreq?: string;
  priority?: string;
  lastmod?: string;
}

const staticEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/rfq", changefreq: "weekly", priority: "0.7" },
  { path: "/about-us", changefreq: "monthly", priority: "0.6" },
  { path: "/help", changefreq: "monthly", priority: "0.6" },
  { path: "/courier-tracking", changefreq: "monthly", priority: "0.5" },
  { path: "/seo-checklist", changefreq: "monthly", priority: "0.3" },
  { path: "/guides/bamboo-vs-cotton-towels", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
  { path: "/shipping-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/return-policy", changefreq: "yearly", priority: "0.3" },
];

const productSlugs = [
  "magic-microfiber-cleaning-cloth-streak-free-lint-free-ultra-absorbent-pack-of-5",
  "ultra-non-woven-cleaning-cloth-roll-soft-super-absorbent-reusable-pack-of-2",
  "ultra-non-woven-white-cleaning-cloth-roll-white-kitchen-towel-roll-buy-1-get-1-free",
  "lemon-fresh-liquid-dishwash-gel-powerful-grease-remover-for-sparkling-clean-utensils-500ml-pack-of-2",
  "compressed-pearl-tablets-portable-hygienic-compressed-tissue-towels-for-travel-daily-use",
  "ultra-non-woven-cleaning-cloth-roll-soft-super-absorbent-reusable-buy-1-get-1-free",
];

async function fetchProducts(): Promise<Entry[]> {
  try {
    const url = "https://tdlxebwkmpgqaceoabsj.supabase.co/rest/v1/products?select=slug,updated_at&status=eq.active";
    const res = await fetch(url, {
      headers: {
        apikey: "sb_publishable_4wiEWCHxCKTgWos8nHVJbA_EtXa7rwI",
        Authorization: "Bearer sb_publishable_4wiEWCHxCKTgWos8nHVJbA_EtXa7rwI",
      },
    });
    if (!res.ok) throw new Error(String(res.status));
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string }>;
    return rows.map((r) => ({
      path: `/product/${r.slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: (r.updated_at || today).slice(0, 10),
    }));
  } catch {
    return productSlugs.map((s) => ({
      path: `/product/${s}`,
      changefreq: "weekly",
      priority: "0.8",
    }));
  }
}

function render(entries: Entry[]): string {
  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod || today;
      return `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${e.changefreq || "monthly"}</changefreq>\n    <priority>${e.priority || "0.5"}</priority>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

(async () => {
  const products = await fetchProducts();
  const all = [...staticEntries, ...products];
  writeFileSync(resolve("public/sitemap.xml"), render(all));
  console.log(`sitemap.xml written (${all.length} entries) — base=${BASE_URL}`);
})();
