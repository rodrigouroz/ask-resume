import { copy, type Language } from "../content";
import { evidenceLabel } from "../evidence";
import type { AskRequest, AskResponse, CanonicalEvidence, ConversationTurn } from "./contracts";
import { getCurrentAssistantCorpus } from "./corpus";
import { todayIsoDate } from "./corpusValidation";
import { resolveResponseLanguage } from "./language";
import type { GroundedDraft, GroundedModel } from "./model";

export function unknownAnswer(language: Language): AskResponse {
  return { status: "unknown", language, answer: copy.chat.unknown[language], citations: [] };
}

const instructionOverridePatterns = [
  /\b(?:this|these|my)\s+(?:instruction|instructions|request|message)\s+(?:must\s+)?(?:override|overrides|supersede|supersedes|replace|replaces)\b/iu,
  /\b(?:ignore|disregard|bypass|override|overrule)\b[\s\S]{0,120}\b(?:evidence|corpus|system prompt|developer instructions?|previous instructions?|rules?)\b/iu,
  /\b(?:esta|estas|mi)\s+(?:instrucci[oó]n|instrucciones|petici[oó]n|mensaje)\s+(?:debe\s+)?(?:anular|anula|reemplazar|reemplaza|sobrescribir|sobrescribe)\b/iu,
  /\b(?:desobedec[eé]|ignora|ignor[aá]|omite|omit[ií]|anula|reemplaza|sobrescribe)(?=\s|$|[.,;:!?])[\s\S]{0,120}\b(?:evidencia|corpus|prompt|instrucciones?|reglas?)\b/iu,
];

const promptExtractionPatterns = [
  /\b(?:show|print|reveal|expose|give|provide|repeat|quote|copy|output)\b[\s\S]{0,120}\b(?:(?:(?:hidden|internal|system|developer|secret)\s+){1,2}(?:prompt|instructions?)|(?:approved|hidden|internal|full)\s+corpus)\b/iu,
  /\b(?:mostrame|mostr[aá]|muestra|mu[eé]strame|imprime|imprim[ií]|revela|revel[aá]|expone|expon[eé]|dame|provee|repite|cit[aá]|copia|copi[aá])(?=\s|$|[.,;:!?])[\s\S]{0,120}\b(?:prompt\s+(?:oculto|interno|del sistema|del desarrollador)|instrucciones?\s+(?:ocultas?|internas?|del sistema|del desarrollador)|corpus\s+(?:aprobado|oculto|interno|completo))\b/iu,
];

const privateDataRequestPatterns = [
  /\b(?:access|browse|inspect|list|provide|read|reveal|search|show|expose|give)\b[\s\S]{0,80}\b(?:private repositor(?:y|ies)|secrets?|passwords?|tokens?|api keys?)\b/iu,
  /\b(?:accede|acced[eé]|busca|busc[aá]|dame|expone|expon[eé]|inspecciona|inspeccion[aá]|lee|le[eé]|lista|list[aá]|mostrame|mostr[aá]|muestra|mu[eé]strame|provee|prove[eé]|revisa|revis[aá]|revela|revel[aá])(?=\s|$|[.,;:!?])[\s\S]{0,80}\b(?:repositorios? privados?|secretos?|contraseñas?|tokens?|claves? de api)\b/iu,
];

function normalizeForSafetyMatch(question: string): string {
  return question
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .replace(/\b(?:[\p{L}\p{N}]\s+){2,}[\p{L}\p{N}]\b/gu, (spacedWord) =>
      spacedWord.replace(/\s+/gu, ""),
    );
}

function rejectedQuestionStage(
  question: string,
): "instruction_override" | "prompt_extraction" | "private_data_request" | undefined {
  const normalizedQuestion = normalizeForSafetyMatch(question);
  if (instructionOverridePatterns.some((pattern) => pattern.test(normalizedQuestion))) {
    return "instruction_override";
  }
  if (promptExtractionPatterns.some((pattern) => pattern.test(normalizedQuestion))) {
    return "prompt_extraction";
  }
  if (privateDataRequestPatterns.some((pattern) => pattern.test(normalizedQuestion))) {
    return "private_data_request";
  }
  return undefined;
}

function resolveCitedEvidence(
  corpus: readonly CanonicalEvidence[],
  sourceIds: readonly string[],
): CanonicalEvidence[] {
  const sourcesById = new Map(corpus.map((source) => [source.sourceId, source]));
  return sourceIds.flatMap((sourceId) => {
    const source = sourcesById.get(sourceId);
    return source ? [source] : [];
  });
}

async function verifyDraft({
  model,
  draft,
  evidence,
  history,
  language,
  question,
  safetyIdentifier,
}: {
  model: GroundedModel;
  draft: GroundedDraft;
  evidence: readonly CanonicalEvidence[];
  history: readonly ConversationTurn[];
  language: Language;
  question: string;
  safetyIdentifier?: string;
}): Promise<boolean> {
  const verification = await model.verify({
    answer: draft.answer,
    evidence,
    history: draft.resolvedQuestion ? [] : history,
    language,
    question: draft.resolvedQuestion ?? question,
    ...(safetyIdentifier ? { safetyIdentifier } : {}),
  });
  if (verification.answersQuestion && verification.supported && verification.languageMatches) {
    return true;
  }

  console.warn(
    "grounded_answer_rejected",
    JSON.stringify({ stage: "verification", ...verification }),
  );
  return false;
}

export function createAnswerService({ model }: { model: GroundedModel }) {
  return async function answerQuestion({
    question,
    uiLanguage,
    history = [],
    safetyId,
  }: AskRequest): Promise<AskResponse> {
    const language = resolveResponseLanguage(question, uiLanguage);
    const rejectedStage = rejectedQuestionStage(question);
    if (rejectedStage) {
      console.warn("grounded_answer_rejected", JSON.stringify({ stage: rejectedStage }));
      return unknownAnswer(language);
    }
    const safety =
      safetyId && model.safetyIdentifierSupport === "provider"
        ? { safetyIdentifier: safetyId }
        : {};
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

      const citedEvidence = resolveCitedEvidence(corpus, sourceIds);
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

      if (draft.verification !== "complete") {
        stage = "verification";
        const verified = await verifyDraft({
          model,
          draft,
          evidence: citedEvidence,
          history,
          language,
          question,
          ...safety,
        });
        if (!verified) return unknownAnswer(language);
      }

      const citations = citedEvidence.map(({ sectionId, sourceId }) => ({
        sectionId,
        sourceId,
        label: evidenceLabel(sourceId, language),
      }));
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
