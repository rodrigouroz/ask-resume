import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroundedModel } from "../src/assistant/model";
import { evidenceConfig, profile } from "../src/profile";

const primarySource = evidenceConfig.items[0];
if (!primarySource) throw new Error("Missing test evidence");

const workerDependencies = vi.hoisted(() => ({
  createOpenAIModel: vi.fn<(apiKey: string) => GroundedModel>(),
  createWorkersAIModel: vi.fn<(ai: Ai, model: string) => GroundedModel>(),
}));

vi.mock("../src/assistant/openaiModel", () => ({
  createOpenAIModel: workerDependencies.createOpenAIModel,
}));
vi.mock("./workersAiModel", () => ({
  createWorkersAIModel: workerDependencies.createWorkersAIModel,
}));
vi.mock("./dailyBudget", () => ({ AskDailyBudget: class AskDailyBudget {} }));
import { createWorker } from "./index";

const model: GroundedModel = {
  draft: vi.fn<GroundedModel["draft"]>(async ({ language }) => ({
    answer:
      language === "es"
        ? `${profile.identity.name} tiene experiencia profesional.`
        : `${profile.identity.name} has professional experience.`,
    sourceIds: [primarySource.sourceId],
  })),
  verify: vi.fn<GroundedModel["verify"]>(async () => ({
    answersQuestion: true,
    languageMatches: true,
    supported: true,
  })),
};

function env(
  rateLimitSuccess = true,
  overrides: Partial<Pick<Env, "ASK_DAILY_BUDGET" | "PRODUCT_ANALYTICS">> = {},
  limit = vi.fn<RateLimit["limit"]>(async () => ({ success: rateLimitSuccess })),
): Env {
  return {
    AI: {} as Ai,
    AI_PROVIDER: "openai",
    ASK_RATE_LIMITER: { limit },
    DAILY_ASK_LIMIT: "250",
    OPENAI_API_KEY: "unused-in-test",
    PROFILE_SLUG: profile.identity.slug,
    PRODUCT_ANALYTICS: {
      writeDataPoint: vi.fn<AnalyticsEngineDataset["writeDataPoint"]>(),
    },
    WORKERS_AI_MODEL: "@cf/zai-org/glm-4.7-flash",
    ...overrides,
  } as Env;
}

function analyticsBinding() {
  const writeDataPoint = vi.fn<AnalyticsEngineDataset["writeDataPoint"]>();
  return { binding: { writeDataPoint }, writeDataPoint };
}

