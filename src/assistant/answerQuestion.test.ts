import { describe, expect, it, vi } from "vitest";
import { createAnswerService } from "./answerQuestion";
import type { CanonicalEvidence } from "./contracts";
import type { GroundedModel } from "./model";

describe("bilingual grounded answers", () => {
  it("retrieves the same evidence for equivalent English and Spanish questions and answers in the question language", async () => {
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async ({ evidence, language }) => ({
        answer:
          language === "es"
            ? "Rodrigo trabaja en ClassDojo como Fullstack Software Engineer desde 2022."
            : "Rodrigo has worked at ClassDojo as a Fullstack Software Engineer since 2022.",
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
    const answerQuestion = createAnswerService({ model });

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
    expect(english.answer).toMatch(/^Rodrigo has worked/);
    expect(spanish.answer).toMatch(/^Rodrigo trabaja/);
  });

  it("uses the UI language when the question is mixed or linguistically ambiguous", async () => {
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async ({ evidence, language }) => ({
        answer: language === "es" ? "Respuesta en español." : "Answer in English.",
        sourceIds: evidence.map(({ sourceId }: CanonicalEvidence) => sourceId),
      })),
      verify: vi.fn<GroundedModel["verify"]>(async () => ({
        answersQuestion: true,
        languageMatches: true,
        supported: true,
      })),
    };
    const answerQuestion = createAnswerService({ model });

    const mixed = await answerQuestion({
      question: "What experiencia does Rodrigo have at ClassDojo?",
      uiLanguage: "es",
    });
    const ambiguous = await answerQuestion({ question: "ClassDojo?", uiLanguage: "en" });

    expect(mixed.language).toBe("es");
    expect(mixed.answer).toBe("Respuesta en español.");
    expect(ambiguous.language).toBe("en");
    expect(ambiguous.answer).toBe("Answer in English.");
  });

  it("returns an honest localized fallback without calling the model when retrieval has no evidence", async () => {
    const draft = vi.fn<GroundedModel["draft"]>();
    const verify = vi.fn<GroundedModel["verify"]>();
    const model: GroundedModel = { draft, verify };
    const answerQuestion = createAnswerService({ model });

    const response = await answerQuestion({
      question: "¿Cuál es la expectativa salarial de Rodrigo?",
      uiLanguage: "en",
    });

    expect(response).toEqual({
      status: "unknown",
      language: "es",
      answer:
        "No tengo evidencia aprobada suficiente para responder eso. Podés contactar a Rodrigo y preguntarle directamente.",
      citations: [],
    });
    expect(draft).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it("never exposes an answer that the grounding verifier marks as unsupported", async () => {
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

  it("rejects a grounded answer that does not actually answer the question", async () => {
    const relatedEvidence = {
      sourceId: "leadership-capability",
      sectionId: "capabilities",
      title: "Leadership · Capabilities",
      searchTerms: ["leadership"],
      facts: [
        {
          factId: "leadership-progression",
          text: "Rodrigo has moved between hands-on engineering and people management.",
          entities: ["Rodrigo Uroz"],
          reviewedAt: "2026-08-25",
        },
      ],
    } as const satisfies CanonicalEvidence;
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async () => ({
        answer: "Rodrigo moved from management because he prefers hands-on work.",
        sourceIds: ["leadership-capability"],
      })),
      verify: vi.fn<GroundedModel["verify"]>(async () => ({
        answersQuestion: false,
        languageMatches: true,
        supported: true,
      })),
    };
    const answerQuestion = createAnswerService({
      model,
      retrieve: async () => [relatedEvidence],
    });

    const response = await answerQuestion({
      question: "Why did Rodrigo leave engineering management?",
      uiLanguage: "en",
    });

    expect(response.status).toBe("unknown");
    expect(response.citations).toEqual([]);
  });

  it("keeps project evidence canonical while retrieving it from either language", async () => {
    const draftedSourceIds: string[][] = [];
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async ({ evidence, language }) => {
        draftedSourceIds.push(evidence.map(({ sourceId }: CanonicalEvidence) => sourceId));
        return {
          answer:
            language === "es"
              ? "Coro explora conversaciones globales entre idiomas."
              : "Coro explores global conversations across languages.",
          sourceIds: evidence.map(({ sourceId }: CanonicalEvidence) => sourceId),
        };
      }),
      verify: vi.fn<GroundedModel["verify"]>(async () => ({
        answersQuestion: true,
        languageMatches: true,
        supported: true,
      })),
    };
    const answerQuestion = createAnswerService({ model });

    const english = await answerQuestion({
      question: "What did Rodrigo build in Coro?",
      uiLanguage: "es",
    });
    const spanish = await answerQuestion({
      question: "¿Qué construyó Rodrigo en Coro?",
      uiLanguage: "en",
    });

    expect(english.citations).toEqual([{ sourceId: "coro-product", sectionId: "projects" }]);
    expect(spanish.citations).toEqual(english.citations);
    expect(draftedSourceIds).toEqual([["coro-product"], ["coro-product"]]);
  });
});
