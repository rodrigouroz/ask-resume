import { describe, expect, it, vi } from "vitest";
import { createAnswerService } from "./answerQuestion";
import type { GroundedModel } from "./model";

function approvingVerifier() {
  return vi.fn<GroundedModel["verify"]>(async () => ({
    answersQuestion: true,
    languageMatches: true,
    supported: true,
  }));
}

describe("bilingual grounded answers", () => {
  it("drafts from the full corpus and answers in the question language", async () => {
    const draft = vi.fn<GroundedModel["draft"]>(async ({ language }) => ({
      answer:
        language === "es"
          ? "Rodrigo trabaja en ClassDojo desde 2022."
          : "Rodrigo has worked at ClassDojo since 2022.",
      sourceIds: ["classdojo-current-role"],
    }));
    const answerQuestion = createAnswerService({ model: { draft, verify: approvingVerifier() } });

    const english = await answerQuestion({
      question: "What has Rodrigo worked on at ClassDojo?",
      uiLanguage: "es",
    });
    const spanish = await answerQuestion({
      question: "¿En qué trabajó Rodrigo en ClassDojo?",
      uiLanguage: "en",
    });

    expect(english.language).toBe("en");
    expect(spanish.language).toBe("es");
    expect(english.citations).toEqual([
      { sourceId: "classdojo-current-role", sectionId: "experience" },
    ]);
    expect(spanish.citations).toEqual(english.citations);
    expect(draft.mock.calls[0]?.[0].corpus.length).toBeGreaterThan(20);
    expect(draft.mock.calls[1]?.[0].corpus).toEqual(draft.mock.calls[0]?.[0].corpus);
  });

  it("uses the UI language when the question is mixed or ambiguous", async () => {
    const draft = vi.fn<GroundedModel["draft"]>(async ({ language }) => ({
      answer: language === "es" ? "Respuesta en español." : "Answer in English.",
      sourceIds: ["classdojo-current-role"],
    }));
    const answerQuestion = createAnswerService({ model: { draft, verify: approvingVerifier() } });

    const mixed = await answerQuestion({
      question: "What experiencia does Rodrigo have at ClassDojo?",
      uiLanguage: "es",
    });
    const ambiguous = await answerQuestion({ question: "ClassDojo?", uiLanguage: "en" });

    expect(mixed.language).toBe("es");
    expect(ambiguous.language).toBe("en");
  });

  it("skips verification when the corpus cannot answer", async () => {
    const verify = vi.fn<GroundedModel["verify"]>();
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async () => ({ answer: "", sourceIds: [] })),
      verify,
    };
    const answerQuestion = createAnswerService({ model });

    const response = await answerQuestion({
      question: "¿Cuál es la expectativa salarial de Rodrigo?",
      uiLanguage: "en",
    });

    expect(response).toEqual({
      status: "unknown",
      language: "es",
      answer: "No tengo información suficiente para responder eso.",
      citations: [],
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects unknown source ids without calling the verifier", async () => {
    const verify = vi.fn<GroundedModel["verify"]>();
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async () => ({
        answer: "A private claim.",
        sourceIds: ["private-repository"],
      })),
      verify,
    };
    const answerQuestion = createAnswerService({ model });

    const response = await answerQuestion({ question: "Tell me a secret", uiLanguage: "en" });

    expect(response.status).toBe("unknown");
    expect(verify).not.toHaveBeenCalled();
  });

  it("verifies only the sources cited by the draft", async () => {
    const verify = approvingVerifier();
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async () => ({
        answer: "Coro explores global conversations across languages.",
        sourceIds: ["coro-product", "coro-product"],
      })),
      verify,
    };
    const answerQuestion = createAnswerService({ model });

    const response = await answerQuestion({
      question: "What did Rodrigo build in Coro?",
      uiLanguage: "en",
    });

    expect(response.citations).toEqual([{ sourceId: "coro-product", sectionId: "projects" }]);
    expect(verify.mock.calls[0]?.[0].evidence.map(({ sourceId }) => sourceId)).toEqual([
      "coro-product",
    ]);
  });

  it("never exposes an answer rejected by the verifier", async () => {
    const unsupportedFact = "Rodrigo founded ClassDojo.";
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async () => ({
        answer: unsupportedFact,
        sourceIds: ["classdojo-current-role"],
      })),
      verify: vi.fn<GroundedModel["verify"]>(async () => ({
        answersQuestion: true,
        languageMatches: true,
        supported: false,
      })),
    };
    const answerQuestion = createAnswerService({ model });

    const response = await answerQuestion({
      question: "What has Rodrigo worked on at ClassDojo?",
      uiLanguage: "en",
    });

    expect(response.status).toBe("unknown");
    expect(response.answer).not.toContain(unsupportedFact);
    expect(response.citations).toEqual([]);
  });
});
