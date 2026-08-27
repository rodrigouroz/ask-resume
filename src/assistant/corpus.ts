import { evidenceConfig } from "../profile";
import type { CanonicalEvidence, IsoDate } from "./contracts";
import { currentCorpus, validateCorpus } from "./corpusValidation.js";

const assistantCorpus: readonly CanonicalEvidence[] = evidenceConfig.items.map(
  ({ facts, sectionId, sourceId, title }) =>
    ({ facts, sectionId, sourceId, title }) as CanonicalEvidence,
);

validateCorpus(assistantCorpus);

export function getCurrentAssistantCorpus(today: IsoDate) {
  return currentCorpus(assistantCorpus, today);
}