describe("POST /api/ask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerDependencies.createOpenAIModel.mockReturnValue(model);
  });

  it("leaves non-API routes to the configured asset fallback", async () => {
    const modelFactory = vi.fn<() => GroundedModel>(() => model);
    const worker = createWorker(modelFactory);
    const limit = vi.fn<RateLimit["limit"]>(async () => ({ success: true }));
    const testEnv = env(true, {}, limit);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/not-an-api-route"),
      testEnv,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(404);
    expect(modelFactory).not.toHaveBeenCalled();
    expect(limit).not.toHaveBeenCalled();
  });

  it("rejects unsupported methods before rate limiting", async () => {
    const modelFactory = vi.fn<() => GroundedModel>(() => model);
    const worker = createWorker(modelFactory);
    const limit = vi.fn<RateLimit["limit"]>(async () => ({ success: true }));
    const testEnv = env(true, {}, limit);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask"),
      testEnv,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({ error: "Method not allowed" });
    expect(modelFactory).not.toHaveBeenCalled();
    expect(limit).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before calling a model", async () => {
    const modelFactory = vi.fn<() => GroundedModel>(() => model);
    const worker = createWorker(modelFactory);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", { method: "POST", body: "{" }),
      env(),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON" });
    expect(modelFactory).not.toHaveBeenCalled();
  });

  it("returns the public structured answer contract", async () => {
    const analytics = analyticsBinding();
    const worker = createWorker(() => model);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({
          question: `¿En qué trabajó ${profile.identity.firstName}?`,
          uiLanguage: "en",
        }),
        headers: { "content-type": "application/json" },
      }),
      env(true, { PRODUCT_ANALYTICS: analytics.binding }),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "answered",
      language: "es",
      citations: [{ sourceId: primarySource.sourceId, sectionId: primarySource.sectionId }],
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(analytics.writeDataPoint.mock.calls).toEqual([
      [{ indexes: [profile.identity.slug], blobs: ["question_submitted"], doubles: [1] }],
      [{ indexes: [profile.identity.slug], blobs: ["answer_succeeded"], doubles: [1] }],
    ]);
  });

  it("rejects invalid and oversized requests before calling a model", async () => {
    const modelFactory = vi.fn<() => GroundedModel>(() => model);
    const worker = createWorker(modelFactory);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "x".repeat(501), uiLanguage: "en" }),
      }),
      env(),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(400);
    expect(modelFactory).not.toHaveBeenCalled();
  });

  it("rejects conversation context beyond the six-turn public limit", async () => {
    const modelFactory = vi.fn<() => GroundedModel>(() => model);
    const worker = createWorker(modelFactory);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({
          question: "ClassDojo?",
          uiLanguage: "en",
          history: Array.from({ length: 7 }, (_, index) => ({
            question: `Question ${index}`,
            answer: `Answer ${index}`,
          })),
        }),
      }),
      env(),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(400);
    expect(modelFactory).not.toHaveBeenCalled();
  });

  it("rate-limits the public model endpoint before spending model tokens", async () => {
    const modelFactory = vi.fn<() => GroundedModel>(() => model);
    const worker = createWorker(modelFactory);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "ClassDojo?", uiLanguage: "en" }),
      }),
      env(false),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(429);
    expect(modelFactory).not.toHaveBeenCalled();
  });

  it("returns the localized contact fallback when the daily model budget is exhausted", async () => {
    const analytics = analyticsBinding();
    const modelFactory = vi.fn<() => GroundedModel>(() => model);
    const worker = createWorker(modelFactory, async () => false);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "¿Dónde trabaja Rodrigo?", uiLanguage: "en" }),
      }),
      env(true, { PRODUCT_ANALYTICS: analytics.binding }),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "unknown", language: "es" });
    expect(modelFactory).not.toHaveBeenCalled();
    expect(analytics.writeDataPoint).toHaveBeenCalledOnce();
    expect(analytics.writeDataPoint).toHaveBeenCalledWith({
      indexes: [profile.identity.slug],
      blobs: ["question_submitted"],
      doubles: [1],
    });
  });

  it("uses the bound daily budget in the default production path", async () => {
    const consume = vi.fn<() => Promise<boolean>>(async () => false);
    const getByName = vi.fn<(name: string) => { consume: typeof consume }>(() => ({ consume }));
    const worker = createWorker(() => model);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "Where does Rodrigo work?", uiLanguage: "en" }),
      }),
      env(true, {
        ASK_DAILY_BUDGET: { getByName } as unknown as Env["ASK_DAILY_BUDGET"],
      }),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "unknown", language: "en" });
    expect(getByName).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(consume).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledWith(250);
  });

  it("uses the production model with the configured OpenAI secret", async () => {
    const worker = createWorker();
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "ClassDojo?", uiLanguage: "en" }),
      }),
      env(),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(workerDependencies.createOpenAIModel).toHaveBeenCalledWith("unused-in-test");
  });

  it("uses the configured Workers AI binding without requiring the OpenAI provider", async () => {
    workerDependencies.createWorkersAIModel.mockReturnValue(model);
    const testEnv = { ...env(), AI_PROVIDER: "workers-ai" } as unknown as Env;
    const worker = createWorker();
    const response = await worker.fetch!(
      new Request("https://profile.example/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "ClassDojo?", uiLanguage: "en" }),
      }),
      testEnv,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(workerDependencies.createWorkersAIModel).toHaveBeenCalledWith(
      testEnv.AI,
      "@cf/zai-org/glm-4.7-flash",
    );
    expect(workerDependencies.createOpenAIModel).not.toHaveBeenCalled();
  });

  it("returns the localized honest fallback when model initialization fails", async () => {
    const worker = createWorker(() => {
      throw new Error("Missing secret");
    });
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({
          question: `¿En qué trabajó ${profile.identity.firstName}?`,
          uiLanguage: "en",
        }),
      }),
      env(),
      {} as ExecutionContext,
    );

    await expect(response.json()).resolves.toEqual({
      status: "unknown",
      language: "es",
      answer: profile.presentation.copy.chat.unknown.es,
      citations: [],
    });
  });
});

describe("POST /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records only the allowlisted anonymous chat-open event", async () => {
    const analytics = analyticsBinding();
    const limit = vi.fn<RateLimit["limit"]>(async () => ({ success: true }));
    const worker = createWorker(() => model);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/analytics", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://rodrigouroz.com",
          "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify({ event: "chat_opened" }),
      }),
      env(true, { PRODUCT_ANALYTICS: analytics.binding }, limit),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(limit).toHaveBeenCalledWith({ key: "analytics:local-or-unknown" });
    expect(analytics.writeDataPoint).toHaveBeenCalledWith({
      indexes: [profile.identity.slug],
      blobs: ["chat_opened"],
      doubles: [1],
    });
  });

  it("rejects cross-origin and unknown events without recording them", async () => {
    const analytics = analyticsBinding();
    const worker = createWorker(() => model);
    const crossOriginResponse = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/analytics", {
        method: "POST",
        headers: { origin: "https://example.com", "sec-fetch-site": "cross-site" },
        body: JSON.stringify({ event: "chat_opened" }),
      }),
      env(true, { PRODUCT_ANALYTICS: analytics.binding }),
      {} as ExecutionContext,
    );
    const unknownEventResponse = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/analytics", {
        method: "POST",
        body: JSON.stringify({ event: "question_submitted", question: "private" }),
      }),
      env(true, { PRODUCT_ANALYTICS: analytics.binding }),
      {} as ExecutionContext,
    );

    expect(crossOriginResponse.status).toBe(403);
    expect(unknownEventResponse.status).toBe(400);
    expect(analytics.writeDataPoint).not.toHaveBeenCalled();
  });
});
