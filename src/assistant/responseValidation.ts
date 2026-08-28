import type { AskResponse, Citation, SectionId } from "./contracts";

const sectionIds = new Set<SectionId>([
  "experience",
  "capabilities",
  "projects",
  "education",
  "about",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && sectionIds.has(value as SectionId);
}

function parseCitation(value: unknown): Citation | undefined {
  if (!isRecord(value)) return undefined;
  const { label, sectionId, sourceId } = value;
  if (
    typeof label !== "string" ||
    label.length === 0 ||
    !isSectionId(sectionId) ||
    typeof sourceId !== "string"
  ) {
    return undefined;
  }
  return { label, sectionId, sourceId };
}

export function parseAskResponse(value: unknown): AskResponse {
  if (!isRecord(value)) throw new Error("Invalid profile assistant response");
  const { answer, citations, language, status } = value;
  if (
    (status !== "answered" && status !== "unknown") ||
    (language !== "en" && language !== "es") ||
    typeof answer !== "string" ||
    !Array.isArray(citations)
  ) {
    throw new Error("Invalid profile assistant response");
  }

  const parsedCitations: Citation[] = [];
  for (const value of citations) {
    const citation = parseCitation(value);
    if (!citation) throw new Error("Invalid profile assistant response");
    parsedCitations.push(citation);
  }
  return { status, language, answer, citations: parsedCitations };
}
