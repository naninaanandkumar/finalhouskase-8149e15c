import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type OrderNotificationType =
  | "new_order"
  | "order_confirmed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "order_on_hold"
  | "order_failed"
  | "payment_failed"
  | "payment_received";

interface ShippingAddress {
  full_name?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
}

interface OrderNotificationRequest {
  type?: OrderNotificationType;
  order_number?: string;
  to_email?: string;
  tracking_number?: string;
  invoice_number?: string;
}

interface OrderRow {
  id: string;
  user_id: string | null;
  order_number: string;
  subtotal: number;
  tax: number | null;
  shipping: number | null;
  total: number;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
}

interface OrderItemRow {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variation_details: string | null;
}

interface ProfileRow {
  email: string;
  full_name: string | null;
}

interface EmailOrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variation?: string;
}

interface EmailPayload {
  type: OrderNotificationType;
  to_email: string;
  buyer_name: string;
  order_number: string;
  order_total: number;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  items?: EmailOrderItem[];
  items_count?: number;
  tracking_number?: string;
  gst_number?: string;
  company_name?: string;
  invoice_number?: string;
  shipping_address?: ShippingAddress;
}

const ORDER_TYPES = new Set<OrderNotificationType>([
  "new_order",
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "order_on_hold",
  "order_failed",
  "payment_failed",
  "payment_received",
]);

const BUYER_ALLOWED_TYPES = new Set<OrderNotificationType>(["new_order", "order_cancelled"]);

const ADMIN_NOTIFY_EMAIL = "sales@houskase.com";

const stripHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .trim();

const sanitizeEmail = (value: unknown) => stripHtml(value).slice(0, 255).toLowerCase();

const sanitizeText = (value: unknown, maxLength = 255) => stripHtml(value).slice(0, maxLength);

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseShippingAddress = (value: Record<string, unknown> | null): ShippingAddress | undefined => {
  if (!value || typeof value !== "object") return undefined;

  return {
    full_name: sanitizeText(value.full_name, 200) || undefined,
    company: sanitizeText(value.company, 200) || undefined,
    address: sanitizeText(value.address, 300) || undefined,
    city: sanitizeText(value.city, 100) || undefined,
    state: sanitizeText(value.state, 100) || undefined,
    postal_code: sanitizeText(value.postal_code, 40) || undefined,
    country: sanitizeText(value.country, 100) || undefined,
    phone: sanitizeText(value.phone, 40) || undefined,
  };
};

const getBillingDetails = (value: Record<string, unknown> | null) => {
  if (!value || typeof value !== "object") {
    return { gst_number: undefined, company_name: undefined };
  }

  return {
    gst_number: sanitizeText(value.gst_number, 40) || undefined,
    company_name: sanitizeText(value.company_name, 200) || undefined,
  };
};

