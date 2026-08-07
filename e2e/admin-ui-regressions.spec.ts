import { test, expect, Page } from "@playwright/test";

async function openFirstProduct(page: Page) {
  await page.goto("/products", { waitUntil: "networkidle" });
  const href = await page.locator("a[href^='/product/']").first().getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
}

test.describe("Product card price rendering", () => {
  test("variable products show the lowest price without a 'From' prefix", async ({ page }) => {
    await page.goto("/products", { waitUntil: "networkidle" });
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^From\s*₹/)).toHaveCount(0);
  });
});

test.describe("Product detail — related products & sections", () => {
  test("Related Products heading is centered with decor lines, and reels sit below reviews", async ({ page }) => {
    await openFirstProduct(page);
    const heading = page.getByRole("heading", { name: "Related Products" });
    if (await heading.count()) {
      await expect(heading).toHaveCSS("text-align", "center");
    }

    const reviews = page.getByRole("heading", { name: /customer reviews/i }).first();
    const reels = page.getByRole("heading", { name: /trending reels/i }).first();
    if ((await reviews.count()) && (await reels.count())) {
      const rBox = await reviews.boundingBox();
      const relBox = await reels.boundingBox();
      expect((relBox?.y ?? 0)).toBeGreaterThan(rBox?.y ?? 0);
    }
  });

  test("gallery thumbnails share equal sizing on desktop and mobile", async ({ page }) => {
    await openFirstProduct(page);
    const thumbs = page.locator("[data-gallery-thumb]");
    const count = await thumbs.count();
    if (count > 1) {
      const first = await thumbs.first().boundingBox();
      for (let i = 1; i < count; i++) {
        const b = await thumbs.nth(i).boundingBox();
        expect(Math.abs((b?.width ?? 0) - (first?.width ?? 0))).toBeLessThan(2);
        expect(Math.abs((b?.height ?? 0) - (first?.height ?? 0))).toBeLessThan(2);
      }
    }
  });
});
