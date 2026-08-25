import { describe, expect, it } from "vitest";
import cases from "./evals/retrieval.json";
import { retrieveEvidence } from "./retrieve";

describe("persisted lexical retrieval evaluation", () => {
  it.each(cases)("$id", async ({ question, expectedSourceIds }) => {
    const actual = (await retrieveEvidence(question)).map(({ sourceId }) => sourceId);

    for (const expected of expectedSourceIds) expect(actual).toContain(expected);
    expect(actual.length === 0).toBe(expectedSourceIds.length === 0);
  });

  it.each([
    ["What did Rodrigo do at ClassDojo?", "¿Qué hizo Rodrigo en ClassDojo?"],
    ["Why did Rodrigo build Coro?", "¿Por qué Rodrigo construyó Coro?"],
  ])("returns equivalent evidence across languages", async (english, spanish) => {
    const sourceIds = async (question: string) =>
      (await retrieveEvidence(question)).map(({ sourceId }) => sourceId);

    await expect(sourceIds(spanish)).resolves.toEqual(await sourceIds(english));
  });
});
