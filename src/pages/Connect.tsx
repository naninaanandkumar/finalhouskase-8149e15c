import { useState } from "react";
import { Copy, Check, Bot, RefreshCw, ExternalLink, ShieldCheck, LogOut, Code2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolInputValidator } from "@/components/mcp/ToolInputValidator";


// Build the MCP endpoint from the project ref (inlined at build time — no runtime env read).
const projectRef = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? "";
const MCP_URL = `https://${projectRef}.supabase.co/functions/v1/mcp`;

type ToolExample = { name: string; desc: string; input: string; output: string };

const TOOL_EXAMPLES: ToolExample[] = [
  {
    name: "search_products",
    desc: "Full-text search over the Houskase catalog.",
    input: `{
  "query": "bamboo towel",
  "limit": 5
}`,
    output: `{
  "items": [
    {
      "id": "…",
      "slug": "premium-bamboo-face-towel",
      "name": "Premium Bamboo Face Towel",
      "guest_price": 249,
      "shop_moq": 24
    }
  ],
  "count": 1
}`,
  },
  {
    name: "get_product",
    desc: "Fetch one product's full detail by slug or id.",
    input: `{ "slug": "premium-bamboo-face-towel" }`,
    output: `{
  "product": {
    "id": "…",
    "name": "Premium Bamboo Face Towel",
    "short_description": "Ultra-soft, quick-dry…",
    "images": ["https://…"],
    "guest_price": 249,
    "regular_price": 349,
    "shop_price": 199,
    "shop_moq": 24
  }
}`,
  },
  {
    name: "list_categories",
    desc: "All active top-level and sub-categories.",
    input: `{}`,
    output: `{
  "categories": [
    { "id": "…", "name": "Kitchen", "slug": "kitchen", "parent_id": null },
    { "id": "…", "name": "Face & Face Towels", "slug": "face-towels", "parent_id": null }
  ]
}`,
  },
  {
    name: "list_my_orders",
    desc: "The signed-in user's most recent orders.",
    input: `{ "limit": 3 }`,
    output: `{
  "orders": [
    {
      "order_number": "ORD-20260716-1234",
      "status": "shipped",
      "payment_status": "paid",
      "total": 1490,
      "created_at": "2026-07-16T10:12:33Z"
    }
  ]
}`,
  },
  {
    name: "get_order",
    desc: "Full detail for one of the signed-in user's orders.",
    input: `{ "order_number": "ORD-20260716-1234" }`,
    output: `{
  "order": {
    "order_number": "ORD-20260716-1234",
    "status": "shipped",
    "total": 1490,
    "items": [
      { "name": "Bamboo Face Towel", "quantity": 6, "price": 249 }
    ]
  }
}`,
  },
  {
    name: "get_order_timeline",
    desc: "Every status transition for one of your orders.",
    input: `{ "order_number": "ORD-20260716-1234" }`,
    output: `{
  "order": { "order_number": "ORD-20260716-1234", "status": "shipped" },
  "timeline": [
    { "at": "2026-07-16T10:12:33Z", "event": "order_created", "to": "pending" },
    { "at": "2026-07-16T10:14:02Z", "event": "payment_status_changed", "from": "pending", "to": "paid" },
    { "at": "2026-07-17T08:30:01Z", "event": "status_changed", "from": "processing", "to": "shipped" }
  ]
}`,
  },
  {
    name: "list_my_rfqs",
    desc: "The signed-in user's bulk quote requests.",
    input: `{ "limit": 5 }`,
    output: `{
  "rfqs": [
    {
      "id": "…",
      "status": "pending",
      "created_at": "2026-07-15T12:00:00Z",
      "item_count": 2
    }
  ]
}`,
  },
  {
    name: "create_rfq",
    desc: "Submit a bulk quote request on your behalf (rate-limited).",
    input: `{
  "items": [
    { "product_id": "…", "quantity": 500 },
    { "product_id": "…", "quantity": 200 }
  ],
  "notes": "Deliver to Mumbai warehouse by Aug 15."
}`,
    output: `{
  "rfq_id": "…",
  "status": "pending",
  "message": "RFQ submitted. Our team will respond within 24 hours."
}`,
  },
  {
    name: "initiate_checkout",
    desc: "Create a pending order for your cart and return a payment URL (rate-limited).",
    input: `{ "shipping_address_id": "…" }`,
    output: `{
  "order_number": "ORD-20260716-1237",
  "amount": 1490,
  "checkout_url": "https://houskase.lovable.app/checkout?order=ORD-20260716-1237"
}`,
  },
  {
    name: "get_my_profile",
    desc: "Basic profile info for the signed-in user.",
    input: `{}`,
    output: `{
  "profile": {
    "full_name": "Rahul Sharma",
    "email": "rahul@example.com",
    "role": "shop"
  }
}`,
  },
];

function CopyBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <div className="flex items-stretch gap-2 rounded-lg border border-border bg-secondary/40 p-2">
      <code className="flex-1 truncate px-2 py-1.5 text-xs sm:text-sm text-foreground font-mono">
        {value}
      </code>
      <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
        {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
        <span className="ml-1.5 hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
            {i + 1}
          </span>
          <div className="pt-0.5 text-sm text-foreground leading-relaxed">{step}</div>
        </li>
      ))}
    </ol>
  );
}

export default function Connect() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Connect Houskase to ChatGPT & Claude — Agent Setup"
        description="Connect Houskase to ChatGPT, Claude, or any MCP-compatible AI assistant. Copy the URL and follow the steps."
        canonical="https://houskase.lovable.app/connect"
      />
      <Header />

      <main className="pt-4 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Bot className="h-3.5 w-3.5" /> Agent integrations
            </span>
            <h1 className="mt-3 text-3xl md:text-4xl font-display font-bold text-foreground">
              Connect Houskase to your AI assistant
            </h1>
            <p className="mt-3 text-muted-foreground">
              Use ChatGPT, Claude, or any MCP-compatible AI to browse the catalog, check your orders,
              start a checkout, and request bulk quotes — all signed in as you, all RLS-protected.
            </p>
          </div>

          {/* MCP URL */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Your MCP server URL</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Paste this URL into your AI assistant's connector settings.
            </p>
            <CopyBlock value={MCP_URL} />
          </section>

          {/* Connect steps */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">How to connect</h2>
            <Tabs defaultValue="chatgpt" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
              </TabsList>

              <TabsContent value="chatgpt">
                <Steps
                  items={[
                    <>
                      Open{" "}
                      <a
                        href="https://chatgpt.com/#settings/Connectors/Advanced"
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline inline-flex items-center gap-0.5"
                      >
                        ChatGPT → Settings → Connectors → Advanced <ExternalLink className="h-3 w-3" />
                      </a>{" "}
                      and enable <strong>Developer mode</strong> (read the risk notice shown there).
                    </>,
                    <>In the chat composer's <strong>+</strong> menu, turn on Developer mode.</>,
                    <>Click <strong>Add sources</strong>, then <strong>Connect more</strong>.</>,
                    <>Name the connector <em>Houskase</em> and paste the MCP URL above.</>,
                    <>Sign in with your Houskase account when prompted, then ask ChatGPT to use Houskase — e.g. "show my recent Houskase orders".</>,
                  ]}
                />
              </TabsContent>

              <TabsContent value="claude">
                <Steps
                  items={[
                    <>
                      Open{" "}
                      <a
                        href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline inline-flex items-center gap-0.5"
                      >
                        Claude → Connectors → Add custom connector <ExternalLink className="h-3 w-3" />
                      </a>
                      .
                    </>,
                    <>Name the connector <em>Houskase</em> and paste the MCP URL above.</>,
                    <>Enable the connector from the chat composer.</>,
                    <>Sign in with your Houskase account when prompted, then ask Claude to use Houskase.</>,
                  ]}
                />
              </TabsContent>
            </Tabs>
          </section>

          {/* What you can ask */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">What you can ask the assistant</h2>
            <ul className="space-y-2 text-sm text-foreground">
              <li>• "Find bamboo towels under ₹500 on Houskase."</li>
              <li>• "Show my last three Houskase orders and their status."</li>
              <li>• "Give me the full status timeline for order ORD-20260716-1234."</li>
              <li>• "Start a Houskase checkout for my cart shipping to my Mumbai address."</li>
              <li>• "Create an RFQ on Houskase for 500 face towels and 200 hand towels — B2B."</li>
              <li>• "List my bulk quote requests."</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              The assistant only sees your own data — Houskase's RLS ensures it can't read anyone else's orders,
              cart, or profile. Every tool call is recorded in your MCP activity log.
            </p>
          </section>

          {/* Scopes & security */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" /> Permissions granted to the assistant
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              When you approve the connection, your assistant is granted a short-lived OAuth token that
              acts as <em>you</em>, limited to these scopes:
            </p>
            <div className="grid gap-2 sm:grid-cols-2 mb-5">
              {[
                { name: "openid", detail: "Confirms your Houskase identity to the assistant." },
                { name: "email", detail: "Shares your account email address." },
                { name: "profile", detail: "Shares your basic profile (name, avatar)." },
                { name: "offline_access", detail: "Lets the assistant refresh the session while connected." },
              ].map((s) => (
                <div key={s.name} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="text-xs font-mono font-semibold text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.detail}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-foreground mb-2">Boundaries the assistant <strong>cannot</strong> cross:</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground mb-4">
              <li>• It cannot read anyone else's orders, cart, RFQs, or profile — Houskase's row-level security enforces this per row.</li>
              <li>• It cannot see your password, OTP codes, or payment details.</li>
              <li>• Per-user rate limits apply (60 calls/min, 2000/day; 10 checkouts/hour, 20 RFQs/hour) to prevent abuse.</li>
              <li>• Every call is logged in the audit trail with a hash of the input — never the raw payload.</li>
            </ul>
          </section>

          {/* Revoke access */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <LogOut className="h-4 w-4 text-accent" /> Revoke agent access
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              You can disconnect the assistant at any time. Once revoked, its token stops working immediately.
            </p>
            <Tabs defaultValue="chatgpt" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
              </TabsList>
              <TabsContent value="chatgpt">
                <Steps
                  items={[
                    <>Open <a href="https://chatgpt.com/#settings/Connectors" target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">ChatGPT → Settings → Connectors <ExternalLink className="h-3 w-3" /></a>.</>,
                    <>Find <em>Houskase</em> in the list.</>,
                    <>Click <strong>Disconnect</strong> or <strong>Remove</strong>.</>,
                    <>Confirm — the assistant loses access immediately.</>,
                  ]}
                />
              </TabsContent>
              <TabsContent value="claude">
                <Steps
                  items={[
                    <>Open <a href="https://claude.ai/customize/connectors" target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">Claude → Connectors <ExternalLink className="h-3 w-3" /></a>.</>,
                    <>Select <em>Houskase</em>.</>,
                    <>Click <strong>Remove</strong> / <strong>Disconnect</strong>.</>,
                    <>Confirm to revoke the token.</>,
                  ]}
                />
              </TabsContent>
            </Tabs>
            <p className="mt-4 text-xs text-muted-foreground">
              You can also review every call the assistant has made from your account by asking your
              admin for the MCP audit log.
            </p>
          </section>

          {/* Example tool calls (JSON in / out) */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-accent" /> Tool reference (with examples)
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ten tools are exposed. Each example shows the JSON input an assistant would send and a
              trimmed sample of the JSON output.
            </p>
            <Accordion type="single" collapsible className="w-full">
              {TOOL_EXAMPLES.map((t) => (
                <AccordionItem value={t.name} key={t.name} className="border-border">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 text-left">
                      <span className="font-mono text-xs text-accent shrink-0 mt-0.5">{t.name}</span>
                      <span className="text-sm text-muted-foreground">{t.desc}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                          Input
                        </div>
                        <pre className="rounded-lg border border-border bg-secondary/40 p-3 text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre">
{t.input}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                          Output (sample)
                        </div>
                        <pre className="rounded-lg border border-border bg-secondary/40 p-3 text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre">
{t.output}
                        </pre>
                      </div>
                    </div>
                    <div className="mt-3">
                      <ToolInputValidator toolName={t.name} initial={t.input} />
                    </div>
                  </AccordionContent>

                </AccordionItem>
              ))}
            </Accordion>
          </section>



          {/* Refresh steps */}
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-accent" /> Refresh after we ship updates
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Assistants cache the tool list. When Houskase ships new tools, refresh the connector to see them.
            </p>
            <Tabs defaultValue="chatgpt" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
              </TabsList>
              <TabsContent value="chatgpt">
                <Steps
                  items={[
                    <>Open ChatGPT's app preferences and pick <em>Houskase</em> under Enabled apps.</>,
                    <>Next to <strong>Information</strong>, click <strong>Refresh</strong>.</>,
                    <>If the URL changed, paste the latest URL from above.</>,
                    <>Start a new chat and ask ChatGPT to use Houskase.</>,
                  ]}
                />
              </TabsContent>
              <TabsContent value="claude">
                <Steps
                  items={[
                    <>Open the Connectors page in Claude and select <em>Houskase</em>.</>,
                    <>Refresh or update the connector's tools.</>,
                    <>If the URL changed, paste the latest URL from above.</>,
                    <>Ask Claude to use Houskase.</>,
                  ]}
                />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
