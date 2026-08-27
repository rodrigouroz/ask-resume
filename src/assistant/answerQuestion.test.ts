import { describe, expect, it, vi } from "vitest";
import { evidenceConfig, profile } from "../profile";
import { createAnswerService } from "./answerQuestion";
import type { GroundedModel } from "./model";

const primarySource = evidenceConfig.items[0];
const secondarySource = evidenceConfig.items.find(
  ({ sourceId }) => sourceId !== primarySource?.sourceId,
);
if (!primarySource || !secondarySource) throw new Error("Missing test evidence");

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
          ? `${profile.identity.name} tiene experiencia profesional.`
          : `${profile.identity.name} has professional experience.`,
      sourceIds: [primarySource.sourceId],
    }));
    const answerQuestion = createAnswerService({ model: { draft, verify: approvingVerifier() } });

    const english = await answerQuestion({
      question: `What has ${profile.identity.firstName} worked on?`,
      uiLanguage: "es",
    });
    const spanish = await answerQuestion({
      question: `¿En qué trabajó ${profile.identity.firstName}?`,
      uiLanguage: "en",
    });

    expect(english.language).toBe("en");
    expect(spanish.language).toBe("es");
    expect(english.citations).toEqual([
      { sourceId: primarySource.sourceId, sectionId: primarySource.sectionId },
    ]);
    expect(spanish.citations).toEqual(english.citations);
    expect(draft.mock.calls[0]?.[0].corpus.length).toBe(evidenceConfig.items.length);
    expect(draft.mock.calls[1]?.[0].corpus).toEqual(draft.mock.calls[0]?.[0].corpus);
  });

  it("uses the UI language when the question is mixed or ambiguous", async () => {
    const draft = vi.fn<GroundedModel["draft"]>(async ({ language }) => ({
      answer: language === "es" ? "Respuesta en español." : "Answer in English.",
      sourceIds: [primarySource.sourceId],
    }));
    const answerQuestion = createAnswerService({ model: { draft, verify: approvingVerifier() } });

    const mixed = await answerQuestion({
      question: `What experiencia does ${profile.identity.firstName} have?`,
      uiLanguage: "es",
    });
    const ambiguous = await answerQuestion({ question: "Experience?", uiLanguage: "en" });

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
      question: `¿Cuál es la expectativa salarial de ${profile.identity.firstName}?`,
      uiLanguage: "en",
    });

    expect(response).toEqual({
      status: "unknown",
      language: "es",
      answer: profile.presentation.copy.chat.unknown.es,
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
        answer: `${profile.identity.name} has verified public work.`,
        sourceIds: [secondarySource.sourceId, secondarySource.sourceId],
      })),
      verify,
    };
    const answerQuestion = createAnswerService({ model });

    const response = await answerQuestion({
      question: `What did ${profile.identity.firstName} build?`,
      uiLanguage: "en",
    });

    expect(response.citations).toEqual([
      { sourceId: secondarySource.sourceId, sectionId: secondarySource.sectionId },
    ]);
    expect(verify.mock.calls[0]?.[0].evidence.map(({ sourceId }) => sourceId)).toEqual([
      secondarySource.sourceId,
    ]);
  });

  it("never exposes an answer rejected by the verifier", async () => {
    const unsupportedFact = `${profile.identity.name} founded an unverified company.`;
    const model: GroundedModel = {
      draft: vi.fn<GroundedModel["draft"]>(async () => ({
        answer: unsupportedFact,
        sourceIds: [primarySource.sourceId],
      })),
      verify: vi.fn<GroundedModel["verify"]>(async () => ({
        answersQuestion: true,
        languageMatches: true,
        supported: false,
      })),
    };
    const answerQuestion = createAnswerService({ model });

    const response = await answerQuestion({
      question: `What has ${profile.identity.firstName} worked on?`,
      uiLanguage: "en",
    });

    expect(response.status).toBe("unknown");
    expect(response.answer).not.toContain(unsupportedFact);
    expect(response.citations).toEqual([]);
  });
});
