import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: Record<string, unknown>, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...corsHeaders } });

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const mask = (v?: string | null) =>
  !v ? "(missing)" : v.length <= 8 ? "***" : `${v.slice(0, 4)}...${v.slice(-2)} (len=${v.length})`;

Deno.serve(async (req) => {
  const reqId = crypto.randomUUID();
  const log = (msg: string, extra: Record<string, unknown> = {}) =>
    console.log(JSON.stringify({ fn: "verify-razorpay-payment", reqId, msg, ...extra }));
  const errLog = (msg: string, extra: Record<string, unknown> = {}) =>
    console.error(JSON.stringify({ fn: "verify-razorpay-payment", reqId, msg, ...extra }));

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    log("env check", { RAZORPAY_KEY_SECRET: mask(keySecret), hasSupabaseUrl: !!supabaseUrl, hasServiceKey: !!serviceKey });

    if (!keySecret || !supabaseUrl || !serviceKey) {
      errLog("server not configured");
      return json({ error: "Server not configured", reqId }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      errLog("missing bearer token");
      return json({ error: "Unauthorized", reqId }, 401);
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: userData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !userData?.user) {
      errLog("auth failed", { authErr: authErr?.message });
      return json({ error: "Unauthorized", reqId }, 401);
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body ?? {};
    log("payload received", {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      hasSignature: !!razorpay_signature,
      signatureLen: razorpay_signature?.length,
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      errLog("missing fields");
      return json({ error: "Missing fields", reqId }, 400);
    }

    const expected = await hmacSha256Hex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    const sigMatch = timingSafeEqual(expected, String(razorpay_signature));
    log("signature verification", {
      match: sigMatch,
      expectedPreview: expected.slice(0, 8) + "...",
      receivedPreview: String(razorpay_signature).slice(0, 8) + "...",
    });
    if (!sigMatch) {
      errLog("signature mismatch", { order_id, razorpay_order_id, razorpay_payment_id });
      return json({ error: "Invalid payment signature", reqId }, 400);
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, user_id, razorpay_order_id, payment_status")
      .eq("id", order_id)
      .maybeSingle();
    if (orderErr || !order) {
      errLog("order not found", { orderErr: orderErr?.message });
      return json({ error: "Order not found", reqId }, 404);
    }
    if (order.user_id !== user.id) {
      errLog("ownership mismatch");
      return json({ error: "Forbidden", reqId }, 403);
    }
    if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
      errLog("order id mismatch", { onOrder: order.razorpay_order_id, provided: razorpay_order_id });
      return json({ error: "Order id mismatch", reqId }, 400);
    }

    const { error: updErr } = await admin
      .from("orders")
      .update({
        payment_status: "paid",
        payment_method: "razorpay",
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        status: "processing",
      })
      .eq("id", order.id);
    if (updErr) {
      errLog("order update failed", { updErr: updErr.message });
      return json({ error: "Failed to mark order paid", reqId }, 500);
    }

    log("order marked paid", { order_id: order.id });

    // Fire-and-forget: auto-create Ekart shipment
    try {
      fetch(`${supabaseUrl}/functions/v1/ekart-create-shipment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ order_id: order.id }),
      }).catch((e) => errLog("ekart auto-sync fetch failed", { error: (e as Error).message }));
    } catch (e) {
      errLog("ekart auto-sync dispatch error", { error: (e as Error).message });
    }

    return json({ success: true, reqId });
  } catch (e) {
    errLog("unhandled exception", { error: (e as Error).message, stack: (e as Error).stack });
    return json({ error: "Verification failed", reqId }, 500);
  }
});
