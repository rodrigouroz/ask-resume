import { afterEach, describe, expect, it, vi } from "vitest";
import { profile } from "../profile";
import { getCurrentAssistantCorpus } from "./corpus";
import { ANSWER_MODEL, VERIFICATION_MODEL } from "./modelConfig";
import { createOpenAIModel } from "./openaiModel";

const corpus = getCurrentAssistantCorpus("2026-08-25");
const primaryEvidence = corpus[0];
if (!primaryEvidence) throw new Error("Missing test evidence");

describe("OpenAI grounded model", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the Responses API directly and parses structured output", async () => {
    const fetcher = vi.fn<() => Promise<Response>>(async () =>
      Response.json({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: `{"answer":"Grounded","sourceIds":["${primaryEvidence.sourceId}"]}`,
              },
            ],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const model = createOpenAIModel("test-key");

    await expect(
      model.draft({ corpus, language: "en", question: "Summarize the public profile." }),
    ).resolves.toEqual({
      resolvedQuestion: "Summarize the public profile.",
      answer: "Grounded",
      sourceIds: [primaryEvidence.sourceId],
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer test-key" }),
      }),
    );
  });

  it("reports provider failures without exposing the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<() => Promise<Response>>(
        async () => new Response("sensitive provider detail", { status: 401 }),
      ),
    );
    const model = createOpenAIModel("test-key");

    await expect(
      model.draft({ corpus, language: "en", question: "Summarize the public profile." }),
    ).rejects.toThrow("OpenAI Responses API failed with 401");
  });

  it("uses Terra with low reasoning and puts the full corpus before dynamic input", async () => {
    const resolvedQuestion = `What are ${profile.identity.name}'s professional interests?`;
    const parse = vi.fn<(input: Record<string, unknown>) => Promise<{ output_parsed: unknown }>>();
    parse.mockResolvedValueOnce({ output_parsed: { resolvedQuestion } });
    parse.mockResolvedValueOnce({
      output_parsed: {
        answer: `${profile.identity.name} tiene experiencia profesional.`,
        sourceIds: [primaryEvidence.sourceId],
      },
    });
    const model = createOpenAIModel("unused-in-test", { parse });

    await model.draft({
      corpus,
      history: [
        {
          question: `What are ${profile.identity.firstName}'s interests?`,
          answer: `${profile.identity.firstName} has interests outside work.`,
        },
      ],
      language: "es",
      question: "¿Y en lo profesional?",
      safetyIdentifier: "550e8400-e29b-41d4-a716-446655440000",
    });

    const resolutionRequest = parse.mock.calls[0]?.[0];
    const request = parse.mock.calls[1]?.[0];
    expect(resolutionRequest).toMatchObject({
      model: ANSWER_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 120,
      moderation: {
        model: "omni-moderation-latest",
        policy: { input: { mode: "block" }, output: { mode: "block" } },
      },
      safety_identifier: "550e8400-e29b-41d4-a716-446655440000",
      text: {
        format: {
          type: "json_schema",
          name: "resolved_question",
          strict: true,
        },
      },
    });

    expect(request).toMatchObject({
      model: ANSWER_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 700,
      moderation: {
        model: "omni-moderation-latest",
        policy: { input: { mode: "block" }, output: { mode: "block" } },
      },
      safety_identifier: "550e8400-e29b-41d4-a716-446655440000",
      text: {
        format: {
          type: "json_schema",
          name: "grounded_answer",
          strict: true,
        },
      },
    });
    expect(model.safetyIdentifierSupport).toBe("provider");
    const input = String(request?.input);
    expect(input).toMatch(/^APPROVED_CORPUS:/);
    expect(input).toContain(`"sourceId":"${primaryEvidence.sourceId}"`);
    expect(input).toContain(`CURRENT_QUESTION:\n${resolvedQuestion}`);
  });

  it("accepts an empty draft so the application can return its deterministic fallback", async () => {
    const parse = vi.fn<() => Promise<{ output_parsed: unknown }>>(async () => ({
      output_parsed: {
        answer: "",
        sourceIds: [],
      },
    }));
    const model = createOpenAIModel("unused-in-test", { parse });

    await expect(
      model.draft({
        corpus,
        language: "en",
        question: `What is ${profile.identity.firstName}'s salary?`,
      }),
    ).resolves.toEqual({
      resolvedQuestion: `What is ${profile.identity.firstName}'s salary?`,
      answer: "",
      sourceIds: [],
    });
  });

  it("uses Sol with low reasoning and structured verification output", async () => {
    const parse = vi.fn<(input: Record<string, unknown>) => Promise<{ output_parsed: unknown }>>(
      async () => ({
        output_parsed: { answersQuestion: true, languageMatches: true, supported: true },
      }),
    );
    const model = createOpenAIModel("unused-in-test", { parse });

    await model.verify({
      answer: `${profile.identity.name} has professional experience.`,
      evidence: [primaryEvidence],
      history: [
        {
          question: `Where did ${profile.identity.firstName} work?`,
          answer: `${profile.identity.firstName} worked at a company in the public corpus.`,
        },
      ],
      language: "en",
      question: "What did he do there? Por favor, citá las fuentes.",
    });

    const request = parse.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      model: VERIFICATION_MODEL,
      reasoning: { effort: "low" },
      max_output_tokens: 300,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "grounding_verification",
          strict: true,
        },
      },
    });
    expect(request?.input).toContain(`"sourceId":"${primaryEvidence.sourceId}"`);
  });

  it("rejects drafts beyond the application answer boundary", async () => {
    const parse = vi.fn<() => Promise<{ output_parsed: unknown }>>(async () => ({
      output_parsed: {
        answer: "x".repeat(2_001),
        sourceIds: [primaryEvidence.sourceId],
      },
    }));
    const model = createOpenAIModel("unused-in-test", { parse });

    await expect(
      model.draft({ corpus, language: "en", question: "Summarize the public profile." }),
    ).rejects.toThrow("Too big");
  });
});
