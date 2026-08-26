import type { CanonicalEvidence, CanonicalFact, IsoDate } from "./contracts.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL_IN_TEXT = /https?:\/\/[^\s]+/g;

function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty`);
}

function validateDates(fact: CanonicalFact): void {
  if (!isIsoDate(fact.reviewedAt)) {
    throw new Error(`fact ${fact.factId} has invalid reviewedAt ${String(fact.reviewedAt)}`);
  }
  if (fact.expiresAt) {
    if (!isIsoDate(fact.expiresAt)) {
      throw new Error(`fact ${fact.factId} has invalid expiresAt ${String(fact.expiresAt)}`);
    }
    if (fact.expiresAt < fact.reviewedAt) {
      throw new Error(`fact ${fact.factId} expires before it was reviewed`);
    }
  }
}

function validateUrls(fact: CanonicalFact): void {
  const rawUrls = fact.text.match(URL_IN_TEXT) ?? [];
  for (const rawUrl of rawUrls) {
    const candidate = rawUrl.replace(/[.,;:)]+$/, "");
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== "https:") throw new Error("not https");
    } catch {
      throw new Error(`fact ${fact.factId} has invalid URL ${candidate}`);
    }
  }
}

function validateFact(fact: CanonicalFact, sourceId: string): void {
  assertNonEmpty(fact.factId, `factId in ${sourceId}`);
  assertNonEmpty(fact.text, `fact ${fact.factId}`);
  validateDates(fact);
  validateUrls(fact);
}

export function validateCorpus(corpus: readonly CanonicalEvidence[]): void {
  const sourceIds = new Set<string>();
  const factIds = new Set<string>();

  for (const source of corpus) {
    assertNonEmpty(source.sourceId, "sourceId");
    assertNonEmpty(source.title, `title for ${source.sourceId}`);
    if (sourceIds.has(source.sourceId)) throw new Error(`duplicate sourceId ${source.sourceId}`);
    sourceIds.add(source.sourceId);
    if (source.facts.length === 0) throw new Error(`source ${source.sourceId} has no facts`);
    for (const fact of source.facts) {
      if (factIds.has(fact.factId)) throw new Error(`duplicate factId ${fact.factId}`);
      factIds.add(fact.factId);
      validateFact(fact, source.sourceId);
    }
  }
}

function isFactCurrent(fact: CanonicalFact, today: IsoDate): boolean {
  return !fact.expiresAt || fact.expiresAt >= today;
}

export function currentCorpus(
  corpus: readonly CanonicalEvidence[],
  today: IsoDate,
): readonly CanonicalEvidence[] {
  return corpus.flatMap((source) => {
    const facts = source.facts.filter((fact) => isFactCurrent(fact, today));
    return facts.length > 0 ? [{ ...source, facts }] : [];
  });
}

export function todayIsoDate(now = new Date()): IsoDate {
  return now.toISOString().slice(0, 10) as IsoDate;
}
