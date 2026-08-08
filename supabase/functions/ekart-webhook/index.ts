import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ekart-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    // Log the event
    const { data: logEntry, error: logErr } = await admin.from("webhook_events").insert({
      provider: "ekart",
      event_type: body.event_name || body.status,
      external_id: body.tracking_id || body.request_id,
      payload: body,
      headers: Object.fromEntries(req.headers.entries()),
    }).select().single();

    if (logErr) console.error("Failed to log Ekart webhook:", logErr);

    // Update shipment status if tracking_id is present
    // Expected Ekart webhook payload often contains tracking_id and status/event_name
    const trackingId = body.tracking_id;
    const status = body.status || body.event_name;
    
    if (trackingId) {
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, ekart_history")
        .eq("tracking_id", trackingId)
        .maybeSingle();

      if (order) {
        const history = Array.isArray(order.ekart_history) ? order.ekart_history : [];
        const newEvent = {
          status,
          timestamp: new Date().toISOString(),
          details: body.remarks || body.location || "",
          raw: body
        };

        await admin.from("orders").update({
          ekart_status: status,
          ekart_history: [...history, newEvent],
          updated_at: new Date().toISOString()
        }).eq("id", order.id);

        if (logEntry) {
          await admin.from("webhook_events").update({ 
            status: "processed", 
            processed_at: new Date().toISOString() 
          }).eq("id", logEntry.id);
        }
      }
    }

    return json({ received: true });
  } catch (err) {
    console.error("Ekart webhook error:", err);
    return json({ error: err.message }, 500);
  }
});
