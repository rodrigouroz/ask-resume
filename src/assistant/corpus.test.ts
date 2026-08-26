import { describe, expect, it } from "vitest";
import { projects } from "../content";
import { getCurrentAssistantCorpus } from "./corpus";
import type { CanonicalEvidence, CanonicalFact } from "./contracts";
import { currentCorpus, validateCorpus } from "./corpusValidation";

const assistantCorpus = getCurrentAssistantCorpus("2026-08-25");

describe("approved canonical corpus", () => {
  it("gives every approved fact a stable unique id and independent review metadata", () => {
    const facts = assistantCorpus.flatMap((source) => source.facts);

    expect(facts.length).toBeGreaterThan(50);
    expect(new Set(facts.map((fact) => fact.factId)).size).toBe(facts.length);
    expect(facts.every((fact) => /^\d{4}-\d{2}-\d{2}$/.test(fact.reviewedAt))).toBe(true);
    expect(facts.every((fact) => fact.text.trim().length > 0)).toBe(true);
  });

  it("keeps every time-sensitive fact explicitly bounded", () => {
    const timeSensitiveFactIds = [
      "career-openness",
      "classdojo-current-employment",
      "classdojo-orchestrators-current",
      "classdojo-skills-dx",
      "international-current-location",
      "international-visa",
      "international-flexibility",
      "coro-url",
      "traza-url",
      "daturno-maturity",
      "daturno-url",
      "ballast-url",
      "jacara-url",
    ];
    const factsById = new Map(
      assistantCorpus.flatMap(({ facts }) => facts).map((fact) => [fact.factId, fact]),
    );

    for (const factId of timeSensitiveFactIds) {
      expect(factsById.get(factId)?.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps established ClassDojo facts in their focused evidence sources", () => {
    const factIdsBySource = new Map(
      assistantCorpus.map(({ facts, sourceId }) => [sourceId, facts.map(({ factId }) => factId)]),
    );

    expect(factIdsBySource.get("classdojo-current-role")).toEqual([
      "classdojo-role-period",
      "classdojo-current-employment",
      "classdojo-cloud",
    ]);
    expect(factIdsBySource.get("classdojo-platform-modernization")).toContain(
      "classdojo-typescript",
    );
    expect(factIdsBySource.get("classdojo-tutor-product")).toEqual(
      expect.arrayContaining(["classdojo-external-product", "classdojo-zoom"]),
    );
    expect(factIdsBySource.get("classdojo-ai-engineering")).toEqual(
      expect.arrayContaining([
        "classdojo-llms",
        "classdojo-langfuse",
        "classdojo-orchestrators",
        "classdojo-orchestrators-current",
        "classdojo-skills-dx",
      ]),
    );
  });

  it("expires time-sensitive facts without removing durable facts from the same source", () => {
    const [career] = currentCorpus(assistantCorpus, "2026-11-26").filter(
      ({ sourceId }) => sourceId === "career-overview",
    );

    expect(career?.facts.map(({ factId }) => factId)).toContain("career-years");
    expect(career?.facts.map(({ factId }) => factId)).not.toContain("career-openness");
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

  it("uses Ballast's confirmed public custom domain everywhere", () => {
    const ballastProject = projects.find(({ name }) => name === "Ballast");
    const ballastFact = assistantCorpus
      .find(({ sourceId }) => sourceId === "ballast-product")
      ?.facts.find(({ factId }) => factId === "ballast-url");

    expect(ballastProject?.url).toBe("https://ballast.rodrigouroz.com");
    expect(ballastFact?.text).toContain("https://ballast.rodrigouroz.com");
    expect(ballastFact?.text).not.toContain("pages.dev");
  });

  it("publishes Daturno with a current, bounded maturity claim", () => {
    const daturnoProject = projects.find(({ name }) => name === "Daturno");
    const daturnoFacts = assistantCorpus.find(
      ({ sourceId }) => sourceId === "daturno-product",
    )?.facts;

    expect(daturnoProject?.url).toBe("https://daturno.com");
    expect(daturnoFacts?.find(({ factId }) => factId === "daturno-url")?.expiresAt).toBe(
      "2026-11-25",
    );
    expect(daturnoFacts?.find(({ factId }) => factId === "daturno-maturity")?.text).toContain(
      "publicly available for businesses to register and use",
    );
    expect(daturnoFacts?.find(({ factId }) => factId === "daturno-ownership")?.text).toContain(
      "only builder",
    );
    expect(daturnoFacts?.find(({ factId }) => factId === "daturno-operation")?.text).toContain(
      "production telemetry",
    );
  });

  it("includes approved OpenClaw contributions and product-scale positioning", () => {
    const openClawFactIds = assistantCorpus
      .find(({ sourceId }) => sourceId === "openclaw-contributions")
      ?.facts.map(({ factId }) => factId);
    const careerFactIds = assistantCorpus
      .find(({ sourceId }) => sourceId === "career-overview")
      ?.facts.map(({ factId }) => factId);

    expect(openClawFactIds).toEqual(
      expect.arrayContaining(["openclaw-memory-ranking", "openclaw-compaction-memory"]),
    );
    expect(careerFactIds).toContain("career-millions-scale");
  });

  it("omits Janus and Ronda from the public corpus and keeps Jacara user-facing", () => {
    const serializedCorpus = JSON.stringify(assistantCorpus);
    const jacaraPurpose = assistantCorpus
      .find(({ sourceId }) => sourceId === "jacara-product")
      ?.facts.find(({ factId }) => factId === "jacara-purpose")?.text;

    expect(serializedCorpus).not.toMatch(/Janus/i);
    expect(serializedCorpus).not.toMatch(/Ronda/i);
    expect(jacaraPurpose).toContain("user-facing name");
    expect(jacaraPurpose).toContain("earlier internal name");
  });
});
