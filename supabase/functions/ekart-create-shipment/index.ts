import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  CREATE_SHIPMENT_PATH,
  EKART_BASE,
  corsHeaders,
  getAccessToken,
  invalidateToken,
  json,
  readCreds,
  toPhoneNumber,
  toPin,
} from "../_shared/ekart.ts";

/** Build the /api/v1/package/create payload exactly per the `shipment` schema. */
function buildShipmentPayload(order: any, items: any[], store: any) {
  const addr = order.shipping_address || {};

  const total = Number(order.total || 0);
  const tax = Number(order.tax || 0);
  const taxable = Math.max(Number((total - tax).toFixed(2)), 1);
  const isPrepaid = order.payment_status === "paid";
  const quantity = Math.max(
    (items || []).reduce((s, it) => s + Number(it.quantity || 0), 0) || 1,
    1,
  );

  const productsDesc =
    (items || []).map((it) => it.product_name || it.name).filter(Boolean).join(", ").slice(0, 200) ||
    "General merchandise";

  const payload: Record<string, unknown> = {
    seller_name: store.storeName || "Houskase",
    seller_address: store.storeAddress || "",
    seller_gst_tin: store.storeGSTIN || store.storeGstin || "",
    consignee_gst_amount: 0,
    order_number: order.order_number,
    invoice_number: order.invoice_number || order.order_number,
    invoice_date: new Date(order.created_at || Date.now()).toISOString().slice(0, 10),
    consignee_name: addr.fullName || addr.full_name || addr.name || "",
    consignee_alternate_phone: String(addr.altPhone || addr.phone || "").replace(/\D/g, "").slice(-10),
    products_desc: productsDesc,
    payment_mode: isPrepaid ? "Prepaid" : "COD",
    category_of_goods: store.categoryOfGoods || "Home & Kitchen",
    total_amount: total,
    tax_value: tax,
    taxable_amount: taxable,
    commodity_value: String(taxable),
    cod_amount: isPrepaid ? 0 : total,
    return_reason: "",
    quantity,
    weight: Number(store.defaultWeightGm) || 500,
    length: Number(store.defaultLengthCm) || 20,
    height: Number(store.defaultHeightCm) || 10,
    width: Number(store.defaultBreadthCm) || 15,
    drop_location: {
      location_type: "Home",
      name: addr.fullName || addr.full_name || addr.name || "",
      address: [addr.line1 || addr.address, addr.line2].filter(Boolean).join(", "),
      city: addr.city || "",
      state: addr.state || "",
      country: addr.country || "India",
      phone: toPhoneNumber(addr.phone),
      pin: toPin(addr.pincode || addr.zip),
    },
    items: (items || []).map((it) => ({
      product_name: it.product_name || it.name || "Item",
      sku: it.sku || String(it.product_id || ""),
      quantity: Math.max(Number(it.quantity || 1), 1),
      taxable_value: Math.max(Number(it.price || 0), 1),
    })),
  };

  // pickup_location / return_location are auto-filled by Ekart when the seller
  // has a single registered warehouse. Only send an alias when configured.
  if (store.ekartPickupAlias) {
    payload.pickup_location = { name: store.ekartPickupAlias };
    payload.return_location = { name: store.ekartReturnAlias || store.ekartPickupAlias };
  }

  return payload;
}

