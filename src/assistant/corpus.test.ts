import { describe, expect, it } from "vitest";
import { profile } from "../profile";
import { getCurrentAssistantCorpus } from "./corpus";
import type { CanonicalEvidence, CanonicalFact } from "./contracts";
import { currentCorpus, validateCorpus } from "./corpusValidation";

const assistantCorpus = getCurrentAssistantCorpus("2026-08-25");

describe("approved canonical corpus", () => {
  it("gives every source and fact a stable unique id with review metadata", () => {
    const facts = assistantCorpus.flatMap((source) => source.facts);

    expect(assistantCorpus.length).toBeGreaterThan(0);
    expect(new Set(assistantCorpus.map(({ sourceId }) => sourceId)).size).toBe(
      assistantCorpus.length,
    );
    expect(new Set(facts.map((fact) => fact.factId)).size).toBe(facts.length);
    expect(facts.every((fact) => /^\d{4}-\d{2}-\d{2}$/.test(fact.reviewedAt))).toBe(true);
    expect(facts.every((fact) => fact.text.trim().length > 0)).toBe(true);
  });

  it("contains the configured public identity and project URLs", () => {
    const serializedCorpus = JSON.stringify(assistantCorpus);

    expect(serializedCorpus).toContain(profile.identity.name);
    for (const project of profile.presentation.projects) {
      expect(serializedCorpus).toContain(project.url);
    }
  });

  it("expires time-sensitive facts without removing durable sibling facts", () => {
    const fixture: readonly CanonicalEvidence[] = [
      {
        sourceId: "expiry-fixture",
        sectionId: "experience",
        title: "Fixture",
        facts: [
          { factId: "durable", reviewedAt: "2026-01-01", text: "Durable fact." },
          {
            expiresAt: "2026-01-31",
            factId: "temporary",
            reviewedAt: "2026-01-01",
            text: "Temporary fact.",
          },
        ],
      },
    ];

    expect(currentCorpus(fixture, "2026-02-01")[0]?.facts.map(({ factId }) => factId)).toEqual([
      "durable",
    ]);
  });

  it("rejects duplicate source and fact ids", () => {
    const first = assistantCorpus[0];
    if (!first) throw new Error("Missing corpus fixture");

    expect(() => validateCorpus([...assistantCorpus, first])).toThrow(/duplicate sourceId/);
    expect(() =>
      validateCorpus([
        ...assistantCorpus,
        { ...first, sourceId: "unique-source", facts: first.facts },
      ]),
    ).toThrow(/duplicate factId/);
  });

  const invalidFacts: readonly [string, Partial<CanonicalFact>, RegExp][] = [
    ["empty text", { text: "" }, /must not be empty/],
    ["invalid URL", { text: "Available at http://example.com" }, /invalid URL/],
  ];

  it.each(invalidFacts)("rejects %s", (_label, changes, expected) => {
    const base = assistantCorpus[0];
    const baseFact = base?.facts[0];
    if (!base || !baseFact) throw new Error("Missing corpus fixture");
    const fact = { ...baseFact, ...changes };
    const corpus: readonly CanonicalEvidence[] = [
      { ...base, sourceId: "validation-fixture", facts: [fact] },
    ];

    expect(() => validateCorpus(corpus)).toThrow(expected);
  });
});
