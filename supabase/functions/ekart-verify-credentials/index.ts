import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AUTH_PATH, EKART_BASE, corsHeaders, getAccessToken, json, readCreds } from "../_shared/ekart.ts";

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

  const { creds, missing } = readCreds();

  const status = {
    EKART_CLIENT_ID: !!Deno.env.get("EKART_CLIENT_ID"),
    EKART_USERNAME: !!Deno.env.get("EKART_USERNAME"),
    EKART_PASSWORD: !!Deno.env.get("EKART_PASSWORD"),
    base_url: EKART_BASE,
    auth_endpoint: AUTH_PATH(Deno.env.get("EKART_CLIENT_ID") || "{client_id}"),
  };

  if (!creds) {
    return json({ ok: false, message: `Missing: ${missing.join(", ")}`, status });
  }

  const auth = await getAccessToken(creds, true);
  return json({
    ok: !!auth.token,
    status_code: auth.status,
    has_token: !!auth.token,
    expires_in: auth.expiresIn ?? null,
    response: auth.safeResponse,
    error: auth.error ?? null,
    status,
  });
});
