import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead, SchemaGenerators } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ChevronRight, Droplets, Leaf, Shield, ArrowRight, Sparkles, Scale, ShoppingBag } from "lucide-react";

const faqs = [
  {
    question: "Are bamboo towels better than cotton towels?",
    answer:
      "For most Indian households — yes. Bamboo towels are ~3× more absorbent than standard cotton, naturally antibacterial thanks to bamboo kun, and hypoallergenic. Cotton is cheaper up front, but bamboo lasts longer, dries faster in humid weather, and stays softer wash after wash.",
  },
  {
    question: "Is cotton ever the better choice?",
    answer:
      "Yes — if you want the lowest price today, don't mind slower drying, and prefer a slightly firmer texture (some people find bamboo too soft). Cotton is also easier to bleach, so it can be a better fit for very high-stain use cases like kitchens or gyms — though a bamboo–cotton blend usually beats both.",
  },
  {
    question: "Which one is more sustainable?",
    answer:
      "Bamboo, by a wide margin. Bamboo grass regrows in 3–5 years without replanting, needs no pesticides, and uses about a third of the water conventional cotton demands. Conventional cotton is one of the most water- and chemical-intensive crops in the world; organic cotton narrows the gap but doesn't close it.",
  },
  {
    question: "Which lasts longer with regular washing?",
    answer:
      "Bamboo. Well-made bamboo towels retain their softness and absorbency for 300–500 washes; standard cotton starts feeling coarse after ~150 washes. Skip fabric softeners on either — they coat the fibres and cut absorbency.",
  },
  {
    question: "Are bamboo towels safe for babies and sensitive skin?",
    answer:
      "Yes. They are hypoallergenic, lint-free, and free from harsh chemicals — which is why paediatricians often recommend bamboo over cotton for babies and for anyone with eczema or acne-prone skin.",
  },
];

const rows: Array<{
  property: string;
  bamboo: string;
  cotton: string;
  winner: "bamboo" | "cotton" | "tie";
}> = [
  { property: "Absorbency", bamboo: "Up to 3× cotton", cotton: "Standard baseline", winner: "bamboo" },
  { property: "Softness (after 50 washes)", bamboo: "Retains cashmere-like feel", cotton: "Gradually roughens", winner: "bamboo" },
  { property: "Antibacterial", bamboo: "Natural (bamboo kun)", cotton: "None without treatment", winner: "bamboo" },
  { property: "Lint & shedding", bamboo: "Very low", cotton: "Moderate to high", winner: "bamboo" },
  { property: "Dry time after use", bamboo: "Fast — great for humid Indian summers", cotton: "Slow when thick", winner: "bamboo" },
  { property: "Water used to grow", bamboo: "~1/3 of cotton", cotton: "Very high", winner: "bamboo" },
  { property: "Upfront price", bamboo: "Higher", cotton: "Lower", winner: "cotton" },
  { property: "Bleach tolerance", bamboo: "Moderate", cotton: "High", winner: "cotton" },
  { property: "Biodegradable", bamboo: "Yes, fully", cotton: "Yes, but slower", winner: "bamboo" },
  { property: "Life span (typical)", bamboo: "300–500 washes", cotton: "~150 washes", winner: "bamboo" },
];

