import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ArrowRight, Sparkles, Package, Leaf } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/common/SignedImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import wcPremiumQuality from "@/assets/wc-premium-quality.png.asset.json";
import wcEcoFriendly from "@/assets/wc-eco-friendly.png.asset.json";
import wcMultiPurpose from "@/assets/wc-multi-purpose.png.asset.json";
import wcSmartInnovation from "@/assets/wc-smart-innovation.png.asset.json";
import loveUltraAbsorbent from "@/assets/love-ultra-absorbent.png.asset.json";
import loveLintFree from "@/assets/love-lint-free.png.asset.json";
import loveWashable from "@/assets/love-washable.png.asset.json";
import loveReusable from "@/assets/love-reusable.png.asset.json";
import lovePremiumQuality from "@/assets/love-premium-quality.png.asset.json";
import aboutMultipurpose from "@/assets/about-multipurpose.png.asset.json";
import aboutWasteLess from "@/assets/about-waste-less.png.asset.json";
import aboutLiveSmarter from "@/assets/about-live-smarter.png.asset.json";
import aboutHappyCustomer from "@/assets/about-happy-customer.png.asset.json";
import aboutCitiesServed from "@/assets/about-cities-served.png.asset.json";
import aboutPremiumProducts from "@/assets/about-premium-products.png.asset.json";
import aboutQualityTested from "@/assets/about-quality-tested.png.asset.json";

interface ProductLite {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  images: string[] | null;
}

const HERO_BG = "https://ik.imagekit.io/houskase/herro%20section.png";
const WHO_IMAGE = "https://ik.imagekit.io/houskase/left%20side%20image.png";
const ECO_IMAGE = "https://ik.imagekit.io/houskase/eco.png?updatedAt=1783072653160";