const getEmailContent = (req: EmailPayload) => {
  const BRAND = "Houskase";
  const LOGO_URL = "https://finalhouskase.lovable.app/logo.png"; // Replace with your actual logo URL

  const itemRows =
    req.items
      ?.map((item) => {
        const safeName = stripHtml(item.name);
        const varHtml = item.variation
          ? `<br><span style="color:#666;font-size:12px;">${stripHtml(item.variation)}</span>`
          : "";

        return `<tr>
<td style="padding:15px 0;border-bottom:1px solid #eee;">
  <div style="font-size:14px;color:#333;font-weight:500;">${safeName}</div>
  ${varHtml}
  <div style="font-size:12px;color:#888;margin-top:4px;">Qty: ${item.quantity}</div>
</td>
<td style="padding:15px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;color:#333;font-weight:600;">&#x20B9;${item.total_price.toLocaleString()}</td>
</tr>`;
      })
      .join("") || "";

  const addr = req.shipping_address;
  const addressHtml = addr
    ? `<div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;">
<h3 style="margin:0 0 10px;font-size:14px;color:#333;text-transform:uppercase;letter-spacing:1px;">Shipping Address</h3>
<p style="margin:0;font-size:14px;color:#666;line-height:1.6;">
  <strong>${addr.full_name || ""}</strong><br>
  ${addr.address || ""}<br>
  ${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}<br>
  ${addr.country || ""}<br>
  ${addr.phone ? "Phone: " + addr.phone : ""}
</p>
</div>`
    : "";

  let statusTitle = "Order Update";
  let statusMessage = "Your order has been updated.";
  let statusColor = "#333";
  let iconHtml = "";

  switch (req.type) {
    case "new_order":
    case "order_confirmed":
      statusTitle = "Woohoo! Your order is confirmed.";
      statusMessage = "We'll start working on this right away. We'll email you as soon as it ships.";
      statusColor = "#1a1a1a";
      iconHtml = `<div style="text-align:center;margin-bottom:20px;"><span style="font-size:40px;">✨</span></div>`;
      break;
    case "order_on_hold":
      statusTitle = "Your order is on hold.";
      statusMessage = "There is a slight delay with your order. We'll update you as soon as possible.";
      statusColor = "#f59e0b";
      break;
    case "order_shipped":
      statusTitle = "Your order is on its way!";
      statusMessage = "Great news! Your package has been handed over to our courier partner.";
      statusColor = "#3b82f6";
      break;
    case "order_delivered":
      statusTitle = "Your order has been delivered!";
      statusMessage = "We hope you love your new Houskase products. Thank you for shopping with us!";
      statusColor = "#10b981";
      break;
    case "order_cancelled":
      statusTitle = "Order Cancelled.";
      statusMessage = "Your order has been cancelled. If payment was made, a refund will be processed shortly.";
      statusColor = "#ef4444";
      break;
    case "order_failed":
    case "payment_failed":
      statusTitle = "Payment Failed.";
      statusMessage = "Unfortunately, we couldn't process your payment. Please try again or use a different method.";
      statusColor = "#ef4444";
      break;
    case "payment_received":
      statusTitle = "Payment Received.";
      statusMessage = "We've successfully received your payment. Your order is moving to the next step.";
      statusColor = "#10b981";
      break;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; }
  .header { text-align: center; margin-bottom: 40px; }
  .status-section { text-align: center; margin-bottom: 40px; }
  .status-title { font-size: 24px; font-weight: 700; color: ${statusColor}; margin-bottom: 10px; }
  .status-message { font-size: 16px; color: #666; margin-bottom: 30px; }
  .btn { display: inline-block; padding: 12px 30px; background: #1a1a1a; color: #ffffff !important; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 14px; }
  .order-details { margin-top: 40px; }
  .detail-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  .total-row { display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #eee; margin-top: 10px; font-size: 18px; font-weight: 700; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
</style>
</head>
<body>
  <div style="padding: 20px 0;">
    <div class="container">
      <div class="header">
        <h1 style="color:#e67e22; font-size: 32px; margin: 0; font-family: serif; letter-spacing: 1px;">${BRAND}</h1>
      </div>

      <div class="status-section">
        ${iconHtml}
        <h2 class="status-title">${statusTitle}</h2>
        <p class="status-message">${statusMessage}</p>
        <a href="https://finalhouskase.lovable.app/account/orders" class="btn">View your order</a>
      </div>

      <div class="order-details">
        <h3 style="font-size: 18px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Order details</h3>
        <p style="font-size: 13px; color: #888; margin-bottom: 20px;">Confirmation number: ${req.order_number}</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          ${itemRows}
        </table>

        <div style="margin-top: 20px;">
          <div class="detail-row"><span>Subtotal</span><span>&#x20B9;${(req.subtotal || 0).toLocaleString()}</span></div>
          ${req.tax ? `<div class="detail-row"><span>Sales tax</span><span>&#x20B9;${req.tax.toLocaleString()}</span></div>` : ""}
          <div class="detail-row"><span>Shipping</span><span>${req.shipping === 0 ? "FREE" : "&#x20B9;" + (req.shipping || 0).toLocaleString()}</span></div>
          <div class="total-row"><span>Total</span><span>&#x20B9;${req.order_total.toLocaleString()}</span></div>
        </div>

        ${addressHtml}

        ${req.tracking_number ? `
        <div style="margin-top: 20px; padding: 15px; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>Tracking Number:</strong> ${req.tracking_number}</p>
        </div>` : ""}
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
        <p>If you have any questions, contact us at <a href="mailto:sales@houskase.com" style="color:#999;">sales@houskase.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: `${statusTitle} - ${req.order_number} | ${BRAND}`,
    html,
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let client: SMTPClient | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Backend configuration missing");
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: claimsData, error: claimsError }, { data: userData, error: userError }] = await Promise.all([
      authClient.auth.getClaims(token),
      authClient.auth.getUser(token),
    ]);

    if (claimsError || !claimsData?.claims?.sub || userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;
    const signedInEmail = sanitizeEmail(userData.user.email ?? "");

    const { data: isAdminResult, error: adminError } = await authClient.rpc("is_admin", {
      _user_id: userId,
    });

    if (adminError) {
      throw new Error("Failed to verify permissions");
    }

    const isAdmin = Boolean(isAdminResult);
    const body: OrderNotificationRequest = await req.json();
    const notificationType = body.type && ORDER_TYPES.has(body.type) ? body.type : "new_order";
    const orderNumber = sanitizeText(body.order_number, 80);

    if (!orderNumber) {
      return new Response(JSON.stringify({ error: "Order number is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isAdmin && !BUYER_ALLOWED_TYPES.has(notificationType)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let orderQuery = (isAdmin ? adminClient : authClient)
      .from("orders")
      .select("id, user_id, order_number, subtotal, tax, shipping, total, shipping_address, billing_address")
      .eq("order_number", orderNumber)
      .limit(1);

    if (!isAdmin) {
      orderQuery = orderQuery.eq("user_id", userId);
    }

    const { data: order, error: orderError } = await orderQuery.maybeSingle<OrderRow>();

    if (orderError) {
      throw new Error("Failed to load order");
    }

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const [{ data: orderItems, error: itemsError }, { data: profile, error: profileError }] = await Promise.all([
      (isAdmin ? adminClient : authClient)
        .from("order_items")
        .select("product_name, quantity, unit_price, total_price, variation_details")
        .eq("order_id", order.id)
        .returns<OrderItemRow[]>(),
      order.user_id
        ? adminClient
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", order.user_id)
            .maybeSingle<ProfileRow>()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (itemsError) {
      throw new Error("Failed to load order items");
    }

    if (profileError) {
      throw new Error("Failed to load order profile");
    }

    const shippingAddress = parseShippingAddress(order.shipping_address);
    const billingDetails = getBillingDetails(order.billing_address);
    const buyerName =
      shippingAddress?.full_name || sanitizeText(profile?.full_name, 200) || "Customer";
    const profileEmail = sanitizeEmail(profile?.email ?? "");

    // Buyer-initiated notifications ALWAYS go to the order owner's own address.
    // Only admins may override the recipient (e.g. resending to a support inbox).
    let recipientEmail = profileEmail || signedInEmail;
    if (isAdmin && body.to_email) {
      recipientEmail = sanitizeEmail(body.to_email);
    }

    if (!isValidEmail(recipientEmail)) {
      return new Response(JSON.stringify({ error: "Recipient email unavailable" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailPayload: EmailPayload = {
      type: notificationType,
      to_email: recipientEmail,
      buyer_name: buyerName,
      order_number: order.order_number,
      order_total: asNumber(order.total),
      subtotal: asNumber(order.subtotal),
      tax: order.tax != null ? asNumber(order.tax) : undefined,
      shipping: order.shipping != null ? asNumber(order.shipping) : undefined,
      items_count: orderItems?.length ?? 0,
      tracking_number: sanitizeText(body.tracking_number, 100) || undefined,
      invoice_number: sanitizeText(body.invoice_number, 100) || undefined,
      gst_number: billingDetails.gst_number,
      company_name: billingDetails.company_name,
      shipping_address: shippingAddress,
      items: (orderItems ?? []).map((item) => ({
        name: sanitizeText(item.product_name, 200),
        quantity: Math.max(0, Math.floor(asNumber(item.quantity))),
        unit_price: asNumber(item.unit_price),
        total_price: asNumber(item.total_price),
        variation: sanitizeText(item.variation_details, 200) || undefined,
      })),
    };

    const { subject, html } = getEmailContent(emailPayload);

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT") || "465";
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const fromEmail = Deno.env.get("SMTP_FROM") || smtpUser || "";

    if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
      throw new Error("Email configuration missing");
    }

    client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: parseInt(smtpPort, 10),
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
      content: "auto",
      encoding: "8bit",
    });

    // Send admin copy for EVERY order event
    const adminEmail = ADMIN_NOTIFY_EMAIL;
    if (adminEmail && adminEmail.toLowerCase() !== recipientEmail.toLowerCase()) {
      const eventLabel: Record<OrderNotificationType, string> = {
        new_order: "🛒 New Order Placed",
        order_confirmed: "✅ Order Confirmed",
        order_shipped: "📦 Order Shipped",
        order_delivered: "🎉 Order Delivered",
        order_cancelled: "❌ Order Cancelled",
        order_on_hold: "⏳ Order On Hold",
        order_failed: "⚠️ Order Failed",
        payment_failed: "❌ Payment Failed",
        payment_received: "💰 Payment Received",
      };
      const adminSubject = `[Admin] ${eventLabel[notificationType]} - ${emailPayload.order_number}`;
      const adminHtml = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
<div style="background:linear-gradient(135deg,#0f2547,#1a3a6e);padding:20px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:20px;">${eventLabel[notificationType]}</h1>
</div>
<div style="padding:24px;background:#fff;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#555;width:140px;">Order Number</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;">${emailPayload.order_number}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#555;">Customer</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;">${buyerName}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#555;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;">${recipientEmail}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#555;">Items</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;">${emailPayload.items_count || 0} items</td></tr>
<tr><td style="padding:8px 12px;font-weight:700;color:#333;font-size:16px;">Total</td><td style="padding:8px 12px;font-weight:700;color:#e8590c;font-size:16px;">₹${emailPayload.order_total.toLocaleString()}</td></tr>
</table>
${emailPayload.tracking_number ? `<p style="margin:12px 0 0;font-size:13px;">Tracking: <strong>${emailPayload.tracking_number}</strong></p>` : ""}
${emailPayload.gst_number ? `<p style="margin:12px 0 0;font-size:13px;color:#166534;background:#f0fdf4;padding:8px 12px;border-radius:6px;">GST: ${emailPayload.gst_number}${emailPayload.company_name ? " | " + emailPayload.company_name : ""}</p>` : ""}
</div></div>`;

      await client.send({
        from: fromEmail,
        to: adminEmail,
        subject: adminSubject,
        html: adminHtml,
        content: "auto",
        encoding: "8bit",
      });
    }

    if (notificationType === "new_order") {
      try {
        const { data: admins } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: { user_id: string }) => ({
            user_id: admin.user_id,
            title: "New Order Received",
            message: `Order ${emailPayload.order_number} placed by ${buyerName} - ₹${emailPayload.order_total.toLocaleString()}`,
            type: "order",
            data: { order_number: emailPayload.order_number },
          }));

          await adminClient.from("notifications").insert(notifications);
        }
      } catch (notificationError) {
        console.error("Failed to create admin notification:", notificationError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error sending order notification:", error);
    return new Response(JSON.stringify({ error: "Failed to send order notification" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error("Failed to close SMTP client:", closeError);
      }
    }
  }
});
