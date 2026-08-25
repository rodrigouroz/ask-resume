import { describe, expect, it, vi } from "vitest";
import { getCurrentAssistantCorpus } from "./corpus";
import { ASSISTANT_MODEL } from "./modelConfig";
import { createOpenAIModel } from "./openaiModel";

const classDojoEvidence = getCurrentAssistantCorpus("2026-08-25").find(
  ({ sourceId }) => sourceId === "classdojo-current-role",
);
if (!classDojoEvidence) throw new Error("Missing ClassDojo test evidence");
const evidence = [classDojoEvidence];

describe("OpenAI grounded model", () => {
  it("forces the model to use the corpus search tool before answering", async () => {
    const parse = vi.fn<(input: Record<string, unknown>) => Promise<Record<string, unknown>>>(
      async () => ({
        output: [
          {
            type: "function_call",
            name: "search_rodrigo_corpus",
            arguments: JSON.stringify({ query: "ClassDojo LLM Langfuse" }),
          },
        ],
      }),
    );
    const model = createOpenAIModel("unused-in-test", { parse });

    await expect(
      model.search?.({ language: "es", question: "¿Qué hizo con LLMs en ClassDojo?" }),
    ).resolves.toEqual({ query: "ClassDojo LLM Langfuse" });

    expect(parse.mock.calls[0]?.[0]).toMatchObject({
      model: ASSISTANT_MODEL,
      store: false,
      max_tool_calls: 1,
      moderation: {
        model: "omni-moderation-latest",
        policy: { input: { mode: "block" }, output: { mode: "block" } },
      },
      tool_choice: { type: "function", name: "search_rodrigo_corpus" },
    });
    expect(parse.mock.calls[0]?.[0].tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "function", name: "search_rodrigo_corpus", strict: true }),
      ]),
    );
  });

  it("uses GPT-5.6 Sol without persistence and requests the selected response language", async () => {
    const parse = vi.fn<(input: Record<string, unknown>) => Promise<{ output_parsed: unknown }>>(
      async (_input) => ({
        output_parsed: {
          answer: "Rodrigo trabaja en ClassDojo.",
          sourceIds: ["classdojo-current-role"],
        },
      }),
    );
    const model = createOpenAIModel("unused-in-test", { parse });

    await model.draft({ evidence, language: "es", question: "¿Dónde trabaja Rodrigo?" });

    expect(parse).toHaveBeenCalledOnce();
    expect(parse.mock.calls[0]?.[0]).toMatchObject({
      model: ASSISTANT_MODEL,
      store: false,
      reasoning: { effort: "medium" },
    });
    expect(parse.mock.calls[0]?.[0].instructions).toContain("Spanish");
    expect(parse.mock.calls[0]?.[0].instructions).toContain(
      "You are Alfred, Rodrigo Uroz's professional assistant",
    );
    expect(parse.mock.calls[0]?.[0].instructions).toContain("You are not Rodrigo");
    expect(parse.mock.calls[0]?.[0].instructions).toContain("approved public corpus");
    expect(parse.mock.calls[0]?.[0].instructions).toContain("no access to private repositories");
    expect(parse.mock.calls[0]?.[0].instructions).toContain("direct the visitor to Rodrigo");
  });

  it("verifies every claim against only the cited evidence", async () => {
    const parse = vi.fn<(input: Record<string, unknown>) => Promise<{ output_parsed: unknown }>>(
      async (_input) => ({
        output_parsed: { answersQuestion: true, languageMatches: true, supported: true },
      }),
    );
    const model = createOpenAIModel("unused-in-test", { parse });

    await expect(
      model.verify({
        answer: "Rodrigo works at ClassDojo.",
        evidence,
        language: "en",
        question: "Where does Rodrigo work?",
      }),
    ).resolves.toEqual({ answersQuestion: true, languageMatches: true, supported: true });
    expect(parse.mock.calls[0]?.[0].input).toContain("Rodrigo works at ClassDojo.");
    expect(parse.mock.calls[0]?.[0].input).toContain("Where does Rodrigo work?");
    expect(parse.mock.calls[0]?.[0].instructions).toContain("every factual claim");
  });
});
