import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, withAudit } from "../helpers";

export default defineTool({
  name: "get_order",
  title: "Get order details",
  description:
    "Fetch full details for one of the signed-in user's Houskase orders — items, shipping address, totals, status. RLS restricts to the caller's own orders.",
  inputSchema: {
    order_id: z.string().trim().optional().describe("Order UUID."),
    order_number: z.string().trim().optional().describe("Order number (alternative to order_id)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAudit("get_order", async ({ order_id, order_number }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    if (!order_id && !order_number) return { content: [{ type: "text", text: "Provide either order_id or order_number." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("orders").select("*, order_items(*)").limit(1);
    q = order_id ? q.eq("id", order_id) : q.eq("order_number", order_number!);
    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Order not found (or not yours)." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { order: data },
    };
  }),
});
