import { describe, expect, it, vi } from "vitest";
import { getCurrentAssistantCorpus } from "../src/assistant/corpus";
import { profile } from "../src/profile";
import { createWorkersAIModel } from "./workersAiModel";
import {
  AUTO_WORKERS_AI_MODEL,
  FREE_WORKERS_AI_MODEL,
  PREMIUM_WORKERS_AI_MODEL,
} from "./workersAiSelection";

const corpus = getCurrentAssistantCorpus("2026-08-25");
const primaryEvidence = corpus[0];
const secondaryEvidence = corpus[1];
if (!primaryEvidence || !secondaryEvidence) throw new Error("Missing test evidence");

function aiWithResponses(contents: string[]) {
  const run = vi.fn<
    (...args: unknown[]) => Promise<{ choices: { message: { content: string } }[] }>
  >(async () => ({
    choices: [{ message: { content: contents.shift() ?? "{}" } }],
  }));
  return { ai: { run } as unknown as Ai, run };
}

function aiWithResult(result: unknown) {
  const run = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => result);
  return { ai: { run } as unknown as Ai, run };
}

describe("Workers AI grounded model", () => {
  it("drafts from the complete corpus with structured output", async () => {
    const { ai, run } = aiWithResponses([
      JSON.stringify({
        answer: `${profile.identity.name} tiene experiencia profesional.`,
        sourceIds: [primaryEvidence.sourceId],
      }),
    ]);
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash", "test-profile");

    await expect(
      model.draft({ corpus, language: "es", question: `¿Dónde trabaja ${profile.identity.name}?` }),
    ).resolves.toEqual({
      answer: `${profile.identity.name} tiene experiencia profesional.`,
      sourceIds: [primaryEvidence.sourceId],
    });

    expect(run).toHaveBeenCalledOnce();
    const [modelName, input] =
      (run.mock.calls as unknown as [string, Record<string, unknown>][])[0] ?? [];
    expect(modelName).toBe("@cf/zai-org/glm-4.7-flash");
    expect(input).toMatchObject({
      reasoning_effort: "low",
      chat_template_kwargs: { enable_thinking: false },
      max_completion_tokens: 700,
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            answer: { type: "string", maxLength: 2_000 },
            sourceIds: { type: "array", maxItems: 12 },
          },
          required: ["answer", "sourceIds"],
        },
      },
      store: false,
      temperature: 0,
    });
    expect(input?.response_format).not.toHaveProperty("json_schema.schema");
    expect(JSON.stringify(input)).toContain(primaryEvidence.sourceId);
    expect(JSON.stringify(input)).toContain("Spanish");
    expect(JSON.stringify(input)).toContain("exact factual intent");
    expect(run.mock.calls[0]?.[2]).toEqual({
      extraHeaders: { "x-session-affinity": "test-profile:draft-v2" },
    });
  });

  it("verifies against only the cited evidence", async () => {
    const { ai, run } = aiWithResponses([
      JSON.stringify({ answersQuestion: true, languageMatches: true, supported: true }),
    ]);
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-5.3-flash", "test-profile");

    await expect(
      model.verify({
        answer: `${profile.identity.name} has professional experience.`,
        evidence: [primaryEvidence],
        history: [
          {
            question: `Where did ${profile.identity.firstName} work?`,
            answer: `${profile.identity.firstName} worked at a company in the public corpus.`,
          },
        ],
        language: "en",
        question: "What did he do there? Incluí las fuentes.",
      }),
    ).resolves.toEqual({ answersQuestion: true, languageMatches: true, supported: true });

    const calls = run.mock.calls as unknown as [string, Record<string, unknown>][];
    expect(JSON.stringify(calls[0]?.[1])).toContain(primaryEvidence.sourceId);
    expect(JSON.stringify(calls[0]?.[1])).not.toContain(secondaryEvidence.sourceId);
    expect(JSON.stringify(calls[0]?.[1])).toContain(
      "USER_QUESTION:\\nWhat did he do there? Incluí las fuentes.",
    );
    expect(JSON.stringify(calls[0]?.[1])).toContain("CONVERSATION_CONTEXT_NOT_EVIDENCE");
    expect(JSON.stringify(calls[0]?.[1])).toContain(
      `Where did ${profile.identity.firstName} work?`,
    );
    expect(JSON.stringify(calls[0]?.[1])).toContain("CITATIONS_RENDERED_BY_APPLICATION");
    expect(JSON.stringify(calls[0]?.[1])).toContain(
      "standard technical terms may remain in their original language",
    );
    expect(calls[0]?.[1]).toMatchObject({ max_completion_tokens: 300, store: false });
    expect(run.mock.calls[0]?.[2]).toEqual({
      extraHeaders: { "x-session-affinity": "test-profile:verify-v2" },
    });
  });

  it("accepts structured objects returned directly by the binding", async () => {
    const expected = {
      answer: `${profile.identity.name} tiene experiencia profesional.`,
      sourceIds: [primaryEvidence.sourceId],
    };
    const { ai } = aiWithResult({ choices: [{ message: { content: expected } }] });
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash", "test-profile");

    await expect(
      model.draft({ corpus, language: "es", question: `¿Dónde trabaja ${profile.identity.name}?` }),
    ).resolves.toEqual(expected);
  });

  it("logs aggregate usage without prompt or response content", async () => {
    const question = `Where does ${profile.identity.firstName} work?`;
    const answer = `${profile.identity.name} has professional experience.`;
    const { ai } = aiWithResult({
      choices: [
        { message: { content: JSON.stringify({ answer, sourceIds: [primaryEvidence.sourceId] }) } },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 20,
        total_tokens: 120,
        prompt_tokens_details: { cached_tokens: 80 },
      },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash", "test-profile");
      await model.draft({ corpus, language: "en", question });

      const usageCall = log.mock.calls.find(([event]) => event === "workers_ai_usage");
      const output = JSON.stringify(log.mock.calls);
      expect(JSON.parse(String(usageCall?.[1]))).toMatchObject({
        promptTokens: 100,
        cachedPromptTokens: 80,
        completionTokens: 20,
        totalTokens: 120,
      });
      expect(output).not.toContain(question);
      expect(output).not.toContain(answer);
    } finally {
      log.mockRestore();
    }
  });

  it("accepts the top-level response shape used by JSON mode", async () => {
    const expected = { answersQuestion: true, languageMatches: true, supported: true };
    const { ai } = aiWithResult({ response: expected });
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash", "test-profile");

    await expect(
      model.verify({
        answer: `${profile.identity.name} has professional experience.`,
        evidence: [primaryEvidence],
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      }),
    ).resolves.toEqual(expected);
  });

  it("fails closed on malformed model JSON", async () => {
    const { ai } = aiWithResponses(["not json"]);
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash", "test-profile");

    await expect(
      model.draft({
        corpus,
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      }),
    ).rejects.toThrow("malformed JSON");
  });

  it("fails closed when a draft exceeds the application answer boundary", async () => {
    const { ai } = aiWithResponses([
      JSON.stringify({ answer: "x".repeat(2_001), sourceIds: [primaryEvidence.sourceId] }),
    ]);
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash", "test-profile");

    await expect(
      model.draft({ corpus, language: "en", question: "Summarize the public profile." }),
    ).rejects.toThrow("invalid structured response");
  });

  it("selects the premium model when the account can use it", async () => {
    const { ai, run } = aiWithResponses([
      JSON.stringify({
        answer: `${profile.identity.name} has professional experience.`,
        sourceIds: [primaryEvidence.sourceId],
      }),
      JSON.stringify({ answersQuestion: true, languageMatches: true, supported: true }),
    ]);
    const persist = vi.fn<(model: string) => Promise<void>>(async () => undefined);
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);

    try {
      const model = createWorkersAIModel(ai, AUTO_WORKERS_AI_MODEL, "test-profile", {
        persist,
      });
      const draft = await model.draft({
        corpus,
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      });
      await model.verify({
        answer: draft.answer,
        evidence: [primaryEvidence],
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      });

      expect(run.mock.calls.map(([modelName]) => modelName)).toEqual([
        PREMIUM_WORKERS_AI_MODEL,
        FREE_WORKERS_AI_MODEL,
      ]);
      expect(log).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledWith(
        "workers_ai_model_selected",
        JSON.stringify({ model: PREMIUM_WORKERS_AI_MODEL, reason: "paid_access" }),
      );
      expect(persist).toHaveBeenCalledOnce();
      expect(persist).toHaveBeenCalledWith(PREMIUM_WORKERS_AI_MODEL);
    } finally {
      log.mockRestore();
    }
  });

  it("falls back on paid-plan error 5035 and remembers the free model", async () => {
    const paidPlanError = new Error("AiError 5035: This model requires a Workers Paid plan");
    const run = vi.fn<(...args: unknown[]) => Promise<unknown>>(async (modelName, input) => {
      if (modelName === PREMIUM_WORKERS_AI_MODEL) throw paidPlanError;
      const required = (
        input as { response_format: { json_schema: { required: readonly string[] } } }
      ).response_format.json_schema.required;
      return {
        choices: [
          {
            message: {
              content: required.includes("answer")
                ? JSON.stringify({
                    answer: `${profile.identity.name} has professional experience.`,
                    sourceIds: [primaryEvidence.sourceId],
                  })
                : JSON.stringify({
                    answersQuestion: true,
                    languageMatches: true,
                    supported: true,
                  }),
            },
          },
        ],
      };
    });
    const persist = vi.fn<(model: string) => Promise<void>>(async () => undefined);
    const selection = { persist };
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    try {
      const model = createWorkersAIModel(
        { run } as unknown as Ai,
        AUTO_WORKERS_AI_MODEL,
        "test-profile",
        selection,
      );
      const draft = await model.draft({
        corpus,
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      });
      await model.verify({
        answer: draft.answer,
        evidence: [primaryEvidence],
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      });

      expect(run.mock.calls.map(([modelName]) => modelName)).toEqual([
        PREMIUM_WORKERS_AI_MODEL,
        FREE_WORKERS_AI_MODEL,
        FREE_WORKERS_AI_MODEL,
      ]);
      expect(selection).toMatchObject({
        resolvedModel: FREE_WORKERS_AI_MODEL,
        lastLoggedModel: FREE_WORKERS_AI_MODEL,
      });
      expect(persist).toHaveBeenCalledOnce();
      expect(persist).toHaveBeenCalledWith(FREE_WORKERS_AI_MODEL);
      expect(info).toHaveBeenCalledWith(
        "workers_ai_model_selected",
        JSON.stringify({ model: FREE_WORKERS_AI_MODEL, reason: "paid_plan_required" }),
      );
    } finally {
      info.mockRestore();
    }
  });

  it("uses a persisted free-plan selection without probing the premium model", async () => {
    const { ai, run } = aiWithResponses([
      JSON.stringify({
        answer: `${profile.identity.name} has professional experience.`,
        sourceIds: [primaryEvidence.sourceId],
      }),
    ]);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    try {
      const model = createWorkersAIModel(ai, AUTO_WORKERS_AI_MODEL, "test-profile", {
        resolvedModel: FREE_WORKERS_AI_MODEL,
      });
      await model.draft({
        corpus,
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      });

      expect(run).toHaveBeenCalledOnce();
      expect(run.mock.calls[0]?.[0]).toBe(FREE_WORKERS_AI_MODEL);
      expect(info).toHaveBeenCalledWith(
        "workers_ai_model_selected",
        JSON.stringify({ model: FREE_WORKERS_AI_MODEL, reason: "persisted" }),
      );
    } finally {
      info.mockRestore();
    }
  });

  it("does not hide transient provider errors behind the free model", async () => {
    const run = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => {
      throw new Error("AiError 3040: No more data centers to forward the request to");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const model = createWorkersAIModel(
        { run } as unknown as Ai,
        AUTO_WORKERS_AI_MODEL,
        "test-profile",
        {},
      );
      await expect(
        model.draft({
          corpus,
          language: "en",
          question: `Where does ${profile.identity.firstName} work?`,
        }),
      ).rejects.toThrow("3040");
      expect(run).toHaveBeenCalledOnce();
      expect(run.mock.calls[0]?.[0]).toBe(PREMIUM_WORKERS_AI_MODEL);
    } finally {
      error.mockRestore();
    }
  });
});