export default function BambooVsCottonTowels() {
  const url = "https://houskase.lovable.app/guides/bamboo-vs-cotton-towels";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Bamboo Towels vs. Cotton Towels: Which is Better?",
      description:
        "A head-to-head comparison of bamboo and cotton towels — absorbency, softness, durability, sustainability, price. Which one wins for Indian homes?",
      author: { "@type": "Organization", name: "Houskase" },
      publisher: {
        "@type": "Organization",
        name: "Houskase",
        logo: { "@type": "ImageObject", url: "https://houskase.lovable.app/favicon.ico" },
      },
      mainEntityOfPage: url,
      inLanguage: "en-IN",
      datePublished: "2026-07-16",
    },
    SchemaGenerators.breadcrumb([
      { name: "Home", url: "https://houskase.lovable.app/" },
      { name: "Guides", url: "https://houskase.lovable.app/guides/bamboo-vs-cotton-towels" },
      { name: "Bamboo vs. Cotton Towels", url },
    ]),
    SchemaGenerators.faqPage(faqs),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Bamboo Towels vs. Cotton Towels: Which is Better?"
        description="A head-to-head comparison of bamboo and cotton towels — absorbency, softness, sustainability, and price. See which is the smarter buy for Indian homes."
        keywords="bamboo vs cotton towels, are bamboo towels better than cotton, best towels India, bamboo bath towels, cotton bath towels"
        canonical={url}
        ogType="article"
        jsonLd={jsonLd}
      />
      <Header />

      <main className="pt-4 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/products" className="hover:text-foreground">Guides</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Bamboo vs. Cotton Towels</span>
          </nav>

          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Scale className="h-3.5 w-3.5" /> Buyer's Guide
            </span>
            <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight">
              Bamboo Towels vs. Cotton Towels: Which is Better?
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">
              The short answer: bamboo wins on absorbency, softness, hygiene, and sustainability; cotton wins
              on price. Here's a side-by-side breakdown so you can pick the right towel for your home.
            </p>
          </motion.header>

          {/* Verdict card */}
          <section aria-labelledby="verdict" className="mb-12 rounded-2xl border border-accent/30 bg-accent/5 p-6 md:p-8">
            <h2 id="verdict" className="text-xl md:text-2xl font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> The verdict
            </h2>
            <p className="text-foreground leading-relaxed">
              For daily bath, face, and gym use — <strong>bamboo towels are the better buy for most people</strong>.
              They absorb roughly three times more water than standard cotton, feel softer even after 300+ washes,
              and stay fresher between washes thanks to bamboo's natural antimicrobial fibre. Cotton is still worth
              buying when you want the lowest sticker price or you need a heavy-duty towel you can bleach — a
              bamboo–cotton blend often gives you the best of both.
            </p>
          </section>

          {/* Comparison table */}
          <section aria-labelledby="comparison" className="mb-14">
            <h2 id="comparison" className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
              Bamboo vs. cotton at a glance
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Property</th>
                    <th className="text-left px-4 py-3 font-semibold">Bamboo</th>
                    <th className="text-left px-4 py-3 font-semibold">Cotton</th>
                    <th className="text-left px-4 py-3 font-semibold">Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.property} className="bg-card">
                      <td className="px-4 py-3 font-medium text-foreground">{r.property}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.bamboo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.cotton}</td>
                      <td className="px-4 py-3">
                        <span className={
                          r.winner === "bamboo"
                            ? "inline-flex items-center rounded-full bg-accent/10 text-accent px-2 py-0.5 text-xs font-semibold"
                            : r.winner === "cotton"
                              ? "inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold"
                              : "text-xs text-muted-foreground"
                        }>
                          {r.winner === "tie" ? "Tie" : r.winner === "bamboo" ? "Bamboo" : "Cotton"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Why bamboo wins on absorbency */}
          <section aria-labelledby="absorbency" className="mb-14">
            <h2 id="absorbency" className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Droplets className="h-6 w-6 text-accent" /> Why bamboo is more absorbent
            </h2>
            <p className="text-foreground leading-relaxed mb-3">
              Bamboo fibre is hollow at the core, with micro-gaps along the length of every strand. When water
              hits the fabric, those gaps pull moisture in by capillary action — the same effect that lets a
              paper towel soak up a spill, but distributed across every fibre in the weave. Cotton fibres are
              solid and flatter, so they trap water on the surface and take longer to move it away.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              For Indian summers and monsoon-heavy cities, that means bamboo dries you off with fewer wipes and
              then dries itself faster on the rack — so towels stay fresh instead of turning musty.
            </p>
          </section>

          {/* Sustainability */}
          <section aria-labelledby="sustainability" className="mb-14">
            <h2 id="sustainability" className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Leaf className="h-6 w-6 text-accent" /> The sustainability gap is bigger than most people think
            </h2>
            <ul className="space-y-2 text-foreground">
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> Bamboo regrows in 3–5 years; cotton is replanted every season.</li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> Cotton uses ~2,700 litres of water per shirt (WWF estimate); bamboo needs roughly a third of that per kg of fibre.</li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> Bamboo grows without pesticides. Conventional cotton accounts for ~16% of global insecticide use.</li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> Both biodegrade — but bamboo does it faster because the fibre is finer and free of chemical residues.</li>
            </ul>
          </section>

          {/* When cotton wins */}
          <section aria-labelledby="cotton-wins" className="mb-14">
            <h2 id="cotton-wins" className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> When to still buy cotton (or a blend)
            </h2>
            <p className="text-foreground leading-relaxed mb-3">
              Cotton earns its place in a few scenarios:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> <span><strong className="text-foreground">Tight budget</strong> — a good cotton towel outperforms a cheap bamboo blend.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> <span><strong className="text-foreground">Heavy stains you plan to bleach</strong> — cotton handles chlorine better.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> <span><strong className="text-foreground">Preference for a firmer, "toothier" texture</strong> — some people find bamboo too silky.</span></li>
              <li className="flex gap-2"><span className="text-primary font-bold">•</span> <span><strong className="text-foreground">Bamboo–cotton blends</strong> keep bamboo's softness and hygiene while lowering the price.</span></li>
            </ul>
          </section>

          {/* FAQs */}
          <section aria-labelledby="faq" className="mb-14">
            <h2 id="faq" className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <details key={f.question} className="group rounded-xl border border-border bg-card p-5">
                  <summary className="cursor-pointer font-semibold text-foreground list-none flex justify-between items-center">
                    {f.question}
                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related reads */}
          <section aria-labelledby="related" className="mb-14">
            <h2 id="related" className="text-lg font-semibold text-foreground mb-3">Keep reading</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to="/products"
                className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow flex items-start gap-3"
              >
                <ShoppingBag className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">Shop Houskase towels</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Bamboo, cotton, and premium blends — engineered for Indian homes.</div>
                </div>
              </Link>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20 p-6 md:p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
              Try bamboo — feel the difference
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Softer, faster-drying, and built to last hundreds of washes. Upgrade your bathroom essentials today.
            </p>
            <Link to="/products">
              <Button size="lg" className="bg-accent hover:bg-accent-hover text-accent-foreground">
                Shop Towels
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
