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
    ["Why did Rodrigo build Coro?", "¿Por qué Rodrigo construyó Coro?"],
  ])("returns equivalent evidence across languages", async (english, spanish) => {
    const sourceIds = async (question: string) =>
      (await retrieveEvidence(question)).map(({ sourceId }) => sourceId);

    await expect(sourceIds(spanish)).resolves.toEqual(await sourceIds(english));
  });
});
