import { useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SocialRail } from "@/components/layout/SocialRail";
import { HeroSection } from "@/components/home/HeroSection";
import { HeroMarquee } from "@/components/home/HeroMarquee";
import { PromoBanners } from "@/components/home/PromoBanners";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { TaggedProductSection } from "@/components/home/TaggedProductSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { AboutUsSection } from "@/components/home/AboutUsSection";
import { BlogSection } from "@/components/home/BlogSection";
import { TrustedFamilies } from "@/components/home/TrustedFamilies";
import { ReelsSection } from "@/components/reels/ReelsSection";
import { DynamicProductSections } from "@/components/home/DynamicProductSections";
import { TrustSection } from "@/components/home/TrustSection";
import { SEOHead, SchemaGenerators } from "@/components/SEOHead";

const Index = () => {
  const siteUrl = window.location.origin;
  const noop = useCallback(() => {}, []);

  const jsonLd = [
    SchemaGenerators.organization("Houskase", siteUrl),
    SchemaGenerators.website("Houskase", siteUrl),
    SchemaGenerators.localBusiness({
      name: "Houskase - Everyday Essentials",
      url: siteUrl,
    }),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Houskase - Premium Towels, Tissues & Cleaning Essentials"
        description="Houskase delivers thoughtfully crafted everyday essentials — premium towels, tissues, cleaning accessories and more. Trusted quality across India."
        keywords="Houskase, towels, tissues, cleaning accessories, household essentials, India"
        jsonLd={jsonLd}
      />
      <Header />
      <SocialRail />
      <h1 className="sr-only">Houskase — Premium Towels, Tissues & Cleaning Essentials for Home & Office</h1>
      <main className="pt-0">
        <HeroSection onFetchStatus={noop} />
        <HeroMarquee />
        <PromoBanners />
        <FeaturedProducts onFetchStatus={noop} />
        <TaggedProductSection tag="mega saver packs" title="Mega Saver Packs" className="bg-[#ffffff]" />
        <TaggedProductSection
          tag="bestseller"
          title="Bestseller"
          variant="showcase"
          panelLabelTop="BEST"
          panelLabelBottom="Sellers"
        />

        <ReelsSection title="Products Reels" />
        <TestimonialsSection />
        <AboutUsSection />
        <BlogSection />
        <TrustedFamilies />
        <DynamicProductSections onFetchStatus={noop} />
      </main>
      <TrustSection />
      <Footer />
    </div>
  );
};

export default Index;
