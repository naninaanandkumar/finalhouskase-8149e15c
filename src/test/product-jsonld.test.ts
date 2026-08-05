import { describe, it, expect } from "vitest";
import { SchemaGenerators } from "@/components/SEOHead";

/**
 * Rich Results guardrails: the product page must emit exactly one Product
 * entity (with reviews nested inside it) plus one BreadcrumbList.
 */
function buildProductPageSchemas() {
  const origin = "https://houskase.com";
  const product = SchemaGenerators.product({
    name: "Test Product",
    description: "Overview copy",
    image: `${origin}/img.jpg`,
    price: 299,
    sku: "SKU-1",
    url: `${origin}/product/test-product`,
    inStock: true,
  });

  const withReviews = {
    ...product,
    "@id": `${origin}/product/test-product#product`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 2,
      bestRating: 5,
      worstRating: 1,
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "A" },
        reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 },
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "B" },
        reviewRating: { "@type": "Rating", ratingValue: 4, bestRating: 5, worstRating: 1 },
      },
    ],
  };

  return [
    withReviews,
    SchemaGenerators.breadcrumb([
      { name: "Home", url: origin },
      { name: "Products", url: `${origin}/products` },
      { name: "Test Product", url: `${origin}/product/test-product` },
    ]),
  ];
}

describe("Product page JSON-LD", () => {
  const schemas = buildProductPageSchemas();

  it("emits no duplicate top-level entity types", () => {
    const types = schemas.map((s) => s["@type"]);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toContain("Product");
    expect(types).toContain("BreadcrumbList");
  });

  it("has exactly one Product node with reviews nested inside it", () => {
    const products = schemas.filter((s) => s["@type"] === "Product");
    expect(products).toHaveLength(1);
    const p = products[0] as Record<string, any>;
    expect(p.aggregateRating["@type"]).toBe("AggregateRating");
    expect(p.aggregateRating.reviewCount).toBe(p.review.length);
    expect(p.review.every((r: any) => r["@type"] === "Review")).toBe(true);
  });

  it("keeps required Rich Results fields and valid rating bounds", () => {
    const p = schemas[0] as Record<string, any>;
    expect(p["@context"]).toBe("https://schema.org");
    expect(p.name).toBeTruthy();
    expect(p.offers?.price).toBeTruthy();
    expect(p.offers?.priceCurrency).toBe("INR");
    const rating = p.aggregateRating.ratingValue;
    expect(rating).toBeGreaterThan(0);
    expect(rating).toBeLessThanOrEqual(5);
    for (const r of p.review) {
      expect(r.reviewRating.ratingValue).toBeGreaterThanOrEqual(1);
      expect(r.reviewRating.ratingValue).toBeLessThanOrEqual(5);
      expect(r.author?.name).toBeTruthy();
    }
  });

  it("breadcrumb positions are sequential and unique", () => {
    const bc = schemas.find((s) => s["@type"] === "BreadcrumbList") as any;
    const positions = bc.itemListElement.map((i: any) => i.position);
    expect(positions).toEqual([1, 2, 3]);
    expect(new Set(bc.itemListElement.map((i: any) => i.item)).size).toBe(3);
  });
});
