import { Link } from "react-router-dom";
import { ArrowRight, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./SectionHeading";
import aboutBanner from "@/assets/about-banner.png.asset.json";

const highlights = [
  { icon: Leaf, title: "Eco-conscious", text: "Reusable, washable bamboo essentials made to last." },
  { icon: ShieldCheck, title: "Quality tested", text: "Every batch checked for absorbency and durability." },
  { icon: Sparkles, title: "Everyday premium", text: "Thoughtfully crafted products for home & business." },
];

export function AboutUsSection() {
  return (
    <section className="py-8 sm:py-10">
      <div className="container mx-auto px-3 sm:px-4">
        <SectionHeading title="About Us" subtitle="The company behind Houskase" />

        <div className="grid gap-6 lg:grid-cols-2 items-center">
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={aboutBanner.url}
              alt="Houskase premium bamboo home essentials"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Houskase is an Indian everyday-essentials brand building thoughtfully crafted towels, tissues and
              cleaning accessories for modern homes, offices and businesses. We obsess over the small things —
              absorbency, lint-free finish, softness after the tenth wash — so your daily routine simply works better.
            </p>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              From single packs to bulk supply, we serve customers across 20,000+ pincodes with honest pricing,
              responsive support and products we happily use in our own homes.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {highlights.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-lg border border-border bg-card p-3">
                  <Icon className="h-5 w-5 text-accent mb-2" />
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{text}</p>
                </div>
              ))}
            </div>

            <Link to="/about-us" className="inline-block mt-5">
              <Button className="bg-accent hover:bg-accent-hover text-sm">
                Know More <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
