import type { Language } from "../content";
import type { AskRequest, AskResponse } from "./contracts";
import { resolveResponseLanguage } from "./language";
import type { GroundedModel } from "./model";
import { retrieveEvidence } from "./retrieve";
import type { EvidenceRetriever } from "./retrieve";

const fallback: Record<Language, string> = {
  en: "I don’t have enough approved evidence to answer that. You can contact Rodrigo directly and ask him.",
  es: "No tengo evidencia aprobada suficiente para responder eso. Podés contactar a Rodrigo y preguntarle directamente.",
};

export function unknownAnswer(language: Language): AskResponse {
  return { status: "unknown", language, answer: fallback[language], citations: [] };
}

export function createAnswerService({
  model,
  retrieve = retrieveEvidence,
}: {
  model: GroundedModel;
  retrieve?: EvidenceRetriever;
}) {
  return async function answerQuestion({
    question,
    uiLanguage,
    history = [],
    safetyId,
  }: AskRequest): Promise<AskResponse> {
    const language = resolveResponseLanguage(question, uiLanguage);
    const safety = safetyId ? { safetyIdentifier: safetyId } : {};

    try {
      const evidence = await retrieve(question);

      if (evidence.length === 0) return unknownAnswer(language);

      const draft = await model.draft({ evidence, history, language, question, ...safety });
      const allowedSources = new Map(evidence.map((source) => [source.sourceId, source]));
      const citations = [...new Set(draft.sourceIds)].flatMap((sourceId) => {
        const source = allowedSources.get(sourceId);
        return source ? [{ sourceId: source.sourceId, sectionId: source.sectionId }] : [];
      });
      const citedEvidence = citations.flatMap((citation) => {
        const source = allowedSources.get(citation.sourceId);
        return source ? [source] : [];
      });
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
        !verification.languageMatches ||
        citations.length === 0
      ) {
        return unknownAnswer(language);
      }

      return { status: "answered", language, answer: draft.answer, citations };
    } catch {
      return unknownAnswer(language);
    }
  };
}
