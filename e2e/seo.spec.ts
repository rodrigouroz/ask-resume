import { expect, test } from "@playwright/test";
import { profile } from "../src/profile";

const canonicalUrl = new URL("/", profile.seo.baseUrl).toString();

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
    name: profile.identity.name,
    url: canonicalUrl,
  });

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${new URL("sitemap.xml", canonicalUrl)}`);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(`<loc>${canonicalUrl}</loc>`);

  const preview = await request.get(`/${profile.assets.socialImage}`);
  expect(preview.ok()).toBe(true);
  expect(preview.headers()["content-type"]).toContain("image/");
  expect((await preview.body()).byteLength).toBeGreaterThan(100);
});
