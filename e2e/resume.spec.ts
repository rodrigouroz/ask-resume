import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function mockGroundedAnswer(page: Page, answer: { language: "en" | "es"; text: string }) {
  await page.route("**/api/ask", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "answered",
        language: answer.language,
        answer: answer.text,
        citations: [{ sourceId: "classdojo-current-role", sectionId: "experience" }],
      }),
    });
  });
}

test("presents professional experience before independent projects", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Rodrigo Uroz · Software Engineer & Product Builder");
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
  await mockGroundedAnswer(page, {
    language: "en",
    text: "Rodrigo works as a Fullstack Software Engineer at ClassDojo.",
  });
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
    page.getByText("Rodrigo works as a Fullstack Software Engineer at ClassDojo."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "[ClassDojo · Experience]" })).toBeVisible();
});

test("keeps the question language independent from the selected UI language", async ({
  page,
}, testInfo) => {
  await mockGroundedAnswer(page, {
    language: "es",
    text: "Rodrigo trabaja en ClassDojo desde 2022.",
  });
  await page.goto("/");

  if (testInfo.project.name.startsWith("mobile")) {
    await page.getByRole("button", { name: "Ask Rodrigo", exact: true }).last().click();
  }

  const input = page.getByRole("textbox", {
    name: "Ask about experience, projects, or skills…",
  });
  await input.fill("¿En qué trabajó Rodrigo en ClassDojo?");
  await page.getByRole("button", { name: "Send question" }).click();

  await expect(page.getByText("Rodrigo trabaja en ClassDojo desde 2022.")).toBeVisible();
  await expect(page.getByRole("link", { name: "[ClassDojo · Experiencia]" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
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
