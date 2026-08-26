import { describe, expect, it, vi } from "vitest";
import { getCurrentAssistantCorpus } from "./corpus";
import { ANSWER_MODEL, VERIFICATION_MODEL } from "./modelConfig";
import { createOpenAIModel } from "./openaiModel";

const corpus = getCurrentAssistantCorpus("2026-08-25");
const classDojoEvidence = corpus.find(({ sourceId }) => sourceId === "classdojo-current-role");
if (!classDojoEvidence) throw new Error("Missing ClassDojo test evidence");

describe("OpenAI grounded model", () => {
  it("uses Terra with low reasoning and puts the full corpus before dynamic input", async () => {
    const parse = vi.fn<(input: Record<string, unknown>) => Promise<{ output_parsed: unknown }>>(
      async () => ({
        output_parsed: {
          answer: "Rodrigo trabaja en ClassDojo.",
          sourceIds: ["classdojo-current-role"],
        },
      }),
    );
    const model = createOpenAIModel("unused-in-test", { parse });

    await model.draft({ corpus, language: "es", question: "¿Dónde trabaja Rodrigo?" });

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
    expect(request?.instructions).toContain("Spanish");
    expect(request?.instructions).toContain(
      "You are Alfred, Rodrigo Uroz's professional assistant",
    );
    expect(request?.instructions).toContain("You are not Rodrigo");
    expect(request?.instructions).toContain("approved public corpus");
    expect(request?.instructions).toContain("no access to private repositories");
    expect(request?.instructions).toContain("empty answer and an empty sourceIds array");

    const input = String(request?.input);
    expect(input).toMatch(/^APPROVED_CORPUS:/);
    expect(input).toContain('"sourceId":"classdojo-current-role"');
    expect(input).toContain('"sourceId":"coro-product"');
    expect(input.indexOf("APPROVED_CORPUS:")).toBeLessThan(input.indexOf("QUESTION:"));
  });

  it("accepts an empty draft so the application can return its deterministic fallback", async () => {
    const parse = vi.fn<() => Promise<{ output_parsed: unknown }>>(async () => ({
      output_parsed: { answer: "", sourceIds: [] },
    }));
    const model = createOpenAIModel("unused-in-test", { parse });

    await expect(
      model.draft({ corpus, language: "en", question: "What is Rodrigo's salary?" }),
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
      answer: "Rodrigo works at ClassDojo.",
      evidence: [classDojoEvidence],
      language: "en",
      question: "Where does Rodrigo work?",
    });

    const request = parse.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      model: VERIFICATION_MODEL,
      reasoning: { effort: "low" },
      store: false,
    });
    expect(request?.input).toContain('"sourceId":"classdojo-current-role"');
    expect(request?.input).not.toContain('"sourceId":"coro-product"');
    expect(request?.instructions).toContain("every factual claim");
  });
});
