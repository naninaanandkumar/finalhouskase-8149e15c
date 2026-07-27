import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, withAudit } from "../helpers";

export default defineTool({
  name: "get_product",
  title: "Get product details",
  description:
    "Fetch full details for a single Houskase product by id or slug — description, features, images, pricing, and stock.",
  inputSchema: {
    id: z.string().trim().optional().describe("Product UUID."),
    slug: z.string().trim().optional().describe("Product slug (alternative to id)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAudit("get_product", async ({ id, slug }, ctx) => {
    if (!id && !slug) return { content: [{ type: "text", text: "Provide either id or slug." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("products").select("*, category:categories(name, slug), brand:brands(name)").limit(1);
    q = id ? q.eq("id", id) : q.eq("slug", slug!);
    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Product not found." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { product: data },
    };
  }),
});
