import { expect, test } from "@playwright/test";

const canonicalUrl = "https://rodrigouroz.com/";

test("publishes a crawlable canonical profile with a social preview", async ({ page, request }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalUrl);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonicalUrl);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );

  const structuredDataText = await page.locator('script[type="application/ld+json"]').textContent();
  const structuredData = JSON.parse(structuredDataText ?? "{}") as {
    url?: string;
    mainEntity?: { name?: string; url?: string };
  };
  expect(structuredData.url).toBe(canonicalUrl);
  expect(structuredData.mainEntity).toMatchObject({
    name: "Rodrigo Uroz",
    url: canonicalUrl,
  });

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Sitemap: https://rodrigouroz.com/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(`<loc>${canonicalUrl}</loc>`);

  const preview = await request.get("/og-image.png");
  expect(preview.ok()).toBe(true);
  expect(preview.headers()["content-type"]).toContain("image/png");
  const image = await preview.body();
  expect(image.readUInt32BE(16)).toBe(1200);
  expect(image.readUInt32BE(20)).toBe(630);
});
