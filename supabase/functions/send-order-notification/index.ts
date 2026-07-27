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
  const itemRows =
    req.items
      ?.map((item) => {
        const safeName = stripHtml(item.name);
        const varHtml = item.variation
          ? `<br><span style="color:#888;font-size:12px;">${stripHtml(item.variation)}</span>`
          : "";

        return `<tr>
<td style="padding:12px;border-bottom:1px solid #eee;font-size:14px;color:#333;"><strong>${safeName}</strong>${varHtml}</td>
<td style="padding:12px;border-bottom:1px solid #eee;text-align:center;font-size:14px;color:#333;">${item.quantity}</td>
<td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;color:#333;">&#x20B9;${item.unit_price.toLocaleString()}</td>
<td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600;color:#333;">&#x20B9;${item.total_price.toLocaleString()}</td>
</tr>`;
      })
      .join("") || "";

  const addr = req.shipping_address;
  const addressHtml = addr
    ? `<div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;">
<h3 style="margin:0 0 8px;font-size:14px;color:#333;font-weight:600;">Shipping Address</h3>
<p style="margin:0;font-size:13px;color:#555;line-height:1.6;">${addr.full_name || ""}${addr.company ? "<br>" + addr.company : ""}${addr.address ? "<br>" + addr.address : ""}${addr.city ? "<br>" + addr.city : ""}${addr.state ? ", " + addr.state : ""} ${addr.postal_code || ""}${addr.country ? "<br>" + addr.country : ""}${addr.phone ? "<br>Phone: " + addr.phone : ""}</p>
</div>`
    : "";

  const gstInfo = req.gst_number
    ? `<div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin:16px 0;border-left:4px solid #16a34a;">
<p style="margin:0;font-size:13px;color:#166534;"><strong>GST Invoice</strong> | GSTIN: ${req.gst_number}</p>
${req.company_name ? '<p style="margin:4px 0 0;font-size:13px;color:#166534;">Company: ' + req.company_name + "</p>" : ""}
</div>`
    : "";

  const BRAND = "Houskase";

  switch (req.type) {
    case "new_order":
      return {
        subject: `Order Placed - ${req.order_number} | ${BRAND}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;background:#f8f9fa;">
<div style="background:linear-gradient(135deg,#0f2547,#1a3a6e);padding:24px;text-align:center;">
<h1 style="color:#fff;margin:16px 0 4px;font-size:22px;">Order Placed Successfully</h1>
<p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px;">Thank you for shopping with ${BRAND}!</p>
</div>
<div style="padding:24px;">
<div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<p style="color:#333;font-size:15px;margin:0 0 4px;">Hi <strong>${req.buyer_name}</strong>,</p>
<p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;">Your order <strong style="color:#e8590c;">${req.order_number}</strong> has been received and is being processed.</p>
${gstInfo}
${req.items && req.items.length > 0 ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<thead><tr style="background:#f5f5f5;">
<th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;text-transform:uppercase;">Item</th>
<th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;text-transform:uppercase;">Qty</th>
<th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;">Price</th>
<th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;">Total</th>
</tr></thead>
<tbody>${itemRows}</tbody>
</table>` : ""}
<div style="border-top:2px solid #eee;padding-top:16px;margin-top:8px;">
${req.subtotal != null ? `<table width="100%"><tr><td style="font-size:14px;color:#666;padding:3px 0;">Subtotal</td><td style="font-size:14px;color:#333;text-align:right;padding:3px 0;">&#x20B9;${req.subtotal.toLocaleString()}</td></tr></table>` : ""}
${req.tax != null ? `<table width="100%"><tr><td style="font-size:14px;color:#666;padding:3px 0;">Tax (GST)</td><td style="font-size:14px;color:#333;text-align:right;padding:3px 0;">&#x20B9;${req.tax.toLocaleString()}</td></tr></table>` : ""}
${req.shipping != null ? `<table width="100%"><tr><td style="font-size:14px;color:#666;padding:3px 0;">Shipping</td><td style="font-size:14px;color:#333;text-align:right;padding:3px 0;">${req.shipping === 0 ? "Free" : "&#x20B9;" + req.shipping.toLocaleString()}</td></tr></table>` : ""}
<table width="100%" style="border-top:1px solid #eee;margin-top:8px;"><tr><td style="font-size:18px;font-weight:700;color:#333;padding:12px 0 0;">Total</td><td style="font-size:18px;font-weight:700;color:#e8590c;text-align:right;padding:12px 0 0;">&#x20B9;${req.order_total.toLocaleString()}</td></tr></table>
</div>
${addressHtml}
</div>
<p style="text-align:center;color:#888;font-size:12px;margin-top:20px;">We'll email you again when your order ships.</p>
<div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
<p style="color:#999;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
</div>
</div>
</div>`,
      };

    case "order_confirmed":
      return {
        subject: `Order Confirmed - ${req.order_number} | ${BRAND}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;padding:24px;">
<h1 style="color:#0f2547;">Order Confirmed</h1>
<p>Hi ${req.buyer_name}, great news! Your order <strong>${req.order_number}</strong> has been confirmed and is being prepared for shipment.</p>
<p><strong>Total:</strong> &#x20B9;${req.order_total.toLocaleString()}</p>
${addressHtml}
<p style="color:#888;font-size:12px;">&copy; ${new Date().getFullYear()} ${BRAND}</p></div>`,
      };

    case "order_shipped":
      return {
        subject: `Your Order is on its way! - ${req.order_number} | ${BRAND}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;padding:24px;">
<h1 style="color:#0f2547;">Your order has shipped!</h1>
<p>Hi ${req.buyer_name}, your order <strong>${req.order_number}</strong> is on its way.</p>
${req.tracking_number ? `<div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;color:#166534;"><strong>Tracking Number:</strong> ${req.tracking_number}</p></div>` : ""}
<p style="color:#888;font-size:12px;">&copy; ${new Date().getFullYear()} ${BRAND}</p></div>`,
      };

    case "order_delivered":
      return {
        subject: `Order Delivered - ${req.order_number} | ${BRAND}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;padding:24px;">
<h1 style="color:#16a34a;">Order Delivered 🎉</h1>
<p>Hi ${req.buyer_name}, your order <strong>${req.order_number}</strong> has been delivered. We hope you love your ${BRAND} essentials!</p>
<p>Thank you for choosing ${BRAND}.</p>
<p style="color:#888;font-size:12px;">&copy; ${new Date().getFullYear()} ${BRAND}</p></div>`,
      };

    case "order_cancelled":
      return {
        subject: `Order Cancelled - ${req.order_number} | ${BRAND}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;padding:24px;">
<h1 style="color:#dc2626;">Order Cancelled</h1>
<p>Hi ${req.buyer_name}, your order <strong>${req.order_number}</strong> has been cancelled.</p>
<p>If a payment was made, any refund will be processed to the original payment method within 5–7 business days.</p>
<p>If this was a mistake, please reply to this email or contact us at <a href="mailto:sales@houskase.com">sales@houskase.com</a>.</p>
<p style="color:#888;font-size:12px;">&copy; ${new Date().getFullYear()} ${BRAND}</p></div>`,
      };

    case "payment_received":
      return {
        subject: `Payment Received - ${req.order_number} | ${BRAND}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;padding:24px;">
<h1 style="color:#16a34a;">Payment Received</h1>
<p>Hi ${req.buyer_name}, we've received your payment of <strong>&#x20B9;${req.order_total.toLocaleString()}</strong> for order <strong>${req.order_number}</strong>. Thank you!</p>
<p style="color:#888;font-size:12px;">&copy; ${new Date().getFullYear()} ${BRAND}</p></div>`,
      };

    default:
      return {
        subject: `Order Update - ${req.order_number} | ${BRAND}`,
        html: `<p>Your order ${req.order_number} has been updated.</p>`,
      };
  }
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

    let recipientEmail = profileEmail || signedInEmail;
    if (notificationType !== "new_order") {
      recipientEmail = sanitizeEmail(body.to_email || profileEmail);
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
