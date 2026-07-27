import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ekart-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...corsHeaders } });

// Ekart status -> internal order.status
function mapStatus(ekartStatus: string | undefined | null): string | null {
  if (!ekartStatus) return null;
  const s = ekartStatus.toLowerCase();
  if (s.includes("delivered")) return "delivered";
  if (s.includes("out_for_delivery") || s.includes("out for delivery")) return "out_for_delivery";
  if (s.includes("in_transit") || s.includes("in transit") || s.includes("shipped") || s.includes("manifested")) return "shipped";
  if (s.includes("picked") || s.includes("pickup")) return "shipped";
  if (s.includes("rto") || s.includes("returned")) return "returned";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("ndr") || s.includes("failed") || s.includes("undelivered")) return "delivery_failed";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Optional shared-secret verification
  const configuredSecret = Deno.env.get("EKART_WEBHOOK_SECRET");
  if (configuredSecret) {
    const provided = req.headers.get("x-ekart-signature") || req.headers.get("x-webhook-secret") || "";
    if (provided !== configuredSecret) {
      await admin.from("ekart_integration_logs").insert({
        action: "webhook", success: false, status_code: 401, error_message: "Invalid webhook signature",
      });
      return json({ error: "Unauthorized" }, 401);
    }
  }

  const body = await req.json().catch(() => ({}));
  const trackingId: string | undefined =
    body?.tracking_id || body?.awb || body?.awb_number || body?.data?.tracking_id;
  const orderNumber: string | undefined = body?.order_number || body?.data?.order_number;
  const rawStatus: string | undefined = body?.status || body?.current_status || body?.track?.status;

  const mapped = mapStatus(rawStatus);

  // Find order
  let orderQuery = admin.from("orders").select("id, order_number, status").limit(1);
  if (trackingId) orderQuery = orderQuery.eq("tracking_id", trackingId);
  else if (orderNumber) orderQuery = orderQuery.eq("order_number", orderNumber);
  else {
    await admin.from("ekart_integration_logs").insert({
      action: "webhook", success: false, status_code: 400,
      request_payload: body, error_message: "No tracking_id or order_number in webhook",
    });
    return json({ error: "tracking_id or order_number required" }, 400);
  }

  const { data: order } = await orderQuery.maybeSingle();

  if (!order) {
    await admin.from("ekart_integration_logs").insert({
      action: "webhook", success: false, status_code: 404,
      tracking_id: trackingId || null, order_number: orderNumber || null,
      request_payload: body, error_message: "Order not found",
    });
    return json({ error: "Order not found" }, 404);
  }

  const updates: Record<string, unknown> = {};
  if (mapped && mapped !== order.status) updates.status = mapped;

  if (Object.keys(updates).length > 0) {
    await admin.from("orders").update(updates).eq("id", order.id);
  }

  await admin.from("ekart_integration_logs").insert({
    order_id: order.id, order_number: order.order_number,
    action: "webhook", endpoint: "/ekart-webhook",
    request_payload: body, success: true, status_code: 200,
    tracking_id: trackingId || null,
    error_message: mapped ? null : `Unmapped Ekart status: ${rawStatus ?? "(none)"}`,
  });

  return json({ success: true, order_id: order.id, mapped_status: mapped });
});
