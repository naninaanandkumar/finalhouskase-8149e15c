import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

const json = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new HttpError(500, "Server configuration error");
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Unauthorized");
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();
    if (!accessToken) {
      throw new HttpError(401, "Unauthorized");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(accessToken);

    if (authError || !user) {
      throw new HttpError(401, "Invalid authentication");
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Invalid request body");
    }

    const { items, shipping_address, billing_address, notes, buyer_type } = body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpError(400, "No items provided");
    }

    const invalidItem = items.find(
      (item: any) => !item?.product_id || !Number.isFinite(Number(item?.quantity)) || Number(item.quantity) <= 0,
    );

    if (invalidItem) {
      throw new HttpError(400, "Invalid cart items in request");
    }

    // Get user's role to determine pricing securely server-side
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      console.error("Role fetch error:", roleError);
      throw new HttpError(500, "Failed to verify buyer role");
    }

    const userRole = roleData?.find((r: any) => r.role === "shop" || r.role === "retail")?.role || "retail";
    const effectiveBuyerType = buyer_type === "shop" && userRole === "shop" ? "shop" : "retail";

    const productIds = [...new Set(items.map((item: any) => item.product_id))];
    const variationIds = [...new Set(items.filter((item: any) => item.variation_id).map((item: any) => item.variation_id))];

    const { data: products, error: productsError } = await adminClient
      .from("products")
      .select("id, name, shop_price, retail_price, guest_price, shop_moq, retail_moq, gst_percentage, gst_enabled, gst_pricing_mode, is_active")
      .in("id", productIds);

    if (productsError) {
      console.error("Product fetch error:", productsError);
      throw new HttpError(500, "Failed to fetch product data");
    }

    let variations: any[] = [];
    if (variationIds.length > 0) {
      const { data: variationData, error: variationError } = await adminClient
        .from("product_variations")
        .select("id, product_id, shop_price, retail_price, guest_price, shop_moq, retail_moq, size, color, is_active")
        .in("id", variationIds);

      if (variationError) {
        console.error("Variation fetch error:", variationError);
        throw new HttpError(500, "Failed to fetch variation data");
      }

      variations = variationData || [];
    }

    let subtotal = 0;
    let tax = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = products?.find((p: any) => p.id === item.product_id);
      if (!product || !product.is_active) {
        throw new HttpError(400, "One or more products are unavailable");
      }

      let unitPrice: number;
      let variationDetails: string | null = null;
      let moq = effectiveBuyerType === "shop" ? Number(product.shop_moq || 1) : Number(product.retail_moq || 1);

      if (item.variation_id) {
        const variation = variations.find((v: any) => v.id === item.variation_id);
        if (!variation || !variation.is_active || variation.product_id !== item.product_id) {
          throw new HttpError(400, "One or more selected variants are unavailable");
        }

        unitPrice = Number(effectiveBuyerType === "shop" ? variation.shop_price : variation.retail_price);

        const variationMoq = effectiveBuyerType === "shop" ? variation.shop_moq : variation.retail_moq;
        if (typeof variationMoq === "number" && variationMoq > 0) {
          moq = variationMoq;
        }

        variationDetails = [variation.size, variation.color].filter(Boolean).join(" / ") || null;
      } else {
        unitPrice = Number(effectiveBuyerType === "shop" ? product.shop_price : product.retail_price);
      }

      const quantity = Math.max(1, Math.floor(Number(item.quantity)));
      if (quantity < moq) {
        throw new HttpError(400, `Minimum order quantity for ${product.name} is ${moq}`);
      }

      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;
      const gstPct = Number(product.gst_percentage ?? 0);
      if (product.gst_enabled !== false && gstPct > 0) {
        tax += product.gst_pricing_mode === "inclusive"
          ? totalPrice * (gstPct / (100 + gstPct))
          : totalPrice * (gstPct / 100);
      }

      orderItems.push({
        product_id: item.product_id,
        variation_id: item.variation_id || null,
        product_name: product.name,
        variation_details: variationDetails,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    const shippingCost = subtotal > 500 ? 0 : 25;
    let discount = 0;
    let validatedCouponId: string | null = null;

    if (body.coupon_id) {
      const { data: coupon, error: couponFetchError } = await adminClient
        .from("coupons")
        .select("id, is_active, expires_at, starts_at, usage_limit, used_count, min_order_amount, discount_type, discount_value, max_discount_amount")
        .eq("id", body.coupon_id)
        .maybeSingle();

      if (couponFetchError) {
        console.error("Coupon fetch error:", couponFetchError);
        throw new HttpError(500, "Failed to validate coupon");
      }

      const now = new Date();
      const expiresAt = coupon?.expires_at ? new Date(coupon.expires_at) : null;
      const startsAt = coupon?.starts_at ? new Date(coupon.starts_at) : null;
      const usageLimit = coupon?.usage_limit ?? null;
      const usedCount = Number(coupon?.used_count ?? 0);
      const minOrder = Number(coupon?.min_order_amount ?? 0);

      const valid =
        coupon &&
        coupon.is_active &&
        (!expiresAt || expiresAt > now) &&
        (!startsAt || startsAt <= now) &&
        (usageLimit === null || usedCount < usageLimit) &&
        (!minOrder || subtotal >= minOrder);

      if (!valid) {
        throw new HttpError(400, "Coupon is not valid for this order");
      }

      const value = Number(coupon!.discount_value);
      let raw = coupon!.discount_type === "percentage" ? (subtotal * value) / 100 : value;
      if (coupon!.max_discount_amount && raw > Number(coupon!.max_discount_amount)) {
        raw = Number(coupon!.max_discount_amount);
      }
      discount = Math.min(Math.round(raw * 100) / 100, subtotal);
      validatedCouponId = coupon!.id;
    }

    const exclusiveTax = (items || []).reduce((sum: number, item: any) => {
      const product = products?.find((p: any) => p.id === item.product_id);
      const gstPct = Number(product?.gst_percentage ?? 0);
      if (!product || product.gst_enabled === false || product.gst_pricing_mode === "inclusive" || gstPct <= 0) return sum;
      const oi = orderItems.find((x: any) => x.product_id === item.product_id && (x.variation_id || null) === (item.variation_id || null));
      return sum + Number(oi?.total_price || 0) * (gstPct / 100);
    }, 0);
    const total = Math.max(0, subtotal - discount) + exclusiveTax + shippingCost;

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        buyer_type: effectiveBuyerType,
        subtotal,
        tax,
        shipping: shippingCost,
        total,
        status: "pending",
        shipping_address: shipping_address || null,
        billing_address: billing_address || null,
        notes: notes || null,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
      throw new HttpError(500, "Failed to create order");
    }

    const { error: itemsError } = await adminClient.from("order_items").insert(
      orderItems.map((orderItem: any) => ({
        ...orderItem,
        order_id: order.id,
      })),
    );

    if (itemsError) {
      console.error("Order items insert error:", itemsError);
      throw new HttpError(500, "Failed to create order items");
    }

    const { error: invoiceError } = await adminClient.from("invoices").insert({
      order_id: order.id,
      user_id: user.id,
      amount: subtotal,
      tax,
      total,
    });

    if (invoiceError) {
      console.error("Invoice creation failed:", invoiceError);
    }

    if (validatedCouponId) {
      const { error: couponError } = await adminClient.rpc("increment_coupon_usage" as any, {
        _coupon_id: validatedCouponId,
      });

      if (couponError) {
        console.warn("Coupon usage increment failed:", couponError);
      }
    }

    return json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total,
        subtotal,
        tax,
        shipping: shippingCost,
        discount,
      },
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.status);
    }

    console.error("Create order error:", error);
    return json({ error: "Failed to place order. Please try again." }, 500);
  }
});
