// Houskase shopping assistant — answers open-ended questions using Lovable AI.
// Returns a short reply + optional product slugs from the provided catalog.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CatalogProduct { name: string; slug: string; }
interface CatalogCategory { name: string; slug: string; }
interface Turn { role: "user" | "assistant"; text: string }

const BRAND_INFO = `
Houskase is an Indian D2C brand selling premium, eco-friendly home & lifestyle products —
including bamboo towels, kitchen towels, cleaning cloths, microfiber & lint-free cloths,
and multipurpose reusable cloths. Products are ultra-absorbent, washable, reusable and
quality-tested. Bulk / B2B orders are handled via the RFQ (Request for Quote) flow —
our team replies within 2–8 hours. Support: sales@houskase.com, +91 92661 29195,
Mon–Sat 9 AM–6 PM. Payments: Razorpay (UPI/Card/Netbanking) + COD in serviceable pincodes.
Standard delivery 3–7 business days across India via Ekart/Delhivery. 7-day easy return
on unused, unwashed products. Track orders from the "Track Order" page (URL: /courier-tracking) using your Order ID or AWB number.

SITE STRUCTURE (use these exact names and paths when guiding the user):
- Categories: Office, Face & Bath Towels, Sports Towel & Costumes, Cleaning Accessories
- Policy pages: Privacy Policy (/privacy-policy), Terms and Conditions (/terms-of-service), Refund and Cancellation (/return-policy), Shipping Policy (/shipping-policy)
- Support pages: Help & FAQ (/help), About Us (/about-us), Request Quote / RFQ (/rfq), Track Order (/courier-tracking), Contact Sales (/help)
Users find these in the site header/footer menus.
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const message: string = (body.message || "").toString().slice(0, 1000);
    const history: Turn[] = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const categories: CatalogCategory[] = Array.isArray(body.categories) ? body.categories.slice(0, 40) : [];
    const products: CatalogProduct[] = Array.isArray(body.products) ? body.products.slice(0, 80) : [];

    if (!message.trim()) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const catalogList = products.map((p) => `- ${p.name} [slug:${p.slug}]`).join("\n");
    const categoryList = categories.map((c) => c.name).join(", ");

    const systemPrompt = `You are Houskase's helpful shopping assistant.
Reply in the SAME language as the user (English or Hindi/Hinglish). Keep replies short,
friendly and specific — 1 to 3 sentences. Never invent products, prices, or policies.
Only recommend products from the catalog below. If the user asks about something outside
Houskase (unrelated topics, competitors, medical/legal advice, etc.), politely steer back
to shopping help.

BRAND INFO:
${BRAND_INFO}

CATEGORIES: ${categoryList || "(loading)"}

PRODUCT CATALOG (name → slug):
${catalogList || "(no products loaded)"}

OUTPUT FORMAT — respond ONLY with a compact JSON object, no markdown fences:
{"reply": "<your short answer>", "productSlugs": ["slug1","slug2"]}
Include productSlugs ONLY when the user is looking for or asking about specific products
that exist in the catalog above (max 4). Otherwise use an empty array.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.text })),
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({
        error: "ai_gateway_error",
        status: aiRes.status,
        detail: errText.slice(0, 500),
      }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    let reply = "";
    let productSlugs: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      reply = (parsed.reply || "").toString();
      if (Array.isArray(parsed.productSlugs)) {
        productSlugs = parsed.productSlugs.filter((s: unknown) => typeof s === "string").slice(0, 4);
      }
    } catch {
      reply = raw.replace(/```[a-z]*|```/gi, "").trim();
    }

    if (!reply) reply = "Sorry, I couldn't process that. Could you rephrase?";

    return new Response(JSON.stringify({ reply, productSlugs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", detail: String(err).slice(0, 300) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
