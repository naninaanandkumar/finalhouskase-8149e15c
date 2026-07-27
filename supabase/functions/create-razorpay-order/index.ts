import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: Record<string, unknown>, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...corsHeaders } });

const mask = (v?: string | null) =>
  !v ? "(missing)" : v.length <= 8 ? "***" : `${v.slice(0, 4)}...${v.slice(-2)} (len=${v.length})`;

Deno.serve(async (req) => {
  const reqId = crypto.randomUUID();
  const log = (msg: string, extra: Record<string, unknown> = {}) =>
    console.log(JSON.stringify({ fn: "create-razorpay-order", reqId, msg, ...extra }));
  const errLog = (msg: string, extra: Record<string, unknown> = {}) =>
    console.error(JSON.stringify({ fn: "create-razorpay-order", reqId, msg, ...extra }));

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    log("env check", {
      RAZORPAY_KEY_ID: mask(keyId),
      RAZORPAY_KEY_SECRET: mask(keySecret),
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
      keyMode: keyId?.startsWith("rzp_live_") ? "live" : keyId?.startsWith("rzp_test_") ? "test" : "unknown",
    });

    if (!keyId || !keySecret || !supabaseUrl || !serviceKey) {
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
    log("authenticated", { userId: user.id });

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) {
      errLog("missing order_id");
      return json({ error: "order_id required", reqId }, 400);
    }
    log("received order_id", { order_id });

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, total, user_id, payment_status, razorpay_order_id")
      .eq("id", order_id)
      .maybeSingle();
    if (orderErr || !order) {
      errLog("order not found", { orderErr: orderErr?.message });
      return json({ error: "Order not found", reqId }, 404);
    }
    if (order.user_id !== user.id) {
      errLog("order ownership mismatch", { orderUser: order.user_id, requestUser: user.id });
      return json({ error: "Forbidden", reqId }, 403);
    }
    if (order.payment_status === "paid") {
      errLog("order already paid", { order_id });
      return json({ error: "Order already paid", reqId }, 400);
    }

    if (order.razorpay_order_id) {
      log("reusing existing razorpay order", { razorpay_order_id: order.razorpay_order_id });
      return json({
        success: true,
        key_id: keyId,
        razorpay_order_id: order.razorpay_order_id,
        amount: Math.round(Number(order.total) * 100),
        currency: "INR",
        order_number: order.order_number,
        reqId,
      });
    }

    const amountPaise = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      errLog("invalid amount", { total: order.total, amountPaise });
      return json({ error: "Invalid amount", reqId }, 400);
    }

    log("calling razorpay orders api", { amountPaise, receipt: order.order_number });
    const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: order.order_number,
        notes: { order_id: order.id, user_id: user.id },
      }),
    });
    const rzpJson = await rzpRes.json();
    if (!rzpRes.ok) {
      errLog("razorpay order create failed", { status: rzpRes.status, body: rzpJson });
      return json({ error: rzpJson?.error?.description || "Razorpay error", reqId, razorpay: rzpJson }, 502);
    }
    log("razorpay order created", { razorpay_order_id: rzpJson.id, status: rzpJson.status });

    const { error: updErr } = await admin
      .from("orders")
      .update({ razorpay_order_id: rzpJson.id, payment_method: "razorpay" })
      .eq("id", order.id);
    if (updErr) errLog("failed to persist razorpay_order_id", { updErr: updErr.message });

    return json({
      success: true,
      key_id: keyId,
      razorpay_order_id: rzpJson.id,
      amount: amountPaise,
      currency: "INR",
      order_number: order.order_number,
      reqId,
    });
  } catch (e) {
    errLog("unhandled exception", { error: (e as Error).message, stack: (e as Error).stack });
    return json({ error: "Failed to create payment order", reqId }, 500);
  }
});
