import { describe, expect, it, vi } from "vitest";
import type { CanonicalEvidence } from "../src/assistant/contracts";
import type { GroundedModel } from "../src/assistant/model";
vi.mock("./dailyBudget", () => ({ AskDailyBudget: class AskDailyBudget {} }));
import { createWorker } from "./index";

const model: GroundedModel = {
  draft: vi.fn<GroundedModel["draft"]>(async ({ evidence, language }) => ({
    answer:
      language === "es"
        ? "Rodrigo trabaja en ClassDojo desde 2022."
        : "Rodrigo has worked at ClassDojo since 2022.",
    sourceIds: evidence.map(({ sourceId }: CanonicalEvidence) => sourceId),
  })),
  verify: vi.fn<GroundedModel["verify"]>(async () => ({
    answersQuestion: true,
    languageMatches: true,
    supported: true,
  })),
};

function env(rateLimitSuccess = true): Env {
  return {
    ASK_RATE_LIMITER: {
      limit: vi.fn<RateLimit["limit"]>(async () => ({ success: rateLimitSuccess })),
    },
    OPENAI_API_KEY: "unused-in-test",
  } as unknown as Env;
}

describe("POST /api/ask", () => {
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
      answer:
        "No tengo evidencia aprobada suficiente para responder eso. Podés contactar a Rodrigo y preguntarle directamente.",
      citations: [],
    });
  });
});
