import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (per IP, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max requests
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, phone, subject, message, honeypot } = await req.json();

    // Honeypot check
    if (honeypot) {
      // Silently accept but don't send - bot detected
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Name, email, and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");
    const SMTP_FROM = Deno.env.get("SMTP_FROM") || SMTP_USER;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("SMTP not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isResend = SMTP_HOST.includes("resend");

    // Sanitize inputs for email body
    const stripHtml = (str: string) => str.replace(/<[^>]*>/g, "");
    const safeName = stripHtml(String(name).slice(0, 100));
    const safeEmail = String(email).slice(0, 255);
    const safePhone = stripHtml(String(phone || "").slice(0, 20));
    const safeSubject = stripHtml(String(subject || "").slice(0, 200));
    const safeMessage = stripHtml(String(message).slice(0, 2000));

    const SALES_EMAIL = "sales@houskase.com";

    if (isResend) {
      const apiKey = SMTP_PASS;

      // 1. Send inquiry to sales team
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: SMTP_FROM,
          to: SALES_EMAIL,
          reply_to: safeEmail,
          subject: safeSubject ? `Contact Form: ${safeSubject}` : `Contact Form: ${safeName}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <table style="border-collapse:collapse;width:100%;max-width:500px;">
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:8px;border:1px solid #ddd;">${safeName}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${safeEmail}</td></tr>
              ${safePhone ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Phone</td><td style="padding:8px;border:1px solid #ddd;">${safePhone}</td></tr>` : ""}
              ${safeSubject ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Subject</td><td style="padding:8px;border:1px solid #ddd;">${safeSubject}</td></tr>` : ""}
            </table>
            <h3>Message:</h3>
            <p style="white-space:pre-wrap;">${safeMessage}</p>
          `,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Resend error (sales):", errText);
        return new Response(JSON.stringify({ error: "Failed to send email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Send auto-reply acknowledgement to the submitter
      try {
        const ackRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: SMTP_FROM,
            to: safeEmail,
            reply_to: SALES_EMAIL,
            subject: "We've received your inquiry — Houskase",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
                <h2 style="color:#111;margin:0 0 12px;">Hi ${safeName},</h2>
                <p style="font-size:15px;line-height:1.6;">Thank you for reaching out to <strong>Houskase</strong>. We've received your inquiry and our team will contact you soon regarding this.</p>
                <p style="font-size:15px;line-height:1.6;">Our typical response time is <strong>2–8 hours</strong> during business hours (Mon–Sat, 9 AM–6 PM IST).</p>
                <div style="margin:20px 0;padding:14px 16px;background:#f6f6f6;border-radius:8px;border-left:3px solid #111;">
                  <p style="margin:0 0 6px;font-size:13px;color:#666;"><strong>Your message:</strong></p>
                  ${safeSubject ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Subject:</strong> ${safeSubject}</p>` : ""}
                  <p style="margin:0;font-size:14px;white-space:pre-wrap;">${safeMessage}</p>
                </div>
                <p style="font-size:14px;line-height:1.6;">For urgent queries, call us at <a href="tel:+919266129195" style="color:#111;">+91 92661 29195</a> or reply to this email.</p>
                <p style="font-size:14px;line-height:1.6;margin-top:24px;">Warm regards,<br/><strong>Team Houskase</strong><br/><a href="mailto:sales@houskase.com" style="color:#111;">sales@houskase.com</a></p>
              </div>
            `,
          }),
        });
        if (!ackRes.ok) {
          const ackErr = await ackRes.text();
          console.warn("Auto-reply failed:", ackErr);
        }
      } catch (ackErr) {
        console.warn("Auto-reply exception:", ackErr);
      }
    } else {
      console.log("Contact form submission:", { name: safeName, email: safeEmail, phone: safePhone, subject: safeSubject, message: safeMessage });
    }

    // Persist inquiry + create admin notification
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;
        await fetch(`${SUPABASE_URL}/rest/v1/contact_inquiries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            name: safeName,
            email: safeEmail,
            phone: safePhone || null,
            subject: safeSubject || null,
            message: safeMessage,
            status: "new",
            ip_address: clientIp,
            user_agent: userAgent,
          }),
        });

        await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            title: "New Contact Inquiry",
            message: `${safeName} sent a message: ${safeSubject || safeMessage.slice(0, 80)}`,
            type: "contact_inquiry",
            is_read: false,
          }),
        });
      }
    } catch (notifErr) {
      console.warn("Failed to persist inquiry:", notifErr);
    }


    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
