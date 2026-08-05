import { test, expect, Page } from "@playwright/test";

async function openFirstProduct(page: Page) {
  await page.goto("/products", { waitUntil: "networkidle" });
  const href = await page.locator("a[href^='/product/']").first().getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  return href!;
}

test.describe("Product detail — reviews & rich results", () => {
  test("JSON-LD has a single Product node, nested reviews and no duplicate types", async ({ page }) => {
    await openFirstProduct(page);
    const raw = await page.$$eval("script[type='application/ld+json']", (els) =>
      els.map((e) => e.textContent || "")
    );
    const nodes = raw.map((t) => JSON.parse(t));
    const types = nodes.map((n) => n["@type"]);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toContain("Product");
    expect(types).toContain("BreadcrumbList");

    const product = nodes.find((n) => n["@type"] === "Product");
    expect(product.name).toBeTruthy();
    expect(product.offers?.priceCurrency).toBe("INR");
    if (product.aggregateRating) {
      expect(product.aggregateRating["@type"]).toBe("AggregateRating");
      expect(Number(product.aggregateRating.ratingValue)).toBeGreaterThan(0);
      expect(Number(product.aggregateRating.ratingValue)).toBeLessThanOrEqual(5);
      expect(product.aggregateRating.reviewCount).toBe((product.review || []).length);
      for (const r of product.review || []) {
        expect(r["@type"]).toBe("Review");
        expect(r.author?.name).toBeTruthy();
      }
    }
    // Product schema must not be duplicated by the reviews component.
    expect(nodes.filter((n) => n["@type"] === "Product")).toHaveLength(1);
  });

  test("only one 'Write a review' CTA is rendered", async ({ page }) => {
    await openFirstProduct(page);
    await expect(page.getByRole("button", { name: /write a review/i })).toHaveCount(1);
  });

  test("review modal traps focus and closes on Escape", async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole("button", { name: /write a review/i }).click();
    const dialog = page.getByRole("dialog");
    if ((await dialog.count()) === 0) {
      // Login-gated: a toast is shown instead of the modal for signed-out users.
      test.skip(true, "Review modal requires an authenticated session");
    }
    await expect(dialog).toBeVisible();

    // Focus stays inside the dialog while tabbing.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const inside = await dialog.evaluate((d) => d.contains(document.activeElement));
      expect(inside).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("review sort and page state sync to the URL", async ({ page }) => {
    await openFirstProduct(page);
    const sort = page.locator("[aria-label='Sort reviews'], button:has-text('Most Recent')").first();
    if ((await sort.count()) === 0) {
      test.skip(true, "No reviews yet on this product — sort control not rendered");
    }
    await sort.click();
    await page.getByRole("option", { name: /highest rating/i }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("reviewSort")).toBe("highest");

    const nextPage = page.getByRole("button", { name: "2", exact: true });
    if (await nextPage.count()) {
      await nextPage.click();
      await expect.poll(() => new URL(page.url()).searchParams.get("reviewPage")).toBe("2");
    }
  });
});

test.describe("Instant search dropdown selection", () => {
  test("nothing is selected until a search runs, then the first match is selected", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const box = page.getByPlaceholder("Search products...").first();
    await box.click({ force: true });
    await expect(page.getByRole("option")).toHaveCount(0);
    expect(await box.getAttribute("aria-activedescendant")).toBeNull();

    await box.type("c", { delay: 40 });
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
    expect(await box.getAttribute("aria-activedescendant")).toBeTruthy();

    // Arrow keys move the selection.
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  });
});

test("blog detail page has no 'Back to blog' link and a 500px full-width cover", async ({ page }) => {
  await page.goto("/blog", { waitUntil: "networkidle" });
  const href = await page.locator("a[href^='/blog/']").first().getAttribute("href");
  await page.goto(href!, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await expect(page.getByText("Back to blog")).toHaveCount(0);
  const cover = page.locator("article img").first();
  if (await cover.count()) {
    const box = await cover.boundingBox();
    expect(box?.height).toBeCloseTo(500, 0);
    expect(box?.x).toBe(0);
  }
});
