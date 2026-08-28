import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { evidenceConfig } from "../src/evidence";
import { profile } from "../src/profile";

const copy = profile.presentation.copy;
const firstExperience = profile.presentation.experiences[0]!;
const firstProject = profile.presentation.projects[0];
const experienceSource = evidenceConfig.items.find(({ title }) =>
  title.includes(firstExperience.company),
)!;

async function mockGroundedAnswer(page: Page, answer: { language: "en" | "es"; text: string }) {
  await page.route("**/api/ask", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "answered",
        language: answer.language,
        answer: answer.text,
        citations: [
          {
            sourceId: experienceSource.sourceId,
            sectionId: experienceSource.sectionId,
            label: experienceSource.labels[answer.language],
          },
        ],
      }),
    });
  });
}

test("presents the configured sections in the expected order", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(profile.seo.title);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: copy.hero.title.en,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: copy.sections.experience.en })).toBeVisible();

  if (firstProject) {
    await expect(page.getByRole("heading", { name: copy.sections.projects.en })).toBeVisible();
    const professionalComesFirst = await page.evaluate(() => {
      const experience = document.querySelector("#experience");
      const projects = document.querySelector("#projects");
      if (!experience || !projects) return false;
      return Boolean(
        experience.compareDocumentPosition(projects) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(professionalComesFirst).toBe(true);
  } else {
    await expect(page.locator("#projects")).toHaveCount(0);
    await expect(page.locator('nav a[href="#projects"]')).toHaveCount(0);
  }

  if (profile.presentation.mentoring) {
    await expect(page.getByRole("heading", { name: copy.sections.mentoring.en })).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: copy.sections.mentoring.en })).toHaveCount(0);
  }
});

test("answers a professional question with a visible source", async ({ page }, testInfo) => {
  await mockGroundedAnswer(page, {
    language: "en",
    text: `${profile.identity.name} has professional experience at ${firstExperience.company}.`,
  });
  await page.goto("/");

  if (testInfo.project.name.startsWith("mobile")) {
    await page.getByRole("button", { name: copy.chat.cta.en, exact: true }).last().click();
  }

  const input = page.getByRole("textbox", {
    name: copy.chat.placeholder.en,
  });
  await input.fill(
    `What has ${profile.identity.firstName} worked on at ${firstExperience.company}?`,
  );
  await page.getByRole("button", { name: copy.chat.send.en }).click();

  await expect(
    page.getByText(
      `${profile.identity.name} has professional experience at ${firstExperience.company}.`,
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: `[${experienceSource.labels.en}]` })).toBeVisible();
});

test("keeps the question language independent from the selected UI language", async ({
  page,
}, testInfo) => {
  await mockGroundedAnswer(page, {
    language: "es",
    text: `${profile.identity.name} tiene experiencia profesional en ${firstExperience.company}.`,
  });
  await page.goto("/");

  if (testInfo.project.name.startsWith("mobile")) {
    await page.getByRole("button", { name: copy.chat.cta.en, exact: true }).last().click();
  }

  const input = page.getByRole("textbox", {
    name: copy.chat.placeholder.en,
  });
  await input.fill(`¿En qué trabajó ${profile.identity.firstName} en ${firstExperience.company}?`);
  await page.getByRole("button", { name: copy.chat.send.en }).click();

  await expect(
    page.getByText(
      `${profile.identity.name} tiene experiencia profesional en ${firstExperience.company}.`,
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: `[${experienceSource.labels.es}]` })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("opens the configured assistant as a bottom sheet on mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only behavior");
  await page.goto("/");

  const opener = page.getByRole("button", { name: copy.chat.cta.en, exact: true }).last();
  await opener.click();

  const dialog = page.getByRole("dialog", { name: copy.chat.title.en });
  const input = page.getByRole("textbox", {
    name: copy.chat.placeholder.en,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(page.locator(".page-shell")).toHaveAttribute("inert", "");
  await expect(input).toBeFocused();

  await input.press("Escape");

  await expect(page.locator(".chat-panel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".page-shell")).not.toHaveAttribute("inert", "");
  await expect(opener).toBeFocused();
});

test("keeps key mobile actions at least 44 CSS pixels", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only behavior");
  await page.goto("/");

  const targets = [page.getByRole("button", { name: `Ask about ${firstExperience.company}` })];
  if (firstProject) {
    targets.push(
      page.getByRole("link", { name: `Open ${firstProject.name} live site` }),
      page.getByRole("button", { name: `Ask about ${firstProject.name}` }),
    );
  }

  for (const target of targets) {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    expect(box, "target should have a measurable box").not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
