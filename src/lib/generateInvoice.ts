import { jsPDF } from "jspdf";
import houskaseLogo from "@/assets/houskase-logo.jpg.asset.json";

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variation?: string;
  hsn?: string;
  discount?: number;
}

interface InvoiceData {
  invoice_number: string;
  order_number: string;
  date: string;
  buyer_name: string;
  bill_to_name?: string;
  ship_to_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  company_name?: string;
  gst_number?: string;
  shipping_address?: {
    full_name?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  billing_address?: {
    full_name?: string;
    company_name?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  gst_percentage?: number;
  shipping: number;
  total: number;
  discount_total?: number;
  // Store info from settings
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_email?: string;
  store_gstin?: string;
  store_logo_url?: string;
}

function formatINR(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  // Method 1: Image element with crossOrigin (works best for Supabase storage)
  try {
    const result = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      // Add cache-bust to avoid stale CORS preflight
      img.src = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
    });
    if (result) return result;
  } catch { /* continue to fallback */ }

  // Method 2: fetch with no-cors mode and blob
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => reject(new Error("Failed to read image dimensions"));
    img.src = base64;
  });
}

export async function generateGSTInvoice(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 14;
  const contentW = pw - 2 * m;
  let y = 0;

  const brandColor: [number, number, number] = [30, 82, 130];

  const storeName = data.store_name || "Store";
  const storeGSTIN = data.store_gstin || "";
  const storeAddress = data.store_address || "";
  const storePhone = data.store_phone || "";
  const storeEmail = data.store_email || "";
  const discountTotal = Math.max(Number(data.discount_total || 0), 0);

  // ─── HEADER BAR ───
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(0, 0, pw, 6, "F");

  y = 10;

  // Logo (always brand logo - falls back to Houskase logo if store setting missing)
  let logoWidth = 0;
  const logoUrl = data.store_logo_url || houskaseLogo.url;
  const logoBase64 = await loadImageAsBase64(logoUrl);
  if (logoBase64) {
    try {
      const { width: rawW, height: rawH } = await getImageDimensions(logoBase64);
      const maxLogoW = 40;
      const maxLogoH = 22;
      const ratio = rawW > 0 && rawH > 0 ? Math.min(maxLogoW / rawW, maxLogoH / rawH) : 1;
      const drawW = rawW > 0 ? rawW * ratio : 30;
      const drawH = rawH > 0 ? rawH * ratio : 15;
      const drawY = y + (22 - drawH) / 2;

      doc.addImage(logoBase64, "PNG", m, drawY, drawW, drawH);
      logoWidth = drawW + 4;
    } catch {
      /* skip logo */
    }
  }


  // "Original Copy" right side
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Original Copy", pw - m, y + 4, { align: "right" });

  // Invoice number
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`#${data.invoice_number}`, pw - m, y + 10, { align: "right" });

  // TAX INVOICE centered
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text("TAX INVOICE", pw / 2, y + 18, { align: "center" });

  y = 32;

  // ─── STORE INFO (left) ───
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(storeName, m, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  if (storeGSTIN) { doc.text(`GSTIN: ${storeGSTIN}`, m, y); y += 3.5; }
  if (storeAddress) {
    const addressLines = storeAddress.split("\n");
    addressLines.forEach(line => {
      doc.text(line, m, y); y += 3.5;
    });
  }
  if (storePhone) { doc.text(`Phone: ${storePhone}`, m, y); y += 3.5; }
  if (storeEmail) { doc.text(`Email: ${storeEmail}`, m, y); }

  // ─── AMOUNT DUE (right, compact, single line) ───
  const boxW = 68;
  const boxH = 8;
  const boxX = pw - m - boxW;
  const boxY = 30;
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`Amount Due: ${formatINR(data.total)}`, boxX + boxW / 2, boxY + 5.5, { align: "center" });

  // Invoice details below
  let ry = boxY + 12;
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  const detailsX = boxX + 6;
  const detailsValX = boxX + boxW - 4;
  
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Date:", detailsX, ry);
  doc.setFont("helvetica", "normal");
  doc.text(data.date, detailsValX, ry, { align: "right" });
  ry += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Due Date:", detailsX, ry);
  doc.setFont("helvetica", "normal");
  doc.text(data.date, detailsValX, ry, { align: "right" });
  ry += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Order Number:", detailsX, ry);
  doc.setFont("helvetica", "normal");
  doc.text(data.order_number, detailsValX, ry, { align: "right" });

  y += 6;

  // ─── BILL TO / SHIP TO ───
  const billShipY = Math.max(y, ry + 6);
  y = billShipY;

  // Two-column layout with fixed widths + gutter so long addresses wrap cleanly
  const gutter = 6;
  const colW = (contentW - gutter) / 2;
  const billX = m;
  const shipX = m + colW + gutter;
  const bottomMargin = 22; // reserve space for page footer bar
  const topMargin = 20;

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - bottomMargin) {
      doc.addPage();
      y = topMargin;
    }
  };

  // Two-pass drawParty: measure-only when `draw` is false, actual render when true.
  const drawParty = (
    startX: number,
    startY: number,
    heading: string,
    name: string,
    addr: InvoiceData["billing_address"] | undefined,
    extra: { phone?: string; email?: string; gstin?: string },
    draw: boolean,
  ): number => {
    let cy = startY;

    if (draw) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text(heading, startX, cy);
    }
    cy += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const nameLines = doc.splitTextToSize(name || "-", colW);
    nameLines.forEach((ln: string) => {
      if (draw) { doc.setTextColor(0, 0, 0); doc.text(ln, startX, cy); }
      cy += 4;
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const writeWrapped = (txt: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(txt, colW);
      lines.forEach((ln: string) => {
        if (draw) { doc.setTextColor(60, 60, 60); doc.text(ln, startX, cy); }
        cy += 3.5;
      });
      doc.setFont("helvetica", "normal");
    };

    if (addr?.address) writeWrapped(addr.address);
    const cityLine = [addr?.city, addr?.state].filter(Boolean).join(", ");
    if (cityLine) writeWrapped(cityLine + (addr?.postal_code ? `, PIN Code ${addr.postal_code}` : ""));
    if (addr?.country) writeWrapped(addr.country);
    if (extra.phone) writeWrapped(`Phone: ${extra.phone}`);
    if (extra.email) writeWrapped(`Email: ${extra.email}`);
    if (extra.gstin) writeWrapped(`GSTIN: ${extra.gstin}`, true);

    return cy;
  };

  const billing = data.billing_address || data.shipping_address;
  const billToName = data.bill_to_name || data.company_name || data.buyer_name || "Customer";
  const billExtras = {
    phone: billing?.phone || data.buyer_phone,
    email: billing?.email || data.buyer_email,
    gstin: data.gst_number || data.billing_address?.gst_number,
  };

  const shipping = data.shipping_address;
  const hasShipping = shipping && (shipping.address || shipping.city || shipping.state);
  const shipAddr = hasShipping ? shipping : billing;
  const shipToName = data.ship_to_name || shipping?.full_name || data.buyer_name || billToName;
  const shipExtras = { phone: shipAddr?.phone, email: shipAddr?.email };

  // Measure both parties (returns end-y when startY=0, i.e. required height).
  // If block won't fit before the footer, break to a new page BEFORE drawing so
  // Bill/Ship stay aligned on the same line.
  const measureBill = drawParty(billX, 0, "Bill to:", billToName, billing, billExtras, false);
  const measureShip = drawParty(shipX, 0, "Ship to:", shipToName, shipAddr, shipExtras, false);
  const partyBlockH = Math.max(measureBill, measureShip) + 12; // divider + spacing
  ensureSpace(partyBlockH);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(m, y, pw - m, y);
  y += 5;

  const partyStart = y;
  const billEndY = drawParty(billX, partyStart, "Bill to:", billToName, billing, billExtras, true);
  const shipEndY = drawParty(shipX, partyStart, "Ship to:", shipToName, shipAddr, shipExtras, true);

  y = Math.max(billEndY, shipEndY) + 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(m, y, pw - m, y);
  y += 2;

  // ─── ITEMS TABLE ───
  const tableX = m;
  const tableW = contentW;
  const cols = [12, 55, 22, 14, 16, 22, 22, 20, 22];
  const totalColW = cols.reduce((a, b) => a + b, 0);
  const scale = tableW / totalColW;
  const scaledW = cols.map(w => w * scale);
  const headers = ["S.No", "Item\nDescription", "HSN", "Qty.", "Unit", "Rate per\nItem", "Total", "Discount", "Taxable\nValue"];

  const headerH = 12;
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(tableX, y, tableW, headerH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let cx = tableX;
  for (let i = 0; i < headers.length; i++) {
    const lines = headers[i].split("\n");
    if (lines.length > 1) {
      doc.text(lines[0], cx + scaledW[i] / 2, y + 4.5, { align: "center" });
      doc.text(lines[1], cx + scaledW[i] / 2, y + 8.5, { align: "center" });
    } else {
      doc.text(headers[i], cx + scaledW[i] / 2, y + 7, { align: "center" });
    }
    cx += scaledW[i];
  }
  y += headerH;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);

  data.items.forEach((item, idx) => {
    const rowH = item.variation ? 14 : 10;
    ensureSpace(rowH + 12); // reserve row + at least a totals-row-height buffer

    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(tableX, y, tableW, rowH, "F");
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(tableX, y, tableX + tableW, y);

    cx = tableX;
    const itemDiscount = Math.max(Number(item.discount || 0), 0);
    const taxableValue = Math.max(item.total_price - itemDiscount, 0);

    const values = [
      String(idx + 1), "", item.hsn || "-", String(item.quantity), "units",
      formatINR(item.unit_price), formatINR(item.total_price), formatINR(itemDiscount), formatINR(taxableValue),
    ];

    for (let i = 0; i < values.length; i++) {
      doc.setDrawColor(220, 220, 220);
      doc.line(cx, y, cx, y + rowH);

      if (i === 1) {
        doc.setFont("helvetica", "bold");
        const maxW = scaledW[1] - 4;
        const splitDesc = doc.splitTextToSize(item.name, maxW);
        doc.text(splitDesc[0], cx + 3, y + 5);
        doc.setFont("helvetica", "normal");
        if (item.variation) {
          doc.setFontSize(6);
          doc.text(`Variant: ${item.variation}`, cx + 3, y + 9);
          doc.setFontSize(7);
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.text(values[i], cx + scaledW[i] / 2, y + (rowH > 10 ? 6 : 5.5), { align: "center" });
      }
      cx += scaledW[i];
    }
    doc.line(cx, y, cx, y + rowH);
    y += rowH;
  });

  doc.setDrawColor(220, 220, 220);
  doc.line(tableX, y, tableX + tableW, y);

  // ─── TOTAL ROW ───
  const totalRowH = 10;
  ensureSpace(totalRowH + 30); // reserve totals row + figures/words block
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(tableX, y, tableW, totalRowH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", tableX + scaledW[0] / 2 + scaledW[1] / 2, y + 6, { align: "center" });

  const taxableSubtotal = Math.max(data.subtotal - discountTotal, 0);
  cx = tableX;
  for (let i = 0; i < scaledW.length; i++) {
    if (i === scaledW.length - 3) doc.text(formatINR(data.subtotal), cx + scaledW[i] / 2, y + 6, { align: "center" });
    if (i === scaledW.length - 2) doc.text(formatINR(discountTotal), cx + scaledW[i] / 2, y + 6, { align: "center" });
    if (i === scaledW.length - 1) doc.text(formatINR(taxableSubtotal), cx + scaledW[i] / 2, y + 6, { align: "center" });
    cx += scaledW[i];
  }
  y += totalRowH;

  // ─── TOTAL IN FIGURES AND WORDS ───
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("Total invoice value (in figure)", m, y);
  doc.setFontSize(10);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text(formatINR(data.total), pw / 2 + 10, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("Total invoice value (in words)", m, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(numberToWords(Math.round(data.total)) + " Only", pw / 2 + 10, y);

  // ─── TERMS & CUSTOMER NOTES ───
  y += 14;
  ensureSpace(28);
  doc.setDrawColor(200, 200, 200);
  doc.line(m, y, pw - m, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text("Terms & Conditions", m, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  const terms = [
    "This is to certify that the particular given above are true and correct, amount",
    "indicated represents actually charged and that there is no flow",
    "additional consideration directly or indirectly from the buyer."
  ];
  terms.forEach(line => { doc.text(line, m, y); y += 3; });

  const notesY = y - 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text("Customer Notes", pw / 2 + 10, notesY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Thank you for your business!", pw / 2 + 10, notesY + 5);

  // ─── FOOTER (draw on every page) ───
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footerY = ph - 10;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `This is a computer-generated invoice and does not require a physical signature.  Page ${p} of ${pageCount}`,
      pw / 2, footerY, { align: "center" }
    );
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, ph - 4, pw, 4, "F");
  }

  return doc;
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }
  return convert(num);
}