export default function AboutUs() {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [perView, setPerView] = useState(2);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [quickView, setQuickView] = useState<ProductLite | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, short_description, images")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);
      setProducts((data as ProductLite[]) || []);
    })();
  }, []);

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // responsive per-view
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setPerView(w >= 1024 ? 5 : w >= 768 ? 4 : w >= 640 ? 3 : 2);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(products.slice(0, 10).length / perView));
    setSlideCount(total);
    setActiveSlide((s) => Math.min(s, total - 1));
  }, [products, perView]);

  // auto-slide (paused on hover/focus or when reduced-motion is on)
  useEffect(() => {
    if (slideCount <= 1 || isPaused || reducedMotion) return;
    const id = setInterval(() => {
      setActiveSlide((s) => {
        const next = (s + 1) % slideCount;
        const el = sliderRef.current;
        if (el) el.scrollTo({ left: next * el.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
        return next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, [slideCount, isPaused, reducedMotion]);

  const goToSlide = (i: number) => {
    setActiveSlide(i);
    const el = sliderRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="About Houskase | Wipe Away Worries"
        description="Houskase delivers premium household hygiene, cleaning and towel essentials — modern innovation for a cleaner, smarter, healthier lifestyle."
      />
      <Header />
      <main>
        {/* HERO BANNER */}
        <section className="relative -mt-5 overflow-hidden bg-background md:min-h-[430px] md:bg-brand-navy-soft">
          <div className="hidden md:block absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_BG})` }} />
          <div className="md:hidden h-[245px] bg-brand-navy-soft">
            <img src={HERO_BG} alt="Houskase product collection" className="h-full w-full object-cover object-center" />
          </div>
          {/* Gradient limited to the left half so the product art on the right stays clean */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-3/5 bg-gradient-to-r from-background via-background/70 to-transparent md:block" />
          <div className="container relative mx-auto px-4 py-7 md:py-16">
            <div className="max-w-[520px]">
                <h1 className="font-display text-[2.25rem] font-extrabold leading-[0.98] text-brand-navy md:text-[3.9rem]">
                  ABOUT<br />HOUSKASE<sup className="text-xl md:text-2xl align-super">™</sup>
                </h1>
                <p className="mt-4 text-lg md:text-xl font-semibold leading-tight text-foreground">
                  Modern Innovation for a Cleaner,<br />Smarter &amp; Healthier Lifestyle.
                </p>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                  We create premium household essentials that simplify everyday cleaning while delivering exceptional quality, durability, and convenience for modern homes.
                </p>
                <div className="mt-7 flex flex-nowrap gap-2 sm:gap-3">
                  <Button asChild size="lg" className="rounded px-4 text-xs bg-brand-navy text-primary-foreground hover:bg-primary-dark sm:px-6 sm:text-sm">
                    <Link to="/products">SHOP NOW <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded border-2 border-brand-navy px-4 text-xs text-brand-navy hover:bg-brand-navy-soft sm:px-6 sm:text-sm">
                    <Link to="/products">EXPLORE PRODUCTS</Link>
                  </Button>
                </div>
            </div>
          </div>
        </section>

        {/* WHO WE ARE */}
        <section className="bg-background py-0">
          <div className="grid md:grid-cols-2">
            <div className="min-h-[320px] bg-secondary/40 md:min-h-[430px]">
              <img src={WHO_IMAGE} alt="Houskase products in a clean family kitchen" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center px-4 py-10 md:px-14 lg:px-20">
              <div className="max-w-xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Who We Are</p>
              <div className="mb-4 h-1 w-14 rounded-full bg-brand-navy" />
              <h2 className="mb-5 font-display text-3xl font-bold text-brand-navy md:text-4xl">
                Welcome to HOUSKASE<sup className="text-lg">™</sup>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Welcome to Houskase, where modern innovation meets everyday convenience. We are dedicated to redefining home hygiene and household care by delivering premium-quality, high-performance solution essentials designed for the contemporary lifestyle.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                From our signature ultra-absorbent <b className="text-brand-navy">Non-Woven Cleaning Cloth Rolls</b> to smart <b className="text-brand-navy">Compressed Pearl Towel Tablets</b>, tough-acting <b className="text-brand-navy">Liquid Dishwashes</b> and <b className="text-brand-navy">Magic Cleaning Cloths</b> — every product is crafted to make maintaining a clean, healthy, and beautiful space completely effortless.
              </p>
              </div>
            </div>
          </div>

          {/* PHILOSOPHY CARD */}
          <div className="container mx-auto px-4 py-10">
          <div className="relative mx-auto max-w-5xl rounded-xl border bg-brand-navy-soft p-7 text-center shadow-card md:p-9">
            <div className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-navy text-primary-foreground shadow-lg">
              <Home className="h-7 w-7" />
            </div>
            <h3 className="mt-3 mb-3 font-display text-2xl font-bold text-brand-navy md:text-3xl">OUR PHILOSOPHY</h3>
            <p className="max-w-3xl mx-auto text-muted-foreground leading-relaxed">
              At Houskase, we believe a clean environment is the foundation of a happy, stress-free life — but cleaning shouldn't feel like a chore. That's why we engineer products that combine{" "}
              <b className="text-brand-navy">Superior Functionality</b>, <b className="text-brand-navy">Multi-Purpose Versatility</b> and <b className="text-brand-navy">Premium Durability</b> — so you spend less time cleaning and more time living.
            </p>
          </div>
          </div>
        </section>

        {/* WHY CHOOSE HOUSKASE */}
        <section className="container mx-auto px-4 pb-14 md:pb-20">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-brand-navy md:text-3xl">WHY CHOOSE HOUSKASE?</h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-brand-navy" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            {[
              { img: wcPremiumQuality.url, title: "PREMIUM QUALITY", body: "High-performance materials with superior absorbency, strength, and durability for everyday use." },
              { img: wcEcoFriendly.url, title: "ECO-FRIENDLY", body: "Reusable cleaning cloths help reduce paper waste and support sustainable living." },
              { img: wcMultiPurpose.url, title: "MULTI-PURPOSE", body: "Perfect for Kitchen, Bathroom, Office, Car, Travel and every corner of your home." },
              { img: wcSmartInnovation.url, title: "SMART INNOVATION", body: "Thoughtfully designed products for modern lifestyles with practical everyday functionality." },
            ].map(({ img, title, body }) => (
              <div key={title} className="rounded-lg border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-red">
                  <img src={img} alt={title} className="h-11 w-11 object-contain" />
                </div>
                <h4 className="mb-2 text-sm font-bold text-brand-navy">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* OUR PRODUCTS (from DB) */}
        <section className="container mx-auto px-4 pb-14 md:pb-20">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-brand-navy md:text-3xl">OUR PRODUCTS</h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-brand-navy" />
          </div>
          {products.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No products yet. Add products in the admin dashboard.</p>
          ) : (
            <>
              <div
                ref={sliderRef}
                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const idx = Math.round(el.scrollLeft / el.clientWidth);
                  if (idx !== activeSlide) setActiveSlide(idx);
                }}
              >
                {Array.from({ length: slideCount }).map((_, pageIdx) => {
                  const pageItems = products.slice(0, 10).slice(pageIdx * perView, pageIdx * perView + perView);
                  const cols = Math.min(perView, pageItems.length);
                  return (
                  <div key={pageIdx} className="flex-shrink-0 w-full snap-start">
                    <div
                      className="grid gap-3 sm:gap-4 items-stretch mx-auto"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        maxWidth: `${(cols / perView) * 100}%`,
                      }}
                    >
                      {pageItems.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setQuickView(p)}
                          className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy"
                        >
                          <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden">
                            {p.images?.[0] ? (
                              <SignedImage src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <Package className="h-10 w-10 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-1 flex-col p-3 sm:p-4">
                            <h4 className="mb-1 line-clamp-2 min-h-[2.5rem] text-sm font-bold text-brand-navy">{p.name}</h4>
                            <p className="mb-3 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">
                              {p.short_description || ""}
                            </p>
                            <span className="mt-auto flex h-9 w-full items-center justify-center rounded bg-brand-navy px-3 text-center text-[11px] font-bold tracking-wider text-primary-foreground">
                              VIEW PRODUCT
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
              {slideCount > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {Array.from({ length: slideCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goToSlide(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={i === activeSlide}
                      className={`h-2.5 cursor-pointer rounded-full transition-all ${
                        i === activeSlide ? "w-6 bg-brand-navy" : "w-2.5 bg-brand-navy/30 hover:bg-brand-navy/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* WHY CUSTOMERS LOVE (badges strip) */}
        <section className="bg-brand-red py-10 text-primary-foreground">
          <div className="container mx-auto px-4">
            <h3 className="mb-8 text-center font-display text-lg font-bold md:text-2xl">WHY CUSTOMERS LOVE HOUSKASE</h3>
            <div className="grid grid-cols-2 text-center sm:grid-cols-3 md:grid-cols-6">
              {[
                { img: loveUltraAbsorbent.url, label: "Ultra Absorbent" },
                { img: loveLintFree.url, label: "Lint Free" },
                { img: loveWashable.url, label: "Washable" },
                { img: loveReusable.url, label: "Reusable" },
                { img: lovePremiumQuality.url, label: "Premium Quality" },
                { img: aboutMultipurpose.url, label: "Multipurpose" },
              ].map(({ img, label }) => (
                <div key={label} className="flex flex-col items-center gap-3 border-l border-r border-primary-foreground/25 px-3 py-3 first:border-l-0 last:border-r-0">
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand-red ring-2 ring-primary-foreground/40 shadow-md md:h-20 md:w-20">
                    <img src={img} alt={label} className="h-10 w-10 object-contain md:h-12 md:w-12 [filter:brightness(0)_invert(1)]" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide md:text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ECO INNOVATION + STATS */}
        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-brand-green-soft">
              <img src={ECO_IMAGE} alt="Eco-conscious Houskase product innovation" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <Leaf className="h-5 w-5 text-brand-green" />
                <h2 className="font-display text-2xl font-bold text-brand-green md:text-3xl">ECO-CONSCIOUS INNOVATION</h2>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed mb-6 md:text-lg">
                Our reusable cleaning cloths can be washed and reused up to <b>100 times</b>, significantly reducing single-use waste while maintaining excellent cleaning performance. Every Houskase essential is designed to help homes clean better with less throwaway waste, reliable durability, and everyday convenience.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { Icon: Sparkles, label: "Clean Better." },
                  { img: aboutWasteLess.url, label: "Waste Less." },
                  { img: aboutLiveSmarter.url, label: "Live Smarter." },
                ].map(({ Icon, img, label }) => (
                  <div key={label} className="flex flex-col items-center gap-3 border-x border-border/70 px-2">
                    {img ? (
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green shadow-sm md:h-16 md:w-16">
                        <img src={img} alt={label} className="h-8 w-8 object-contain md:h-10 md:w-10" />
                      </span>
                    ) : Icon ? (
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-primary-foreground shadow-sm md:h-16 md:w-16">
                        <Icon className="h-8 w-8 md:h-10 md:w-10" />
                      </span>
                    ) : null}
                    <span className="text-sm font-semibold text-brand-green">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 rounded-lg border bg-brand-navy-soft p-4 md:grid-cols-4">
            {[
              { img: aboutHappyCustomer.url, num: "50,000+", label: "Happy Customers" },
              { img: aboutCitiesServed.url, num: "100+", label: "Cities Served" },
              { img: aboutPremiumProducts.url, num: "10+", label: "Premium Products" },
              { img: aboutQualityTested.url, num: "100%", label: "Quality Tested" },
            ].map(({ img, num, label }) => (
              <div key={label} className="flex items-center gap-3 border-x border-background/90 px-3 py-3">
                <img src={img} alt={label} className="h-10 w-10 shrink-0 object-contain md:h-11 md:w-11" />
                <div>
                  <div className="text-lg font-bold leading-tight text-brand-navy">{num}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* OUR PROMISE */}
        <section className="container mx-auto px-4 pb-16">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="order-2 md:order-1">
              <img
                src="https://ik.imagekit.io/houskase/premium%20quality.png"
                alt="Our Promise – Premium Quality"
                className="mx-auto h-[220px] w-[220px] rounded-lg object-contain"
                loading="lazy"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="mb-4 font-display text-2xl font-bold text-brand-navy md:text-3xl">OUR PROMISE</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We are committed to continuous innovation by delivering modern household solutions that save your time, effort, and money.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                With Houskase, you're not just buying cleaning products — you are choosing{" "}
                <b className="text-brand-navy">a smarter, cleaner, and more organized way of living.</b>
              </p>
            </div>
          </div>
        </section>

        {/* CTA FOOTER STRIP */}
        <section className="relative overflow-hidden py-10 text-primary-foreground" style={{ backgroundColor: "#AD1E2A" }}>
          <img
            src="https://ik.imagekit.io/houskase/Banner_rxFiE4NWw.png?updatedAt=1785301567142"
            alt="Houskase product collection"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, rgba(173,30,42,0.86) 0%, rgba(173,30,42,0.44) 40%, rgba(173,30,42,0) 70%)" }}
          />
          <div className="container relative mx-auto flex min-h-[170px] flex-col items-start justify-center gap-4 px-4 text-left">
            <div className="max-w-xl">
              <p className="font-display font-bold text-2xl md:text-3xl">
                HOUSKASE<sup className="text-lg">™</sup> <span className="italic font-normal opacity-90">— Wipe Away Worries.</span>
              </p>
              <p className="mt-1 text-sm text-primary-foreground/80">Premium Household Essentials for Everyday Living.</p>
            </div>
            <Button asChild size="lg" variant="secondary" className="rounded px-6">
              <Link to="/products">EXPLORE COLLECTION <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Dialog open={!!quickView} onOpenChange={(o) => !o && setQuickView(null)}>
        <DialogContent className="max-w-lg">
          {quickView && (
            <>
              <DialogHeader>
                <DialogTitle className="text-brand-navy">{quickView.name}</DialogTitle>
                {quickView.short_description && (
                  <DialogDescription>{quickView.short_description}</DialogDescription>
                )}
              </DialogHeader>
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-secondary/30">
                {quickView.images?.[0] ? (
                  <SignedImage src={quickView.images[0]} alt={quickView.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <DialogFooter className="sm:justify-end">
                <Button asChild className="bg-brand-navy hover:bg-primary-dark">
                  <Link to={`/product/${quickView.slug}`}>
                    View Full Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}