export interface InvoicePartyContext {
  shippingAddress?: any;
  billingAddress?: any;
  profile?: any;
  userEmail?: string | null;
}

interface InvoiceOrderItemInput {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  variation_details?: string | null;
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const calculateOrderDiscount = (params: {
  subtotal: number | string;
  tax?: number | string | null;
  shipping?: number | string | null;
  total: number | string;
}): number => {
  const subtotal = toNumber(params.subtotal);
  const tax = toNumber(params.tax || 0);
  const shipping = toNumber(params.shipping || 0);
  const total = toNumber(params.total);

  return Math.max(round2(subtotal + tax + shipping - total), 0);
};

export const getInvoicePartyData = ({ shippingAddress, billingAddress, profile, userEmail }: InvoicePartyContext) => {
  const shipping = shippingAddress || {};
  const billing = billingAddress || {};
  const buyerProfile = profile || {};

  const fallbackName = shipping.full_name || billing.full_name || buyerProfile.full_name || "Customer";
  const billingCompany = billing.company_name || billing.company || shipping.company || buyerProfile.company_name || "";
  const billingEmail = billing.email || buyerProfile.email || userEmail || undefined;
  const billingPhone = billing.phone || shipping.phone || buyerProfile.phone || undefined;
  const billingGstin = billing.gst_number || buyerProfile.gst_number || undefined;

  const normalizedBillingAddress = {
    full_name: billing.full_name || fallbackName,
    company_name: billingCompany || undefined,
    address: billing.address || shipping.address || buyerProfile.address || undefined,
    city: billing.city || shipping.city || buyerProfile.city || undefined,
    state: billing.state || shipping.state || buyerProfile.state || undefined,
    postal_code: billing.postal_code || shipping.postal_code || buyerProfile.postal_code || undefined,
    country: billing.country || shipping.country || buyerProfile.country || undefined,
    phone: billingPhone,
    email: billingEmail,
    gst_number: billingGstin,
  };

  const normalizedShippingAddress = {
    full_name: shipping.full_name || fallbackName,
    address: shipping.address || billing.address || buyerProfile.address || undefined,
    city: shipping.city || billing.city || buyerProfile.city || undefined,
    state: shipping.state || billing.state || buyerProfile.state || undefined,
    postal_code: shipping.postal_code || billing.postal_code || buyerProfile.postal_code || undefined,
    country: shipping.country || billing.country || buyerProfile.country || undefined,
    phone: shipping.phone || billingPhone,
    email: shipping.email || billingEmail,
  };

  return {
    buyerName: fallbackName,
    billToName: billingCompany || fallbackName,
    shipToName: normalizedShippingAddress.full_name || fallbackName,
    buyerEmail: billingEmail,
    buyerPhone: billingPhone,
    companyName: billingCompany || undefined,
    gstNumber: billingGstin,
    billingAddress: normalizedBillingAddress,
    shippingAddress: normalizedShippingAddress,
  };
};

export const buildInvoiceItems = (
  items: InvoiceOrderItemInput[],
  hsnByProductId: Map<string, string>,
  subtotal: number,
  discountTotal: number,
) => {
  const safeSubtotal = subtotal > 0 ? subtotal : items.reduce((sum, item) => sum + toNumber(item.total_price), 0);

  let allocatedDiscount = 0;
  return items.map((item, index) => {
    const itemTotal = toNumber(item.total_price);
    const proportionalDiscount = safeSubtotal > 0 ? round2((itemTotal / safeSubtotal) * discountTotal) : 0;
    const isLastItem = index === items.length - 1;
    const itemDiscount = discountTotal > 0
      ? (isLastItem ? Math.max(round2(discountTotal - allocatedDiscount), 0) : proportionalDiscount)
      : 0;

    allocatedDiscount = round2(allocatedDiscount + itemDiscount);

    return {
      name: item.product_name,
      quantity: item.quantity,
      unit_price: toNumber(item.unit_price),
      total_price: itemTotal,
      variation: item.variation_details || undefined,
      hsn: item.product_id ? hsnByProductId.get(item.product_id) || undefined : undefined,
      discount: itemDiscount,
    };
  });
};
