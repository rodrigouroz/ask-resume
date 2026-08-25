import { expect, test } from "@playwright/test";

test("presents professional experience before independent projects", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Rodrigo Uroz · Software Engineer");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Software engineer building products from ambiguity to operation.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Professional experience" })).toBeVisible();

  const professionalComesFirst = await page.evaluate(() => {
    const experience = document.querySelector("#experience");
    const projects = document.querySelector("#projects");
    if (!experience || !projects) return false;
    return Boolean(experience.compareDocumentPosition(projects) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(professionalComesFirst).toBe(true);
});

test("answers a professional question with a visible source", async ({ page }, testInfo) => {
  await page.goto("/");

  if (testInfo.project.name.startsWith("mobile")) {
    await page.getByRole("button", { name: "Ask Rodrigo", exact: true }).last().click();
  }

  const input = page.getByRole("textbox", {
    name: "Ask about experience, projects, or skills…",
  });
  await input.fill("What has Rodrigo worked on at ClassDojo?");
  await page.getByRole("button", { name: "Send question" }).click();

  await expect(
    page.getByText(
      "He works as a Fullstack Software Engineer, contributing to the TypeScript web platform, product integrations, LLM features, and developer experience.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "[ClassDojo · Experience]" })).toBeVisible();
});

test("opens Ask Rodrigo as a bottom sheet on mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only behavior");
  await page.goto("/");

  await page.getByRole("button", { name: "Ask Rodrigo", exact: true }).last().click();

  await expect(page.getByRole("complementary", { name: "Ask Rodrigo" })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Ask about experience, projects, or skills…" }),
  ).toBeFocused();
});
