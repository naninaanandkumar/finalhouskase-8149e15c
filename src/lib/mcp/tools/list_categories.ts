import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, withAudit } from "../helpers";

export default defineTool({
  name: "list_categories",
  title: "List product categories",
  description: "List all active product categories on Houskase (name, slug, parent).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAudit("list_categories", async (_input, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("categories")
      .select("id, name, slug, parent_id")
      .order("name");
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { categories: data ?? [] },
    };
  }),
});
