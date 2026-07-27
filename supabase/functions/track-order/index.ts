import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_number, email } = await req.json();

    if (!order_number || typeof order_number !== "string") {
      return new Response(
        JSON.stringify({ error: "Valid order_number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 320) {
      return new Response(
        JSON.stringify({ error: "A valid email associated with the order is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Validate format: only allow alphanumeric, hyphens
    const sanitized = order_number.trim().slice(0, 50);
    if (!/^[A-Za-z0-9\-]+$/.test(sanitized)) {
      return new Response(
        JSON.stringify({ error: "Invalid order number format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch order - only return minimal tracking data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, status, created_at, user_id, shipping_address")
      .ilike("order_number", sanitized)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the caller knows the email associated with the order (prevents enumeration).
    const addr = (order as any).shipping_address ?? {};
    const addrEmail = typeof addr?.email === "string" ? addr.email.trim().toLowerCase() : "";
    let ownerEmail = addrEmail;
    if (!ownerEmail && (order as any).user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", (order as any).user_id)
        .maybeSingle();
      ownerEmail = (profile?.email ?? "").trim().toLowerCase();
    }
    if (!ownerEmail || ownerEmail !== normalizedEmail) {
      // Return generic 404 so attackers can't tell whether the order number exists.
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch order items - only return product name, quantity, total_price
    const { data: items } = await supabase
      .from("order_items")
      .select("id, product_name, quantity, total_price")
      .eq("order_id", order.id);

    // Calculate total from items for display (don't expose raw order total/addresses)
    const total = items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;

    return new Response(
      JSON.stringify({
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        total,
        items: items || [],
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error tracking order:", error);
    return new Response(
      JSON.stringify({ error: "Failed to track order" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
