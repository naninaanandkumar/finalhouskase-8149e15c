import { useEffect, useState } from "react";
import { generateGSTInvoice } from "@/lib/generateInvoice";
import { Button } from "@/components/ui/button";

type Fixture = { label: string; data: Parameters<typeof generateGSTInvoice>[0] };

const baseStore = {
  store_name: "Houskase Retail Pvt Ltd",
  store_gstin: "07AAACH1234N1Z5",
  store_address: "12/45, Green Park Extension, Hauz Khas\nNew Delhi, Delhi 110016",
  store_phone: "+91 98765 43210",
  store_email: "sales@houskase.com",
};

const sampleItems = [
  { name: "Premium Bamboo Bath Towel (Extra Large) — Antimicrobial, Quick-Dry, 600 GSM", quantity: 4, unit_price: 899, total_price: 3596, variation: "Ivory / 70x140 cm", hsn: "6302", discount: 200 },
  { name: "Organic Cotton Hand Towel Set of 6", quantity: 2, unit_price: 1299, total_price: 2598, hsn: "6302" },
  { name: "Kitchen Napkin Combo Pack", quantity: 1, unit_price: 499, total_price: 499, hsn: "6304" },
];

const fixtures: Fixture[] = [
  {
    label: "Short addresses",
    data: {
      invoice_number: "INV-1001",
      order_number: "ORD-1001",
      date: "22-07-2026",
      buyer_name: "Ravi Kumar",
      buyer_phone: "+91 90000 00001",
      buyer_email: "ravi@example.com",
      billing_address: {
        full_name: "Ravi Kumar",
        address: "A-12, Sector 5",
        city: "Noida", state: "UP", postal_code: "201301", country: "India",
        phone: "+91 90000 00001", email: "ravi@example.com",
      },
      shipping_address: {
        full_name: "Ravi Kumar",
        address: "A-12, Sector 5",
        city: "Noida", state: "UP", postal_code: "201301", country: "India",
      },
      items: sampleItems, subtotal: 6693, tax: 0, shipping: 0, total: 6493, discount_total: 200,
      ...baseStore,
    },
  },
  {
    label: "Very long single-line address",
    data: {
      invoice_number: "INV-1002",
      order_number: "ORD-1002",
      date: "22-07-2026",
      buyer_name: "Anjali Ramachandran Krishnamurthy Iyer",
      company_name: "Krishnamurthy International Trading & Logistics Solutions Pvt Ltd",
      gst_number: "29ABCDE1234F1Z5",
      billing_address: {
        full_name: "Anjali Ramachandran Krishnamurthy Iyer",
        company_name: "Krishnamurthy International Trading & Logistics Solutions Pvt Ltd",
        address: "Plot No. 45B, 3rd Cross, Behind Reliance Fresh, Opposite Karnataka Bank ATM, Jayanagar 9th Block, Bannerghatta Main Road",
        city: "Bengaluru", state: "Karnataka", postal_code: "560069", country: "India",
        phone: "+91 98450 12345", email: "anjali.longemailaddress@krishnamurthy-trading.co.in",
        gst_number: "29ABCDE1234F1Z5",
      },
      shipping_address: {
        full_name: "Warehouse Manager - Krishnamurthy Logistics",
        address: "Warehouse #7, Peenya Industrial Area Phase 2, Near Peenya Metro Station, Off Tumkur Road",
        city: "Bengaluru", state: "Karnataka", postal_code: "560058", country: "India",
        phone: "+91 80 2839 4567",
      },
      items: sampleItems, subtotal: 6693, tax: 0, shipping: 150, total: 6643,
      ...baseStore,
    },
  },
  {
    label: "Asymmetric — long ship, short bill",
    data: {
      invoice_number: "INV-1003",
      order_number: "ORD-1003",
      date: "22-07-2026",
      buyer_name: "Meera",
      billing_address: {
        full_name: "Meera",
        address: "Flat 2B",
        city: "Pune", state: "MH", postal_code: "411001", country: "India",
      },
      shipping_address: {
        full_name: "Meera S. — c/o Reception Desk, Tower C",
        address: "Hiranandani Estate, Patlipada, Ghodbunder Road, Near Suraj Water Park, Behind D-Mart Hypermarket, Thane West",
        city: "Thane", state: "Maharashtra", postal_code: "400607", country: "India",
        phone: "+91 98200 99887",
      },
      items: sampleItems.slice(0, 2), subtotal: 6194, tax: 0, shipping: 0, total: 5994, discount_total: 200,
      ...baseStore,
    },
  },
  {
    label: "Many items + long address (page break test)",
    data: {
      invoice_number: "INV-1004",
      order_number: "ORD-1004",
      date: "22-07-2026",
      buyer_name: "Test Bulk Buyer",
      billing_address: {
        full_name: "Sh. Ramesh Chandra Aggarwal (Proprietor) — M/s Aggarwal Textile House & Distributors",
        address: "Shop No. 234-236, First Floor, Katra Neel, Nai Sarak, Chandni Chowk, Behind Central Bank of India Branch",
        city: "Delhi", state: "Delhi", postal_code: "110006", country: "India",
        phone: "+91 11 2325 6789", email: "orders@aggarwaltextilehouse.co.in",
        gst_number: "07AAACR1234K1Z9",
      },
      shipping_address: {
        full_name: "Godown Incharge",
        address: "Godown #14, Bhagirath Palace, Chandni Chowk",
        city: "Delhi", state: "Delhi", postal_code: "110006", country: "India",
      },
      items: Array.from({ length: 22 }, (_, i) => ({
        name: `Bulk Item Line ${i + 1} — Sample product description for pagination testing`,
        quantity: 5 + i, unit_price: 250 + i * 10, total_price: (250 + i * 10) * (5 + i),
        hsn: "6302", ...(i % 3 === 0 ? { variation: `Color-${i}` } : {}),
      })),
      subtotal: 85000, tax: 0, shipping: 0, total: 85000,
      ...baseStore,
    },
  },
];

export default function InvoicePreview() {
  const [idx, setIdx] = useState(0);
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      const doc = await generateGSTInvoice(fixtures[idx].data);
      const blob = doc.output("blob");
      const u = URL.createObjectURL(blob);
      revoke = u;
      setUrl(u);
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [idx]);

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold mr-4">Invoice Preview (Dev)</h1>
          {fixtures.map((f, i) => (
            <Button key={f.label} size="sm" variant={i === idx ? "default" : "outline"} onClick={() => setIdx(i)}>
              {f.label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Verifies Bill to / Ship to wrapping, page-break handling, and per-page footer.
        </p>
        {url && (
          <div className="flex gap-2">
            <Button asChild><a href={url} target="_blank" rel="noreferrer">Open PDF</a></Button>
            <Button asChild variant="outline">
              <a href={url} download={`${fixtures[idx].data.invoice_number}.pdf`}>Download PDF</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

