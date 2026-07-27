import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, withAudit } from "../helpers";

const APP_URL = "https://houskase.lovable.app";

/**
 * Initiate checkout for the signed-in user's cart.
 *
 * Payment on Houskase runs through the Razorpay browser SDK (a JS modal), so
 * there is no external hosted payment page. This tool creates a pending order
 * on the backend and returns a checkout URL the user opens in their browser to
 * complete payment.
 */
export default defineTool({
  name: "initiate_checkout",
  title: "Start checkout for my cart",
  description:
    "Create a pending order from the signed-in user's cart and return a checkout URL to complete payment in the browser. Requires a shipping address.",
  inputSchema: {
    shipping_address: z
      .object({
        full_name: z.string().trim().min(1),
        phone: z.string().trim().min(1),
        line1: z.string().trim().min(1),
        line2: z.string().trim().optional(),
        city: z.string().trim().min(1),
        state: z.string().trim().min(1),
        pincode: z.string().trim().min(1),
        country: z.string().trim().optional(),
      })
      .describe("Shipping address for the order."),
    notes: z.string().trim().optional().describe("Optional order notes."),
    use_same_billing_address: z.boolean().optional().describe("Use shipping address for billing (default true)."),
  },
  // Charging money is a destructive/irreversible action from the agent's POV.
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: withAudit("initiate_checkout", async ({ shipping_address, notes, use_same_billing_address }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    // Load the user's cart via RLS.
    const { data: cart, error: cartErr } = await supabase
      .from("cart_items")
      .select("product_id, variation_id, quantity")
      .eq("user_id", ctx.getUserId());
    if (cartErr) return { content: [{ type: "text", text: `Error: ${cartErr.message}` }], isError: true };
    if (!cart || cart.length === 0) {
      return { content: [{ type: "text", text: "Your cart is empty. Add items first." }], isError: true };
    }

    // Create the order through the existing edge function (uses same auth token via RLS).
    const { data: orderResult, error: orderErr } = await supabase.functions.invoke("create-order", {
      body: {
        items: cart,
        shipping_address,
        billing_address: use_same_billing_address === false ? undefined : shipping_address,
        notes,
      },
    });
    if (orderErr || !orderResult?.order) {
      return {
        content: [{ type: "text", text: `Failed to create order: ${orderErr?.message ?? "unknown error"}` }],
        isError: true,
      };
    }

    const order = orderResult.order as { id: string; order_number: string; total: number };

    // Create Razorpay order so the browser can resume with a valid payment intent.
    let razorpayOrderId: string | null = null;
    const { data: rzp, error: rzpErr } = await supabase.functions.invoke("create-razorpay-order", {
      body: { order_id: order.id },
    });
    if (!rzpErr && rzp?.razorpay_order_id) {
      razorpayOrderId = rzp.razorpay_order_id;
    }

    const checkoutUrl = `${APP_URL}/checkout?order_id=${order.id}`;
    const message =
      `Order ${order.order_number} created for ₹${order.total}. ` +
      `Open ${checkoutUrl} in your browser to complete payment via Razorpay ` +
      `(UPI / cards / netbanking / wallets).`;

    return {
      content: [{ type: "text", text: message }],
      structuredContent: {
        order_id: order.id,
        order_number: order.order_number,
        total: order.total,
        razorpay_order_id: razorpayOrderId,
        checkout_url: checkoutUrl,
        note: "Payment must be completed in a browser — Razorpay uses a JS modal, not a hosted URL.",
      },
    };
  }),
});
