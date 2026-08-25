import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanonicalEvidence } from "../src/assistant/contracts";
import type { SemanticSearch } from "../src/assistant/hybridRetrieve";
import type { GroundedModel } from "../src/assistant/model";

const workerDependencies = vi.hoisted(() => ({
  createOpenAIModel: vi.fn<(apiKey: string) => GroundedModel>(),
  createOpenAIVectorSearch:
    vi.fn<(apiKey: string, index: Env["RODRIGO_CORPUS"]) => SemanticSearch>(),
}));

vi.mock("../src/assistant/openaiModel", () => ({
  createOpenAIModel: workerDependencies.createOpenAIModel,
}));
vi.mock("../src/assistant/vectorSearch", () => ({
  createOpenAIVectorSearch: workerDependencies.createOpenAIVectorSearch,
}));
vi.mock("./dailyBudget", () => ({ AskDailyBudget: class AskDailyBudget {} }));
import { createWorker } from "./index";

const model: GroundedModel = {
  draft: vi.fn<GroundedModel["draft"]>(async ({ evidence, language }) => ({
    answer:
      language === "es"
        ? "Rodrigo trabaja en ClassDojo desde 2022."
        : "Rodrigo has worked at ClassDojo since 2022.",
    sourceIds: evidence
      .filter(({ sourceId }: CanonicalEvidence) => sourceId === "classdojo-current-role")
      .map(({ sourceId }: CanonicalEvidence) => sourceId),
  })),
  verify: vi.fn<GroundedModel["verify"]>(async () => ({
    answersQuestion: true,
    languageMatches: true,
    supported: true,
  })),
};

function env(
  rateLimitSuccess = true,
  overrides: Partial<Pick<Env, "ASK_DAILY_BUDGET" | "RODRIGO_CORPUS">> = {},
  limit = vi.fn<RateLimit["limit"]>(async () => ({ success: rateLimitSuccess })),
): Env {
  return {
    ASK_RATE_LIMITER: { limit },
    OPENAI_API_KEY: "unused-in-test",
    ...overrides,
  } as unknown as Env;
}

describe("POST /api/ask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerDependencies.createOpenAIModel.mockReturnValue(model);
    workerDependencies.createOpenAIVectorSearch.mockReturnValue(async () => []);
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
    const worker = createWorker(() => model);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({
          question: "¿En qué trabajó Rodrigo en ClassDojo?",
          uiLanguage: "en",
        }),
        headers: { "content-type": "application/json" },
      }),
      env(),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "answered",
      language: "es",
      citations: [{ sourceId: "classdojo-current-role", sectionId: "experience" }],
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
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
    const modelFactory = vi.fn<() => GroundedModel>(() => model);
    const worker = createWorker(modelFactory, async () => false);
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "¿Dónde trabaja Rodrigo?", uiLanguage: "en" }),
      }),
      env(),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "unknown", language: "es" });
    expect(modelFactory).not.toHaveBeenCalled();
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
  });

  it("uses the production model and Vectorize bindings when the corpus index is available", async () => {
    const semanticSearch = vi.fn<SemanticSearch>(async () => [
      { sourceId: "classdojo-current-role", score: 0.95 },
    ]);
    const vectorIndex = { query: vi.fn<() => never>() } as unknown as Env["RODRIGO_CORPUS"];
    workerDependencies.createOpenAIVectorSearch.mockReturnValue(semanticSearch);
    const worker = createWorker();
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "ClassDojo?", uiLanguage: "en" }),
      }),
      env(true, { RODRIGO_CORPUS: vectorIndex }),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(workerDependencies.createOpenAIModel).toHaveBeenCalledWith("unused-in-test");
    expect(workerDependencies.createOpenAIVectorSearch).toHaveBeenCalledWith(
      "unused-in-test",
      vectorIndex,
    );
    expect(semanticSearch).toHaveBeenCalledWith("ClassDojo?", 6);
  });

  it("returns the localized honest fallback when model initialization fails", async () => {
    const worker = createWorker(() => {
      throw new Error("Missing secret");
    });
    const response = await worker.fetch!(
      new Request("https://rodrigouroz.com/api/ask", {
        method: "POST",
        body: JSON.stringify({
          question: "¿En qué trabajó Rodrigo en ClassDojo?",
          uiLanguage: "en",
        }),
      }),
      env(),
      {} as ExecutionContext,
    );

    await expect(response.json()).resolves.toEqual({
      status: "unknown",
      language: "es",
      answer: "No tengo información suficiente para responder eso.",
      citations: [],
    });
  });
});
