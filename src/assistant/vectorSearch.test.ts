import { describe, expect, it, vi } from "vitest";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./modelConfig";
import { createOpenAIVectorSearch } from "./vectorSearch";

describe("Vectorize semantic search", () => {
  it("embeds the bilingual query and returns stable source ids from indexed metadata", async () => {
    const create = vi.fn<
      (input: Record<string, unknown>) => Promise<{ data: Array<{ embedding: number[] }> }>
    >(async () => ({ data: [{ embedding: [0.1, 0.2] }] }));
    const query = vi.fn<
      (
        vector: number[],
        options: { topK: number; returnMetadata: "indexed" },
      ) => Promise<{
        matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>;
      }>
    >(async () => ({
      matches: [
        { id: "vector-1", score: 0.92, metadata: { sourceId: "ballast-product" } },
        { id: "classdojo-current-role", score: 0.81 },
      ],
    }));
    const search = createOpenAIVectorSearch("unused-in-test", { query }, { create });

    await expect(search("¿Cómo hace auditable la incertidumbre?", 6)).resolves.toEqual([
      { sourceId: "ballast-product", score: 0.92 },
      { sourceId: "classdojo-current-role", score: 0.81 },
    ]);
    expect(create).toHaveBeenCalledWith({
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: "float",
      input: "¿Cómo hace auditable la incertidumbre?",
    });
    expect(query).toHaveBeenCalledWith([0.1, 0.2], { topK: 6, returnMetadata: "indexed" });
  });
});
