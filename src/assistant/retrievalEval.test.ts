import { describe, expect, it } from "vitest";
import cases from "./evals/retrieval.json";
import { retrieveEvidence } from "./retrieve";

describe("persisted lexical retrieval evaluation", () => {
  it.each(cases)(
    "$id",
    async ({ behavior, expectedFactIds, expectedSourceIds, forbiddenSourceIds = [], question }) => {
      const evidence = await retrieveEvidence(question);
      const actualSourceIds = evidence.map(({ sourceId }) => sourceId);
      const actualFactIds = evidence.flatMap(({ facts }) => facts.map(({ factId }) => factId));

      for (const expected of expectedSourceIds)
        expect(
          actualSourceIds,
          `sources for: ${question}: ${JSON.stringify(actualSourceIds)}`,
        ).toContain(expected);
      for (const expected of expectedFactIds)
        expect(actualFactIds, `facts for: ${question}`).toContain(expected);
      for (const forbidden of forbiddenSourceIds)
        expect(actualSourceIds, `sources for: ${question}`).not.toContain(forbidden);
      expect(
        actualSourceIds.length === 0,
        `sources for: ${question}: ${JSON.stringify(actualSourceIds)}`,
      ).toBe(expectedSourceIds.length === 0);
      expect(["answer", "fallback"]).toContain(behavior);
    },
  );

  it.each([
    ["What did Rodrigo do at ClassDojo?", "¿Qué hizo Rodrigo en ClassDojo?"],
    ["What has Rodrigo worked on at ClassDojo?", "¿En qué trabajó Rodrigo en ClassDojo?"],
    [
      "How did Rodrigo modernize ClassDojo's web platform?",
      "¿Cómo modernizó Rodrigo la plataforma web de ClassDojo?",
    ],
    [
      "Which parts of the Tutor product did Rodrigo work on?",
      "¿En qué partes del producto Tutor trabajó Rodrigo?",
    ],
    [
      "What did Rodrigo do in district communications and School Insights?",
      "¿Qué hizo Rodrigo en comunicaciones distritales y School Insights?",
    ],
    [
      "How did Rodrigo use Langfuse and coding agents at ClassDojo?",
      "¿Cómo usó Rodrigo Langfuse y agentes de código en ClassDojo?",
    ],
    ["Why did Rodrigo build Coro?", "¿Por qué Rodrigo construyó Coro?"],
  ])("returns equivalent evidence across languages", async (english, spanish) => {
    const sourceIds = async (question: string) =>
      (await retrieveEvidence(question)).map(({ sourceId }) => sourceId);

    await expect(sourceIds(spanish)).resolves.toEqual(await sourceIds(english));
  });

  it("does not route teaching questions to ClassDojo platform modernization", async () => {
    const sourceIds = (await retrieveEvidence("What did Rodrigo teach at UTN?")).map(
      ({ sourceId }) => sourceId,
    );

    expect(sourceIds).toContain("utn-education-and-teaching");
    expect(sourceIds).not.toContain("classdojo-platform-modernization");
  });
});
