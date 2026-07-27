import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EKART_BASE = "https://app.elite.ekartlogistics.in";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tracking_id } = await req.json();

    if (!tracking_id || typeof tracking_id !== "string") {
      return new Response(
        JSON.stringify({ error: "tracking_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sanitized = tracking_id.trim().slice(0, 64);
    if (!/^[A-Za-z0-9\-]+$/.test(sanitized)) {
      return new Response(
        JSON.stringify({ error: "Invalid tracking id format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = `${EKART_BASE}/api/v1/track/${encodeURIComponent(sanitized)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!res.ok || !data || !data.track) {
      return new Response(
        JSON.stringify({ error: "Tracking details not found", status: res.status }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        tracking_id: data._id ?? sanitized,
        order_number: data.order_number ?? null,
        edd: data.edd ?? null,
        current: {
          status: data.track?.status ?? null,
          desc: data.track?.desc ?? null,
          location: data.track?.location ?? null,
          ctime: data.track?.ctime ?? null,
          pickupTime: data.track?.pickupTime ?? null,
          ndrStatus: data.track?.ndrStatus ?? null,
          attempts: data.track?.attempts ?? null,
        },
        history: Array.isArray(data.track?.details) ? data.track.details : [],
        public_url: `${EKART_BASE}/track/${encodeURIComponent(sanitized)}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("ekart-track error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch tracking" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
