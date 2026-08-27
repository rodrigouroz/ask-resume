import { z } from "zod";

const languageSchema = z.enum(["en", "es"]);
export type Language = z.infer<typeof languageSchema>;

const localizedTextSchema = z.object({ en: z.string().min(1), es: z.string().min(1) });

const identifierSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const assetPathSchema = z
  .string()
  .regex(/^[A-Za-z0-9._/-]+$/)
  .refine((value) => !value.startsWith("/") && !value.split("/").includes(".."), {
    message: "asset paths must stay inside profile/assets",
  });

const experienceBrandSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("asset"),
    asset: assetPathSchema,
    alt: z.string().min(1),
    treatment: z.enum(["light", "dark", "full"]).optional(),
    sourceUrl: z.url().optional(),
    licenseNote: z.string().min(1).optional(),
  }),
  z.object({ kind: z.literal("monogram"), text: z.string().min(1).max(24) }),
]);

/** @expected-unused Public profile contract for downstream starter consumers. */
export type BrandAsset = z.infer<typeof experienceBrandSchema>;

const uiCopySchema = z.object({
  nav: z.object({
    experience: localizedTextSchema,
    capabilities: localizedTextSchema,
    projects: localizedTextSchema,
    about: localizedTextSchema,
    mainLabel: localizedTextSchema,
    languageLabel: localizedTextSchema,
    mobileLanguageLabel: localizedTextSchema,
    openMenu: localizedTextSchema,
    closeMenu: localizedTextSchema,
    switchToEnglish: localizedTextSchema,
    switchToSpanish: localizedTextSchema,
  }),
  download: localizedTextSchema,
  hero: z.object({
    title: localizedTextSchema,
    body: localizedTextSchema,
    action: localizedTextSchema,
    location: localizedTextSchema,
  }),
  sections: z.object({
    experience: localizedTextSchema,
    capabilities: localizedTextSchema,
    projects: localizedTextSchema,
    projectsIntro: localizedTextSchema,
    education: localizedTextSchema,
    mentoring: localizedTextSchema,
    beyond: localizedTextSchema,
  }),
  contact: z.object({ title: localizedTextSchema, body: localizedTextSchema }),
  chat: z.object({
    title: localizedTextSchema,
    cta: localizedTextSchema,
    close: localizedTextSchema,
    placeholder: localizedTextSchema,
    contact: localizedTextSchema,
    newChat: localizedTextSchema,
    send: localizedTextSchema,
    questionRequired: localizedTextSchema,
    emptyTitle: localizedTextSchema,
    emptyBody: localizedTextSchema,
    thinking: localizedTextSchema,
    unknown: localizedTextSchema,
  }),
  projectActions: z.object({ live: localizedTextSchema, ask: localizedTextSchema }),
});

