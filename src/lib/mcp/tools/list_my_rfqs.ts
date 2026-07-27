import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, withAudit } from "../helpers";

export default defineTool({
  name: "list_my_rfqs",
  title: "List my quote requests",
  description:
    "List the signed-in user's bulk quote requests (RFQs). RLS restricts to the caller's own RFQs.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAudit("list_my_rfqs", async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("rfq_requests")
      .select("id, rfq_number, status, product_name, quantity, message, quoted_price, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { rfqs: data ?? [] },
    };
  }),
});
