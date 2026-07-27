import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  keywords?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  ogType?: string;
}

export function SEOHead({
  title = "Houskase — Effortless Everyday Essentials",
  description = "Shop premium towels, tissues, cleaning accessories and home essentials at Houskase. Trusted quality, fast shipping across India.",
  canonical,
  ogImage = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ebbb8f90-a68c-4c43-bc1e-306d51568bf9/id-preview-84f737bf--2e28e88a-88a8-456f-b239-d7cd4f3d4981.lovable.app-1771229232077.png",
  noIndex = false,
  keywords,
  jsonLd,
  ogType = "website",
}: SEOHeadProps) {
  const fullTitle = title.includes("Houskase") ? title : `${title} | Houskase`;
  const siteUrl = window.location.origin;
  const currentUrl = canonical || window.location.href;

  const schemas = jsonLd
    ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />}
      <link rel="canonical" href={currentUrl} />
      <link rel="alternate" hrefLang="en-IN" href={currentUrl} />
      <link rel="alternate" hrefLang="x-default" href={currentUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="Houskase" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

// Reusable schema generators
export const SchemaGenerators = {
  organization: (name: string, url: string, logoUrl?: string) => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(logoUrl && { logo: logoUrl }),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Hindi"],
    },
  }),

  website: (name: string, url: string) => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }),

  product: (product: {
    name: string;
    description?: string;
    image?: string;
    price: number;
    currency?: string;
    sku?: string;
    brand?: string;
    category?: string;
    url: string;
    inStock?: boolean;
  }) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.image && { image: product.image }),
    ...(product.sku && { sku: product.sku }),
    ...(product.brand && { brand: { "@type": "Brand", name: product.brand } }),
    ...(product.category && { category: product.category }),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "INR",
      availability: product.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: product.url,
    },
  }),

  breadcrumb: (items: { name: string; url: string }[]) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }),

  faqPage: (faqs: { question: string; answer: string }[]) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }),

  localBusiness: (business: {
    name: string;
    url: string;
    address?: string;
    phone?: string;
    email?: string;
  }) => ({
    "@context": "https://schema.org",
    "@type": "Store",
    name: business.name,
    url: business.url,
    ...(business.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: business.address,
        addressCountry: "IN",
      },
    }),
    ...(business.phone && { telephone: business.phone }),
    ...(business.email && { email: business.email }),
  }),

  collectionPage: (name: string, description: string, url: string) => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
  }),
};
