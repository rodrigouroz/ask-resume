import type { Language } from "../content";
import type { AskRequest, AskResponse } from "./contracts";
import { getCurrentAssistantCorpus } from "./corpus";
import { todayIsoDate } from "./corpusValidation";
import { resolveResponseLanguage } from "./language";
import type { GroundedModel } from "./model";

const fallback: Record<Language, string> = {
  en: "I don’t have enough information to answer that.",
  es: "No tengo información suficiente para responder eso.",
};

export function unknownAnswer(language: Language): AskResponse {
  return { status: "unknown", language, answer: fallback[language], citations: [] };
}

export function createAnswerService({ model }: { model: GroundedModel }) {
  return async function answerQuestion({
    question,
    uiLanguage,
    history = [],
    safetyId,
  }: AskRequest): Promise<AskResponse> {
    const language = resolveResponseLanguage(question, uiLanguage);
    const safety = safetyId ? { safetyIdentifier: safetyId } : {};

    try {
      const corpus = getCurrentAssistantCorpus(todayIsoDate());
      const draft = await model.draft({ corpus, history, language, question, ...safety });
      const sourceIds = [...new Set(draft.sourceIds)];
      if (draft.answer.trim().length === 0 || sourceIds.length === 0) {
        return unknownAnswer(language);
      }

      const sourcesById = new Map(corpus.map((source) => [source.sourceId, source]));
      const citedEvidence = sourceIds.flatMap((sourceId) => {
        const source = sourcesById.get(sourceId);
        return source ? [source] : [];
      });
      if (citedEvidence.length !== sourceIds.length) return unknownAnswer(language);

      const verification = await model.verify({
        answer: draft.answer,
        evidence: citedEvidence,
        language,
        question,
        ...safety,
      });

      if (
        !verification.answersQuestion ||
        !verification.supported ||
        !verification.languageMatches
      ) {
        return unknownAnswer(language);
      }

      const citations = citedEvidence.map(({ sectionId, sourceId }) => ({ sectionId, sourceId }));
      return { status: "answered", language, answer: draft.answer, citations };
    } catch {
      return unknownAnswer(language);
    }
  };
}
