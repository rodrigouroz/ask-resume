import { describe, expect, it, vi } from "vitest";
import { profile } from "../profile";
import { getCurrentAssistantCorpus } from "./corpus";
import { ANSWER_MODEL, VERIFICATION_MODEL } from "./modelConfig";
import { createOpenAIModel } from "./openaiModel";

const corpus = getCurrentAssistantCorpus("2026-08-25");
const primaryEvidence = corpus[0];
const secondaryEvidence = corpus[1];
if (!primaryEvidence || !secondaryEvidence) throw new Error("Missing test evidence");

describe("OpenAI grounded model", () => {
  it("uses Terra with low reasoning and puts the full corpus before dynamic input", async () => {
    const parse = vi.fn<(input: Record<string, unknown>) => Promise<{ output_parsed: unknown }>>(
      async () => ({
        output_parsed: {
          answer: `${profile.identity.name} tiene experiencia profesional.`,
          sourceIds: [primaryEvidence.sourceId],
        },
      }),
    );
    const model = createOpenAIModel("unused-in-test", { parse });

    await model.draft({
      corpus,
      language: "es",
      question: `¿Dónde trabaja ${profile.identity.name}?`,
    });

    const request = parse.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      model: ANSWER_MODEL,
      store: false,
      reasoning: { effort: "low" },
      moderation: {
        model: "omni-moderation-latest",
        policy: { input: { mode: "block" }, output: { mode: "block" } },
      },
    });
    expect(request?.instructions).not.toContain("Spanish");
    expect(request?.instructions).toContain(
      `You are ${profile.identity.assistantName}, ${profile.identity.name}'s professional assistant`,
    );
    expect(request?.instructions).toContain(`You are not ${profile.identity.firstName}`);
    expect(request?.instructions).toContain("approved public corpus");
    expect(request?.instructions).toContain("no access to private repositories");
    expect(request?.instructions).toContain("empty answer and an empty sourceIds array");

    const input = String(request?.input);
    expect(input).toMatch(/^APPROVED_CORPUS:/);
    expect(input).toContain("Write the complete answer in Spanish.");
    expect(input).toContain(`"sourceId":"${primaryEvidence.sourceId}"`);
    expect(input).toContain(`"sourceId":"${secondaryEvidence.sourceId}"`);
    expect(input.indexOf("APPROVED_CORPUS:")).toBeLessThan(input.indexOf("QUESTION:"));
  });

  it("accepts an empty draft so the application can return its deterministic fallback", async () => {
    const parse = vi.fn<() => Promise<{ output_parsed: unknown }>>(async () => ({
      output_parsed: { answer: "", sourceIds: [] },
    }));
    const model = createOpenAIModel("unused-in-test", { parse });

    await expect(
      model.draft({
        corpus,
        language: "en",
        question: `What is ${profile.identity.firstName}'s salary?`,
      }),
    ).resolves.toEqual({ answer: "", sourceIds: [] });
  });

  it("uses Sol with low reasoning to verify only the cited evidence", async () => {
    const parse = vi.fn<(input: Record<string, unknown>) => Promise<{ output_parsed: unknown }>>(
      async () => ({
        output_parsed: { answersQuestion: true, languageMatches: true, supported: true },
      }),
    );
    const model = createOpenAIModel("unused-in-test", { parse });

    await model.verify({
      answer: `${profile.identity.name} has professional experience.`,
      evidence: [primaryEvidence],
      language: "en",
      question: `Where does ${profile.identity.firstName} work? Please cite the relevant evidence.`,
    });

    const request = parse.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      model: VERIFICATION_MODEL,
      reasoning: { effort: "low" },
      store: false,
    });
    expect(request?.input).toContain(`"sourceId":"${primaryEvidence.sourceId}"`);
    expect(request?.input).not.toContain(`"sourceId":"${secondaryEvidence.sourceId}"`);
    expect(request?.input).toContain(
      `CITATIONS_RENDERED_BY_APPLICATION:\n["${primaryEvidence.sourceId}"]`,
    );
    expect(request?.input).toContain(
      `FACTUAL_QUESTION_FOR_VERIFICATION:\nWhere does ${profile.identity.firstName} work?`,
    );
    expect(request?.instructions).toContain("every factual claim");
    expect(request?.instructions).toContain(
      "Citation requests are fulfilled separately by the application",
    );
  });
});
