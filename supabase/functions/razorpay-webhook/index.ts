import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-razorpay-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    console.log(JSON.stringify({ fn: "razorpay-webhook", reqId, msg, ...extra }));
  const errLog = (msg: string, extra: Record<string, unknown> = {}) =>
    console.error(JSON.stringify({ fn: "razorpay-webhook", reqId, msg, ...extra }));

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    log("env check", {
      RAZORPAY_WEBHOOK_SECRET: mask(webhookSecret),
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
    });
    if (!webhookSecret || !supabaseUrl || !serviceKey) {
      errLog("webhook not configured");
      return new Response("Not configured", { status: 500, headers: corsHeaders });
    }

    const signature = req.headers.get("x-razorpay-signature") || "";
    const raw = await req.text();
    log("received webhook", { bodyLen: raw.length, hasSignature: !!signature, signatureLen: signature.length });

    const expected = await hmacSha256Hex(webhookSecret, raw);
    const sigMatch = !!signature && timingSafeEqual(expected, signature);
    log("signature verification", {
      match: sigMatch,
      expectedPreview: expected.slice(0, 8) + "...",
      receivedPreview: signature.slice(0, 8) + "...",
    });
    if (!sigMatch) {
      errLog("invalid webhook signature");
      return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    }

    const event = JSON.parse(raw);
    log("event", { type: event?.event, event_id: event?.id });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Log the webhook event
    await admin.from("webhook_events").insert({
      provider: "razorpay",
      event_type: event.event,
      external_id: event.id,
      payload: event,
      headers: Object.fromEntries(req.headers.entries()),
    });

    const payment = event?.payload?.payment?.entity;
    const rzpOrderId = payment?.order_id;
    if (!rzpOrderId) {
      log("no order_id in payload, ignoring");
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const { error } = await admin
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "razorpay",
          razorpay_payment_id: payment.id,
          status: "processing",
        })
        .eq("razorpay_order_id", rzpOrderId);
      if (error) errLog("order update failed", { error: error.message, rzpOrderId });
      else log("order marked paid", { rzpOrderId, razorpay_payment_id: payment.id });
    } else if (event.event === "payment.failed") {
      const { error } = await admin
        .from("orders")
        .update({ payment_status: "failed", razorpay_payment_id: payment.id })
        .eq("razorpay_order_id", rzpOrderId);
      if (error) errLog("order failed-update error", { error: error.message, rzpOrderId });
      else log("order marked failed", { rzpOrderId, razorpay_payment_id: payment.id, reason: payment.error_description });
    } else {
      log("event type ignored", { type: event.event });
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    errLog("unhandled exception", { error: (e as Error).message, stack: (e as Error).stack });
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
