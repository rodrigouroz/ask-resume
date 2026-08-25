import { getCurrentAssistantCorpus } from "./corpus";
import type { CanonicalEvidence } from "./contracts";
import { todayIsoDate } from "./corpusValidation";
import { retrieveEvidence } from "./retrieve";
import type { EvidenceRetriever } from "./retrieve";

export type SemanticMatch = { sourceId: string; score: number };
export type SemanticSearch = (
  query: string,
  topK: number,
) => readonly SemanticMatch[] | Promise<readonly SemanticMatch[]>;

const MIN_SEMANTIC_SCORE = 0.35;
const FUSION_OFFSET = 60;
const MAX_EVIDENCE = 3;

export function createHybridEvidenceRetriever({
  semanticSearch,
}: {
  semanticSearch: SemanticSearch;
}): EvidenceRetriever {
  return async (question) => {
    const lexical = await retrieveEvidence(question);
    let semantic: readonly SemanticMatch[] = [];
    try {
      semantic = await semanticSearch(question, 6);
    } catch {
      return lexical;
    }

    const bySourceId = new Map(
      getCurrentAssistantCorpus(todayIsoDate())
        .filter(({ status }) => status === "approved")
        .map((evidence) => [evidence.sourceId, evidence] as const),
    );
    const scores = new Map<string, number>();

    lexical.forEach(({ sourceId }, rank) => {
      scores.set(sourceId, 2 / (FUSION_OFFSET + rank + 1));
    });
    semantic
      .filter(({ sourceId, score }) => score >= MIN_SEMANTIC_SCORE && bySourceId.has(sourceId))
      .forEach(({ sourceId }, rank) => {
        scores.set(sourceId, (scores.get(sourceId) ?? 0) + 1 / (FUSION_OFFSET + rank + 1));
      });

    return [...scores]
      .sort((left, right) => right[1] - left[1])
      .slice(0, MAX_EVIDENCE)
      .flatMap(([sourceId]) => {
        const evidence: CanonicalEvidence | undefined = bySourceId.get(sourceId);
        return evidence ? [evidence] : [];
      });
  };
}
