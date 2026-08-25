import { describe, expect, it, vi } from "vitest";
import { createHybridEvidenceRetriever } from "./hybridRetrieve";
import type { SemanticSearch } from "./hybridRetrieve";

describe("hybrid corpus retrieval", () => {
  it("combines exact lexical evidence with semantic evidence using stable source ids", async () => {
    const semanticSearch = vi.fn<SemanticSearch>(async () => [
      { sourceId: "classdojo-current-role", score: 0.91 },
      { sourceId: "technical-capabilities", score: 0.72 },
    ]);
    const retrieve = createHybridEvidenceRetriever({ semanticSearch });

    const evidence = await retrieve("What did Rodrigo do with LLMs and Langfuse at ClassDojo?");

    expect(semanticSearch).toHaveBeenCalledWith(
      "What did Rodrigo do with LLMs and Langfuse at ClassDojo?",
      6,
    );
    expect(evidence[0]?.sourceId).toBe("classdojo-current-role");
    expect(evidence.map(({ sourceId }) => sourceId)).toContain("technical-capabilities");
  });

  it("uses semantic retrieval for paraphrases missed by lexical matching", async () => {
    const semanticSearch = vi.fn<SemanticSearch>(async () => [
      { sourceId: "ballast-product", score: 0.88 },
    ]);
    const retrieve = createHybridEvidenceRetriever({ semanticSearch });

    const evidence = await retrieve("How does he make investment uncertainty inspectable?");

    expect(evidence.map(({ sourceId }) => sourceId)).toContain("ballast-product");
  });

  it("drops unknown, unapproved, and low-confidence semantic matches", async () => {
    const semanticSearch = vi.fn<SemanticSearch>(async () => [
      { sourceId: "private-repository", score: 0.99 },
      { sourceId: "personal-background", score: 0.2 },
    ]);
    const retrieve = createHybridEvidenceRetriever({ semanticSearch });

    await expect(retrieve("salary expectations")).resolves.toEqual([]);
  });

  it("falls back to lexical retrieval when semantic infrastructure fails", async () => {
    const retrieve = createHybridEvidenceRetriever({
      semanticSearch: vi.fn<SemanticSearch>(async () => {
        throw new Error("Vectorize unavailable");
      }),
    });

    const evidence = await retrieve("ClassDojo TypeScript monorepo");

    expect(evidence[0]?.sourceId).toBe("classdojo-current-role");
  });
});
