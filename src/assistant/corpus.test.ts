import { describe, expect, it } from "vitest";
import { assistantCorpus } from "./corpus";
import { retrieveEvidence } from "./retrieve";

describe("approved canonical corpus", () => {
  it("gives every approved fact a stable unique id and review metadata", () => {
    const facts = assistantCorpus.flatMap((source) => source.facts);

    expect(facts.length).toBeGreaterThan(50);
    expect(new Set(facts.map((fact) => fact.factId)).size).toBe(facts.length);
    expect(facts.every((fact) => fact.status === "approved")).toBe(true);
    expect(facts.every((fact) => fact.reviewedAt === "2026-08-25")).toBe(true);
    expect(facts.every((fact) => fact.text.trim().length > 0)).toBe(true);
  });

  it.each([
    ["¿Cómo se llama el asistente?", "assistant-identity"],
    ["What did Rodrigo do with LLMs and Langfuse at ClassDojo?", "classdojo-current-role"],
    ["How did he build and train engineering teams?", "leadership-capability"],
    ["How does Ballast validate its optimizer?", "ballast-product"],
    ["¿Cómo protege Traza la privacidad?", "traza-product"],
    ["Why did Rodrigo build Coro?", "coro-product"],
    ["¿Por qué creó Jacara?", "jacara-product"],
  ])("retrieves %s from the approved dossier", async (question, expectedSourceId) => {
    const evidence = await retrieveEvidence(question);

    expect(evidence.map(({ sourceId }) => sourceId)).toContain(expectedSourceId);
  });

  it("keeps the canonical corpus in one language", () => {
    expect(new Set(assistantCorpus.map(({ canonicalLanguage }) => canonicalLanguage))).toEqual(
      new Set(["en"]),
    );
  });
});
