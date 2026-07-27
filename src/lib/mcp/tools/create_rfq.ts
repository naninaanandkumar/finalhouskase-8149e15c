import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, withAudit } from "../helpers";

/**
 * Create a bulk-quote (RFQ) request for the signed-in user. Inserts one row
 * into rfq_requests and one row per line item into rfq_items. RLS ensures the
 * request is tied to the caller.
 */
export default defineTool({
  name: "create_rfq",
  title: "Create bulk quote request (RFQ)",
  description:
    "Create a Houskase bulk quote request (RFQ) for the signed-in user with a list of products, quantities, and optional notes. Returns the RFQ number.",
  inputSchema: {
    items: z
      .array(
        z.object({
          product_id: z.string().trim().min(1).describe("Product UUID."),
          quantity: z.number().int().min(1).describe("Requested quantity."),
          target_price: z.number().optional().describe("Optional target price per unit (INR)."),
          variation_id: z.string().trim().optional().describe("Optional product variation UUID."),
        }),
      )
      .min(1)
      .describe("Line items for the quote request."),
    notes: z.string().trim().optional().describe("Optional message to the sales team."),
    company_name: z.string().trim().optional().describe("Optional company name (for B2B)."),
    gst_number: z.string().trim().optional().describe("Optional GST number (for B2B)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: withAudit("create_rfq", async ({ items, notes, company_name, gst_number }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    // Pull profile fields we need to fill required RFQ columns.
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, buyer_type")
      .eq("user_id", userId)
      .maybeSingle();

    // Resolve product names for headline row + item rows (product_name is required).
    const productIds = Array.from(new Set(items.map((i) => i.product_id)));
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);
    if (prodErr) return { content: [{ type: "text", text: `Error: ${prodErr.message}` }], isError: true };
    const nameById = new Map((products ?? []).map((p) => [p.id as string, p.name as string]));
    const missing = items.filter((i) => !nameById.has(i.product_id));
    if (missing.length > 0) {
      return {
        content: [{ type: "text", text: `Unknown product ids: ${missing.map((m) => m.product_id).join(", ")}` }],
        isError: true,
      };
    }

    // Total quantity + first product name become the headline row for admin lists.
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    const headlineName =
      items.length === 1 ? nameById.get(items[0].product_id)! : `${items.length} products (bulk)`;

    const { data: rfq, error: rfqErr } = await supabase
      .from("rfq_requests")
      .insert({
        user_id: userId,
        buyer_type: (profile?.buyer_type as any) ?? "shop",
        full_name: profile?.full_name ?? ctx.getUserEmail?.() ?? "",
        email: profile?.email ?? ctx.getUserEmail?.() ?? "",
        phone: profile?.phone ?? "",
        company_name: company_name ?? null,
        gst_number: gst_number ?? null,
        product_name: headlineName,
        product_id: items.length === 1 ? items[0].product_id : null,
        quantity: totalQty,
        target_price: items.length === 1 ? (items[0].target_price ?? null) : null,
        message: notes ?? null,
        status: "pending",
      })
      .select("id, rfq_number")
      .single();
    if (rfqErr || !rfq) {
      return { content: [{ type: "text", text: `Failed to create RFQ: ${rfqErr?.message ?? "unknown"}` }], isError: true };
    }

    // Insert line items — one row per product.
    const lineRows = items.map((i) => ({
      rfq_id: rfq.id,
      product_id: i.product_id,
      variation_id: i.variation_id ?? null,
      product_name: nameById.get(i.product_id)!,
      quantity: i.quantity,
      target_price: i.target_price ?? null,
    }));
    const { error: itemsErr } = await supabase.from("rfq_items").insert(lineRows);
    if (itemsErr) {
      return {
        content: [
          {
            type: "text",
            text: `RFQ created (${rfq.rfq_number}) but failed to save line items: ${itemsErr.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `RFQ ${rfq.rfq_number} submitted with ${items.length} product(s), total quantity ${totalQty}. The Houskase sales team will respond with a quote.`,
        },
      ],
      structuredContent: {
        rfq_id: rfq.id,
        rfq_number: rfq.rfq_number,
        item_count: items.length,
        total_quantity: totalQty,
      },
    };
  }),
});
