import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const EKART_BASE = Deno.env.get("EKART_BASE_URL") || "https://app.elite.ekartlogistics.in";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...corsHeaders } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return json({ error: "Unauthorized" }, 401);
  const { data: u } = await admin.auth.getUser(bearer);
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles || []).some((r: any) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

  const clientId = Deno.env.get("EKART_CLIENT_ID");
  const clientSecret = Deno.env.get("EKART_CLIENT_SECRET");
  const webhookSecret = Deno.env.get("EKART_WEBHOOK_SECRET");

  const status = {
    EKART_CLIENT_ID: !!clientId,
    EKART_CLIENT_SECRET: !!clientSecret,
    EKART_WEBHOOK_SECRET: !!webhookSecret,
    base_url: EKART_BASE,
    webhook_url: `${supabaseUrl}/functions/v1/ekart-webhook`,
  };

  if (!clientId || !clientSecret) {
    return json({ ok: false, message: "Missing EKART_CLIENT_ID or EKART_CLIENT_SECRET", status });
  }

  try {
    const url = `${EKART_BASE}/integrations/v2/auth/token/${encodeURIComponent(clientId)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_secret: clientSecret }),
    });
    const text = await res.text();
    let body: any = text;
    try { body = JSON.parse(text); } catch { /* ignore */ }
    const token = body?.access_token || body?.token || body?.data?.access_token;
    return json({ ok: res.ok && !!token, status_code: res.status, has_token: !!token, response: body, status });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message, status });
  }
});