function validatePayload(p: any): string[] {
  const errors: string[] = [];
  if (!p.order_number) errors.push("order_number missing");
  if (!p.seller_name) errors.push("seller_name missing (set Store name in Settings)");
  if (!p.seller_address) errors.push("seller_address missing (set Store address in Settings)");
  if (!p.seller_gst_tin) errors.push("seller_gst_tin missing (set Store GSTIN in Settings)");
  if (!p.consignee_name) errors.push("consignee_name missing on shipping address");
  if (!/^\d{10}$/.test(String(p.consignee_alternate_phone || ""))) {
    errors.push("consignee_alternate_phone must be a 10-digit number");
  }
  const d = p.drop_location || {};
  if (!d.address) errors.push("drop_location.address missing");
  if (!d.phone) errors.push("drop_location.phone must be a valid 10-digit number");
  if (!d.pin) errors.push("drop_location.pin must be a valid 6-digit pincode");
  if (!(Number(p.total_amount) >= 1)) errors.push("total_amount must be >= 1");
  if (Number(p.cod_amount) > 49999) errors.push("cod_amount exceeds the 49999 limit");
  return errors;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Auth: service-role bearer (internal auto-sync) OR an admin user
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
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

  const { creds, missing } = readCreds();
  if (!creds) {
    await admin.from("ekart_integration_logs").insert({
      order_id,
      action: "create_shipment",
      success: false,
      error_message: `Missing Ekart credentials: ${missing.join(", ")}`,
    });
    return json({ error: `Ekart credentials not configured: ${missing.join(", ")}` }, 500);
  }

  const { data: order, error: oErr } = await admin.from("orders").select("*").eq("id", order_id).maybeSingle();
  if (oErr || !order) return json({ error: "Order not found" }, 404);
  if (order.ekart_shipment_id || order.tracking_id) {
    return json({ success: true, already: true, tracking_id: order.tracking_id, shipment_id: order.ekart_shipment_id });
  }

  const { data: items } = await admin.from("order_items").select("*").eq("order_id", order_id);
  const { data: settingsRow } = await admin.from("site_settings").select("value").eq("key", "store").maybeSingle();
  const store = (settingsRow?.value as any) || {};

  // ---- 1) Authenticate (cached token, auto refresh) ----
  let auth = await getAccessToken(creds);
  await admin.from("ekart_integration_logs").insert({
    order_id,
    order_number: order.order_number,
    action: "auth",
    endpoint: `/integrations/v2/auth/token/${creds.clientId}`,
    request_payload: { username: creds.username, password: "[redacted]" },
    response_payload: auth.safeResponse as any,
    status_code: auth.status,
    success: !!auth.token,
    error_message: auth.token ? null : auth.error || "Failed to obtain Ekart access token",
  });
  if (!auth.token) {
    await admin.from("orders")
      .update({ ekart_sync_status: "failed", ekart_last_error: (auth.error || "Auth failed").slice(0, 500) })
      .eq("id", order_id);
    return json({ error: "Ekart auth failed", details: auth.safeResponse }, 502);
  }

  // ---- 2) Build + validate payload ----
  const payload = buildShipmentPayload(order, items || [], store);
  const validationErrors = validatePayload(payload);
  if (validationErrors.length) {
    await admin.from("ekart_integration_logs").insert({
      order_id,
      order_number: order.order_number,
      action: "create_shipment",
      endpoint: CREATE_SHIPMENT_PATH,
      request_payload: payload,
      response_payload: { validation_errors: validationErrors } as any,
      success: false,
      error_message: `Validation failed: ${validationErrors.join("; ")}`,
    });
    await admin.from("orders")
      .update({ ekart_sync_status: "failed", ekart_last_error: validationErrors.join("; ").slice(0, 500) })
      .eq("id", order_id);
    return json({ error: "Payload validation failed", validation_errors: validationErrors }, 400);
  }

  // ---- 3) Create shipment: PUT /api/v1/package/create ----
  const doCreate = async (token: string) =>
    await fetch(`${EKART_BASE}${CREATE_SHIPMENT_PATH}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

  let res = await doCreate(auth.token);

  // Token could be stale on a warm isolate — refresh once on 401/403.
  if (res.status === 401 || res.status === 403) {
    invalidateToken();
    auth = await getAccessToken(creds, true);
    if (auth.token) res = await doCreate(auth.token);
  }

  const respText = await res.text();
  let respBody: any = respText;
  try { respBody = JSON.parse(respText); } catch { /* keep raw */ }

  const trackingId = respBody?.tracking_id;
  const ok = res.ok && respBody?.status === true && !!trackingId;
  const errMsg = ok
    ? null
    : (respBody?.remark || respBody?.message || respBody?.error ||
       (Array.isArray(respBody?.errors) ? respBody.errors.join("; ") : null) ||
       `HTTP ${res.status}`).toString();

  await admin.from("ekart_integration_logs").insert({
    order_id,
    order_number: order.order_number,
    action: "create_shipment",
    endpoint: CREATE_SHIPMENT_PATH,
    request_payload: payload,
    response_payload: respBody,
    status_code: res.status,
    success: ok,
    tracking_id: trackingId || null,
    error_message: errMsg,
  });

  if (!ok) {
    await admin.from("orders")
      .update({ ekart_sync_status: "failed", ekart_last_error: errMsg!.slice(0, 500) })
      .eq("id", order_id);
    return json({ error: "Shipment creation failed", details: respBody }, 502);
  }

  await admin.from("orders").update({
    tracking_id: trackingId,
    ekart_shipment_id: trackingId,
    ekart_sync_status: "synced",
    ekart_last_error: null,
    ekart_synced_at: new Date().toISOString(),
  }).eq("id", order_id);

  return json({
    success: true,
    tracking_id: trackingId,
    vendor: respBody?.vendor ?? null,
    barcodes: respBody?.barcodes ?? null,
    public_url: `${EKART_BASE}/track/${trackingId}`,
  });
});
