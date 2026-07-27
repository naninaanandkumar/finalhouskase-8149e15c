import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RFQNotificationType = "new_rfq" | "rfq_quoted" | "rfq_accepted" | "rfq_rejected";

interface RFQNotificationRequest {
  type?: RFQNotificationType;
  to_email?: string;
  recipient_name?: string;
  rfq_number?: string;
  rfqNumber?: string;
}

interface RFQRow {
  id: string;
  user_id: string | null;
  rfq_number: string;
  product_name: string;
  quantity: number;
  quoted_price: number | null;
  full_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
}

interface RFQItemRow {
  quantity: number;
}

const RFQ_TYPES = new Set<RFQNotificationType>([
  "new_rfq",
  "rfq_quoted",
  "rfq_accepted",
  "rfq_rejected",
]);

const BUYER_ALLOWED_TYPES = new Set<RFQNotificationType>([
  "new_rfq",
  "rfq_accepted",
  "rfq_rejected",
]);

const stripHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .trim();

const sanitizeText = (value: unknown, maxLength = 255) => stripHtml(value).slice(0, maxLength);
const sanitizeEmail = (value: unknown) => sanitizeText(value, 255).toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getEmailContent = (data: {
  type: RFQNotificationType;
  rfq_number: string;
  product_name: string;
  quantity: number;
  buyer_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  message?: string;
  item_count?: number;
  quoted_price?: number;
  recipient_name?: string;
}) => {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
    background-color: #f8f9fa;
  `;

  const cardStyles = `
    background: white;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  `;

  switch (data.type) {
    case "new_rfq":
      return {
        subject: `New RFQ Request - ${data.rfq_number}`,
        html: `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h1 style="color: #1a1a1a; margin-bottom: 24px;">New RFQ Request 📋</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">A new quote request has been submitted:</p>
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #92400e;"><strong>RFQ Number:</strong> ${data.rfq_number}</p>
                <p style="margin: 0 0 8px 0; color: #92400e;"><strong>Products:</strong> ${data.item_count ? `${data.item_count} products` : data.product_name}</p>
                <p style="margin: 0 0 8px 0; color: #92400e;"><strong>Total Quantity:</strong> ${data.quantity.toLocaleString()} units</p>
                <p style="margin: 0 0 8px 0; color: #92400e;"><strong>Buyer:</strong> ${data.buyer_name || "N/A"} (${data.company_name || "N/A"})</p>
                <p style="margin: 0 0 8px 0; color: #92400e;"><strong>Email:</strong> ${data.email || "N/A"}</p>
                <p style="margin: 0; color: #92400e;"><strong>Phone:</strong> ${data.phone || "N/A"}</p>
              </div>
              ${data.message ? `<div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;"><p style="margin: 0 0 8px 0; color: #374151;"><strong>Message:</strong></p><p style="margin: 0; color: #6b7280;">${data.message}</p></div>` : ""}
              <p style="color: #666; font-size: 14px;">Please log in to the admin panel to respond.</p>
            </div>
          </div>
        `,
      };

    case "rfq_quoted":
      return {
        subject: `Quote Ready - ${data.rfq_number}`,
        html: `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h1 style="color: #1a1a1a; margin-bottom: 24px;">Your Quote is Ready! 💰</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi ${data.recipient_name || "there"},<br><br>We've prepared a quote for your request <strong>${data.rfq_number}</strong>.</p>
              <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #166534;"><strong>Product:</strong> ${data.product_name}</p>
                <p style="margin: 0 0 8px 0; color: #166534;"><strong>Quantity:</strong> ${data.quantity.toLocaleString()} units</p>
                <p style="margin: 0; color: #166534; font-size: 18px;"><strong>Quoted Price:</strong> $${data.quoted_price?.toLocaleString() || "TBD"} per unit</p>
              </div>
              <p style="color: #666; font-size: 14px;">Log in to your dashboard to accept or discuss this quote.</p>
            </div>
          </div>
        `,
      };

    case "rfq_accepted":
      return {
        subject: `RFQ Accepted - ${data.rfq_number}`,
        html: `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h1 style="color: #1a1a1a; margin-bottom: 24px;">Quote Accepted! ✓</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">The quote for RFQ <strong>${data.rfq_number}</strong> has been accepted.</p>
            </div>
          </div>
        `,
      };

    default:
      return {
        subject: `RFQ Update - ${data.rfq_number}`,
        html: `<p>Your RFQ ${data.rfq_number} has been updated.</p>`,
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

    const { data: isAdminResult, error: adminError } = await authClient.rpc("is_admin", {
      _user_id: userId,
    });

    if (adminError) {
      throw new Error("Failed to verify permissions");
    }

    const isAdmin = Boolean(isAdminResult);
    const body: RFQNotificationRequest = await req.json();
    const notificationType = body.type && RFQ_TYPES.has(body.type) ? body.type : "new_rfq";
    const rfqNumber = sanitizeText(body.rfq_number || body.rfqNumber, 80);

    if (!rfqNumber) {
      return new Response(JSON.stringify({ error: "RFQ number is required" }), {
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

    let rfqQuery = (isAdmin ? adminClient : authClient)
      .from("rfq_requests")
      .select("id, user_id, rfq_number, product_name, quantity, quoted_price, full_name, company_name, email, phone, message")
      .eq("rfq_number", rfqNumber)
      .limit(1);

    if (!isAdmin) {
      rfqQuery = rfqQuery.eq("user_id", userId);
    }

    const { data: rfq, error: rfqError } = await rfqQuery.maybeSingle<RFQRow>();

    if (rfqError) {
      throw new Error("Failed to load RFQ");
    }

    if (!rfq) {
      return new Response(JSON.stringify({ error: "RFQ not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: rfqItems, error: itemsError } = await (isAdmin ? adminClient : authClient)
      .from("rfq_items")
      .select("quantity")
      .eq("rfq_id", rfq.id)
      .returns<RFQItemRow[]>();

    if (itemsError) {
      throw new Error("Failed to load RFQ items");
    }

    const itemCount = rfqItems?.length ?? 0;
    const totalQuantity =
      rfqItems && rfqItems.length > 0
        ? rfqItems.reduce((sum, item) => sum + Math.max(0, Math.floor(asNumber(item.quantity))), 0)
        : Math.max(0, Math.floor(asNumber(rfq.quantity)));

    const smtpFrom = Deno.env.get("SMTP_FROM");
    const smtpUser = Deno.env.get("SMTP_USER");
    const adminEmail = sanitizeEmail(smtpFrom || smtpUser || "");

    if (!adminEmail || !isValidEmail(adminEmail)) {
      throw new Error("Admin email configuration missing");
    }

    let toEmail = adminEmail;
    if (notificationType === "rfq_quoted") {
      toEmail = sanitizeEmail(body.to_email || rfq.email);
    }

    if (!isValidEmail(toEmail)) {
      return new Response(JSON.stringify({ error: "Recipient email unavailable" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const normalizedData = {
      type: notificationType,
      rfq_number: sanitizeText(rfq.rfq_number, 80),
      product_name: sanitizeText(rfq.product_name, 500),
      quantity: totalQuantity,
      buyer_name: sanitizeText(rfq.full_name, 200),
      company_name: sanitizeText(rfq.company_name, 200) || undefined,
      email: sanitizeEmail(rfq.email),
      phone: sanitizeText(rfq.phone, 40) || undefined,
      message: sanitizeText(rfq.message, 2000) || undefined,
      item_count: itemCount || undefined,
      quoted_price: rfq.quoted_price != null ? asNumber(rfq.quoted_price) : undefined,
      recipient_name: sanitizeText(body.recipient_name || rfq.full_name, 200) || undefined,
    };

    const { subject, html } = getEmailContent(normalizedData);

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT") || "465";
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
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
      from: adminEmail,
      to: toEmail,
      subject,
      content: "auto",
      html,
      encoding: "8bit",
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error sending RFQ notification:", error);
    return new Response(JSON.stringify({ error: "Failed to send RFQ notification" }), {
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
