import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvoiceRequest {
  order_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller's identity
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;

    const { order_id }: InvoiceRequest = await req.json();

    if (!order_id) {
      throw new Error("Missing order_id");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Authorization: user must own the order or be admin
    const { data: isAdminResult } = await supabase.rpc("is_admin", { _user_id: userId });
    if (order.user_id !== userId && !isAdminResult) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order_id);

    if (itemsError) {
      throw new Error("Failed to fetch order items");
    }

    // Fetch buyer profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", order.user_id)
      .single();

    // Check if invoice already exists
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (existingInvoice) {
      return new Response(JSON.stringify({ 
        success: true, 
        invoice: existingInvoice,
        message: "Invoice already exists"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        order_id: order_id,
        user_id: order.user_id,
        amount: order.subtotal,
        tax: order.tax || 0,
        total: order.total,
        status: "unpaid",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Invoice creation error:", invoiceError);
      throw new Error("Failed to create invoice");
    }

    // Generate HTML invoice content for download
    const invoiceHtml = generateInvoiceHtml({
      invoice,
      order,
      items: items || [],
      profile,
    });

    console.log("Invoice created successfully:", invoice.invoice_number);

    return new Response(JSON.stringify({ 
      success: true, 
      invoice,
      html: invoiceHtml,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error generating invoice:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateInvoiceHtml(data: {
  invoice: any;
  order: any;
  items: any[];
  profile: any;
}) {
  const { invoice, order, items, profile } = data;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.product_name)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${escapeHtml(item.quantity)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.total_price).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto; padding: 40px;">
        <h1>Invoice ${escapeHtml(invoice.invoice_number)}</h1>
        <p>Date: ${escapeHtml(new Date(invoice.created_at).toLocaleDateString())}</p>
        <p>Due: ${invoice.due_date ? escapeHtml(new Date(invoice.due_date).toLocaleDateString()) : 'N/A'}</p>
        <h3>Bill To:</h3>
        <p>${escapeHtml(profile?.full_name || 'Customer')}<br>
        ${profile?.company_name ? escapeHtml(profile.company_name) + '<br>' : ''}
        ${escapeHtml(profile?.address || '')}<br>
        ${escapeHtml(profile?.email || '')}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr>
            <th style="text-align: left; padding: 12px;">Product</th>
            <th style="text-align: center; padding: 12px;">Qty</th>
            <th style="text-align: right; padding: 12px;">Unit Price</th>
            <th style="text-align: right; padding: 12px;">Total</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align: right; margin-top: 20px;">
          <p>Subtotal: $${Number(order.subtotal).toFixed(2)}</p>
          <p>Tax: $${Number(order.tax || 0).toFixed(2)}</p>
          <p><strong>Total: $${Number(order.total).toFixed(2)}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

