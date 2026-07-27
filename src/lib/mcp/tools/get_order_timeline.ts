import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, withAudit } from "../helpers";

/**
 * Return an ordered status timeline for one of the caller's orders by reading
 * status transitions from the audit_log (populated by the trg_orders_audit
 * trigger). RLS on `orders` still restricts to the caller's own order.
 */
export default defineTool({
  name: "get_order_timeline",
  title: "Get order status timeline",
  description:
    "Return the full status change history for one of the signed-in user's orders — every status transition with a timestamp, plus payment status changes.",
  inputSchema: {
    order_id: z.string().trim().optional().describe("Order UUID."),
    order_number: z.string().trim().optional().describe("Order number (alternative to order_id)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAudit("get_order_timeline", async ({ order_id, order_number }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    if (!order_id && !order_number) return { content: [{ type: "text", text: "Provide either order_id or order_number." }], isError: true };

    const supabase = supabaseForUser(ctx);

    // First look up the order — RLS ensures we can only see our own.
    let q = supabase.from("orders").select("id, order_number, status, payment_status, created_at, updated_at").limit(1);
    q = order_id ? q.eq("id", order_id) : q.eq("order_number", order_number!);
    const { data: order, error: orderErr } = await q.maybeSingle();
    if (orderErr) return { content: [{ type: "text", text: `Error: ${orderErr.message}` }], isError: true };
    if (!order) return { content: [{ type: "text", text: "Order not found (or not yours)." }], isError: true };

    // Read audit_log rows for this specific order (admin-only table for others;
    // RLS on audit_log allows the row owner via the actor column when applicable).
    const { data: audits, error: auditErr } = await supabase
      .from("audit_log")
      .select("action, old_data, new_data, created_at")
      .eq("table_name", "orders")
      .eq("row_id", order.id)
      .order("created_at", { ascending: true });

    const timeline: Array<{
      at: string;
      event: string;
      from?: string | null;
      to?: string | null;
    }> = [
      { at: order.created_at as string, event: "order_created", to: order.status as string },
    ];

    if (!auditErr && audits) {
      for (const row of audits as Array<{ action: string; old_data: any; new_data: any; created_at: string }>) {
        if (row.action !== "orders.update") continue;
        const oldStatus = row.old_data?.status;
        const newStatus = row.new_data?.status;
        if (oldStatus !== newStatus) {
          timeline.push({ at: row.created_at, event: "status_changed", from: oldStatus, to: newStatus });
        }
        const oldPay = row.old_data?.payment_status;
        const newPay = row.new_data?.payment_status;
        if (oldPay !== newPay) {
          timeline.push({ at: row.created_at, event: "payment_status_changed", from: oldPay, to: newPay });
        }
      }
    }

    return {
      content: [{ type: "text", text: JSON.stringify({ order, timeline }, null, 2) }],
      structuredContent: { order, timeline },
    };
  }),
});