const profileSchema = z.object({
  schemaVersion: z.literal(1),
  identity: z.object({
    slug: identifierSchema,
    name: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    jobTitle: z.string().min(1),
    headline: z.string().min(1),
    assistantName: z.string().min(1),
  }),
  localization: z.object({
    defaultLanguage: languageSchema,
    languages: z.tuple([z.literal("en"), z.literal("es")]),
  }),
  presentation: z.object({
    copy: uiCopySchema,
    experiences: z
      .array(
        z.object({
          id: identifierSchema,
          company: z.string().min(1),
          brand: experienceBrandSchema,
          role: localizedTextSchema,
          period: z.string().min(1),
          summary: localizedTextSchema,
        }),
      )
      .min(1),
    capabilities: z
      .array(
        z.object({
          id: identifierSchema,
          name: localizedTextSchema,
          details: localizedTextSchema,
        }),
      )
      .default([]),
    projects: z
      .array(
        z.object({
          id: identifierSchema,
          name: z.string().min(1),
          summary: localizedTextSchema,
          evidence: z.string().min(1),
          url: z.url(),
          icon: z.enum(["globe", "trace", "portfolio", "adventure"]),
        }),
      )
      .default([]),
    education: z
      .array(
        z.object({ id: identifierSchema, title: z.string().min(1), detail: localizedTextSchema }),
      )
      .default([]),
    careerNote: localizedTextSchema,
    mentoring: z.object({ label: localizedTextSchema, url: z.url() }).optional(),
    beyond: localizedTextSchema.optional(),
    footer: z.object({ copyright: z.string().min(1), privacy: localizedTextSchema }),
  }),
  contact: z.object({
    email: z.email(),
    githubUrl: z.url(),
    githubLabel: z.string().min(1),
  }),
  assets: z.object({
    favicon: assetPathSchema,
    socialImage: assetPathSchema,
    socialImageWidth: z.int().positive(),
    socialImageHeight: z.int().positive(),
    socialImageAlt: z.string().min(1),
  }),
  seo: z.object({
    baseUrl: z.url(),
    title: z.string().min(1),
    description: z.string().min(1),
    socialDescription: z.string().min(1),
    siteName: z.string().min(1),
    locale: z.string().min(1),
    profileDescription: z.string().min(1),
    sameAs: z.array(z.url()),
    worksFor: z.object({ name: z.string().min(1), url: z.url() }),
    alumniOf: z.string().min(1),
    knowsLanguage: z.array(z.string().min(1)).min(1),
  }),
  pdf: z.object({
    visualFileName: z.string().regex(/^[a-z0-9][a-z0-9-]*\.pdf$/),
    atsFileName: z.string().regex(/^[a-z0-9][a-z0-9-]*\.pdf$/),
    pagePolicy: z.object({ min: z.int().min(1).max(2), max: z.int().min(1).max(2) }),
  }),
  deployment: z.object({
    workerName: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
    customDomains: z.array(z.object({ hostname: z.hostname(), zoneName: z.hostname() })),
    analyticsDataset: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
    rateLimitNamespaceId: z.string().regex(/^\d+$/),
    dailyQuestionLimit: z.int().positive(),
    aiProvider: z.enum(["openai", "workers-ai"]),
    workersAiModel: z.string().startsWith("@cf/"),
    premiumWorkersAiModel: z.string().startsWith("@cf/"),
  }),
});

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sectionIdSchema = z.enum(["experience", "capabilities", "projects", "education", "about"]);

const evidenceItemSchema = z.object({
  sourceId: identifierSchema,
  sectionId: sectionIdSchema,
  title: z.string().min(1),
  visibility: z.literal("public"),
  labels: localizedTextSchema,
  facts: z
    .array(
      z.object({
        factId: identifierSchema,
        text: z.string().min(1),
        reviewedAt: isoDateSchema,
        expiresAt: isoDateSchema.optional(),
      }),
    )
    .min(1),
});

const liveEvalSchema = z.object({
  id: identifierSchema,
  question: z.string().min(1),
  uiLanguage: languageSchema,
  language: languageSchema,
  statuses: z.array(z.enum(["answered", "unknown"])).min(1),
  sourceIds: z.array(identifierSchema).optional(),
  forbidden: z.array(z.string().min(1)).optional(),
});

const evidenceConfigSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(evidenceItemSchema).min(1),
  evals: z.array(liveEvalSchema).min(1),
});

const themeSchema = z.object({
  schemaVersion: z.literal(1),
  colors: z.object({
    ink: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    muted: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    line: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    lineStrong: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accentSoft: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
});

export { evidenceConfigSchema, profileSchema, themeSchema };

export type ProfileConfig = z.infer<typeof profileSchema>;
/** @expected-unused Public deployment contract for checkout tooling. */
export type DeploymentConfig = ProfileConfig["deployment"];
/** @expected-unused Public evidence contract for integrations and tooling. */
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type EvidenceConfig = z.infer<typeof evidenceConfigSchema>;
export type ThemeConfig = z.infer<typeof themeSchema>;
