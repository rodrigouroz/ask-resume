import { describe, expect, it, vi } from "vitest";
import { getCurrentAssistantCorpus } from "../src/assistant/corpus";
import { profile } from "../src/profile";
import { createWorkersAIModel } from "./workersAiModel";

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
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash");

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
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          additionalProperties: false,
          required: ["answer", "sourceIds"],
        },
      },
      temperature: 0,
    });
    expect(input?.response_format).not.toHaveProperty("json_schema.schema");
    expect(JSON.stringify(input)).toContain(primaryEvidence.sourceId);
    expect(JSON.stringify(input)).toContain("Spanish");
  });

  it("verifies against only the cited evidence", async () => {
    const { ai, run } = aiWithResponses([
      JSON.stringify({ answersQuestion: true, languageMatches: true, supported: true }),
    ]);
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-5.3-flash");

    await expect(
      model.verify({
        answer: `${profile.identity.name} has professional experience.`,
        evidence: [primaryEvidence],
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      }),
    ).resolves.toEqual({ answersQuestion: true, languageMatches: true, supported: true });

    const calls = run.mock.calls as unknown as [string, Record<string, unknown>][];
    expect(JSON.stringify(calls[0]?.[1])).toContain(primaryEvidence.sourceId);
    expect(JSON.stringify(calls[0]?.[1])).not.toContain(secondaryEvidence.sourceId);
  });

  it("accepts structured objects returned directly by the binding", async () => {
    const expected = {
      answer: `${profile.identity.name} tiene experiencia profesional.`,
      sourceIds: [primaryEvidence.sourceId],
    };
    const { ai } = aiWithResult({ choices: [{ message: { content: expected } }] });
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash");

    await expect(
      model.draft({ corpus, language: "es", question: `¿Dónde trabaja ${profile.identity.name}?` }),
    ).resolves.toEqual(expected);
  });

  it("accepts the top-level response shape used by JSON mode", async () => {
    const expected = { answersQuestion: true, languageMatches: true, supported: true };
    const { ai } = aiWithResult({ response: expected });
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash");

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
    const model = createWorkersAIModel(ai, "@cf/zai-org/glm-4.7-flash");

    await expect(
      model.draft({
        corpus,
        language: "en",
        question: `Where does ${profile.identity.firstName} work?`,
      }),
    ).rejects.toThrow("malformed JSON");
  });
});
