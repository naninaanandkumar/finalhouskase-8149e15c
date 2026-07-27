import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, withAudit } from "../helpers";

export default defineTool({
  name: "search_products",
  title: "Search Houskase products",
  description:
    "Search the Houskase catalog by keyword and/or category. Returns product name, slug, short description, price, MOQ, and stock.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free-text search across name and description."),
    category_slug: z.string().trim().optional().describe("Filter by category slug (optional)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAudit("search_products", async ({ query, category_slug, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("products")
      .select("id, name, slug, short_description, guest_price, shop_price, shop_moq, stock_quantity, category:categories(name, slug)")
      .eq("is_active", true)
      .limit(limit ?? 20);

    if (query) {
      // Sanitize free-text: strip PostgREST filter syntax and escape ILIKE wildcards
      // to prevent .or() filter injection via commas, parens, dots, and %/_.
      const safe = query
        .replace(/[,()]/g, " ")
        .replace(/[\\%_]/g, (m) => `\\${m}`)
        .trim()
        .slice(0, 100);
      if (safe) {
        q = q
          .or(`name.ilike.%${safe}%,short_description.ilike.%${safe}%`);
      }
    }
    if (category_slug) q = q.eq("categories.slug", category_slug);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { products: data ?? [] },
    };
  }),
});
