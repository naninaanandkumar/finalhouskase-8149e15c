import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EKART_BASE = Deno.env.get("EKART_BASE_URL") || "https://app.elite.ekartlogistics.in";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...corsHeaders } });

async function getAccessToken(clientId: string, clientSecret: string): Promise<{ token?: string; raw: unknown; status: number }> {
  const url = `${EKART_BASE}/integrations/v2/auth/token/${encodeURIComponent(clientId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_secret: clientSecret }),
  });
  const text = await res.text();
  let raw: any = text;
  try { raw = JSON.parse(text); } catch { /* keep text */ }
  const token = raw?.access_token || raw?.token || raw?.data?.access_token;
  return { token, raw, status: res.status };
}

function buildShipmentPayload(order: any, items: any[]) {
  const addr = order.shipping_address || {};
  return {
    order_number: order.order_number,
    payment_mode: order.payment_status === "paid" ? "PREPAID" : "COD",
    cod_amount: order.payment_status === "paid" ? 0 : Number(order.total || 0),
    invoice_value: Number(order.total || 0),
    weight_gm: 500,
    length_cm: 20,
    breadth_cm: 15,
    height_cm: 10,
    consignee: {
      name: addr.fullName || addr.name || "",
      phone: addr.phone || "",
      email: addr.email || "",
      address_line1: addr.line1 || addr.address || "",
      address_line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || addr.zip || "",
      country: addr.country || "IN",
    },
    items: (items || []).map((it) => ({
      name: it.product_name || it.name || "Item",
      sku: it.sku || String(it.product_id || ""),
      qty: Number(it.quantity || 1),
      price: Number(it.price || 0),
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Auth: allow service-role bearer (internal auto-sync) OR admin user
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  let authorized = false;
  if (bearer && bearer === serviceKey) {
    authorized = true;
  } else if (bearer) {
    const { data } = await admin.auth.getUser(bearer);
    if (data?.user) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.user.id);
      authorized = (roles || []).some((r: any) => r.role === "admin");
    }
  }
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  const { order_id } = await req.json().catch(() => ({}));
  if (!order_id) return json({ error: "order_id required" }, 400);

  const clientId = Deno.env.get("EKART_CLIENT_ID");
  const clientSecret = Deno.env.get("EKART_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    await admin.from("ekart_integration_logs").insert({
      order_id, action: "create_shipment", success: false,
      error_message: "EKART_CLIENT_ID / EKART_CLIENT_SECRET not configured",
    });
    return json({ error: "Ekart credentials not configured" }, 500);
  }

  const { data: order, error: oErr } = await admin.from("orders").select("*").eq("id", order_id).maybeSingle();
  if (oErr || !order) return json({ error: "Order not found" }, 404);
  if (order.ekart_shipment_id) {
    return json({ success: true, already: true, tracking_id: order.tracking_id, shipment_id: order.ekart_shipment_id });
  }

  const { data: items } = await admin.from("order_items").select("*").eq("order_id", order_id);

  // 1) Auth
  const tok = await getAccessToken(clientId, clientSecret);
  if (!tok.token) {
    await admin.from("ekart_integration_logs").insert({
      order_id, order_number: order.order_number, action: "auth", endpoint: "/integrations/v2/auth/token",
      success: false, status_code: tok.status, response_payload: tok.raw as any,
      error_message: "Failed to obtain Ekart access token",
    });
    await admin.from("orders").update({ ekart_sync_status: "failed", ekart_last_error: "Auth failed" }).eq("id", order_id);
    return json({ error: "Ekart auth failed", details: tok.raw }, 502);
  }
  await admin.from("ekart_integration_logs").insert({
    order_id, order_number: order.order_number, action: "auth", endpoint: "/integrations/v2/auth/token",
    success: true, status_code: tok.status,
  });

  // 2) Create shipment
  const payload = buildShipmentPayload(order, items || []);
  const endpoint = "/api/v1/shipments";
  const res = await fetch(`${EKART_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${tok.token}`,
    },
    body: JSON.stringify(payload),
  });
  const respText = await res.text();
  let respBody: any = respText;
  try { respBody = JSON.parse(respText); } catch { /* ignore */ }

  const trackingId = respBody?.tracking_id || respBody?.awb || respBody?.data?.tracking_id || respBody?.data?.awb;
  const shipmentId = respBody?.shipment_id || respBody?._id || respBody?.data?.shipment_id;
  const ok = res.ok && !!trackingId;

  await admin.from("ekart_integration_logs").insert({
    order_id, order_number: order.order_number, action: "create_shipment", endpoint,
    request_payload: payload, response_payload: respBody, status_code: res.status,
    success: ok, tracking_id: trackingId || null,
    error_message: ok ? null : (respBody?.error || respBody?.message || `HTTP ${res.status}`),
  });

  if (!ok) {
    await admin.from("orders").update({
      ekart_sync_status: "failed",
      ekart_last_error: (respBody?.error || respBody?.message || `HTTP ${res.status}`).toString().slice(0, 500),
    }).eq("id", order_id);
    return json({ error: "Shipment creation failed", details: respBody }, 502);
  }

  await admin.from("orders").update({
    tracking_id: trackingId,
    ekart_shipment_id: shipmentId || null,
    ekart_sync_status: "synced",
    ekart_last_error: null,
    ekart_synced_at: new Date().toISOString(),
  }).eq("id", order_id);

  return json({ success: true, tracking_id: trackingId, shipment_id: shipmentId });
});
