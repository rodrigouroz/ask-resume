import { copy, type Language } from "../content";
import type { AskRequest, AskResponse } from "./contracts";
import { getCurrentAssistantCorpus } from "./corpus";
import { todayIsoDate } from "./corpusValidation";
import { resolveResponseLanguage } from "./language";
import type { GroundedModel } from "./model";

export function unknownAnswer(language: Language): AskResponse {
  return { status: "unknown", language, answer: copy.chat.unknown[language], citations: [] };
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
    let stage = "corpus";

    try {
      const corpus = getCurrentAssistantCorpus(todayIsoDate());
      stage = "draft";
      const draft = await model.draft({ corpus, history, language, question, ...safety });
      const sourceIds = [...new Set(draft.sourceIds)];
      if (draft.answer.trim().length === 0 || sourceIds.length === 0) {
        console.warn(
          "grounded_answer_rejected",
          JSON.stringify({
            stage,
            hasAnswer: draft.answer.trim().length > 0,
            sourceCount: sourceIds.length,
          }),
        );
        return unknownAnswer(language);
      }

      const sourcesById = new Map(corpus.map((source) => [source.sourceId, source]));
      const citedEvidence = sourceIds.flatMap((sourceId) => {
        const source = sourcesById.get(sourceId);
        return source ? [source] : [];
      });
      if (citedEvidence.length !== sourceIds.length) {
        console.warn(
          "grounded_answer_rejected",
          JSON.stringify({
            stage: "citations",
            resolvedSourceCount: citedEvidence.length,
            sourceCount: sourceIds.length,
          }),
        );
        return unknownAnswer(language);
      }

      stage = "verification";
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
        console.warn("grounded_answer_rejected", JSON.stringify({ stage, ...verification }));
        return unknownAnswer(language);
      }

      const citations = citedEvidence.map(({ sectionId, sourceId }) => ({ sectionId, sourceId }));
      return { status: "answered", language, answer: draft.answer, citations };
    } catch (error) {
      console.error(
        "grounded_answer_failed",
        JSON.stringify({ stage, name: error instanceof Error ? error.name : "UnknownError" }),
      );
      return unknownAnswer(language);
    }
  };
}
