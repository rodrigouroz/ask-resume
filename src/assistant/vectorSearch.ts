import OpenAI from "openai";
import type { SemanticSearch } from "./hybridRetrieve";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./modelConfig";

type EmbeddingsClient = {
  create(input: {
    model: string;
    dimensions: number;
    encoding_format: "float";
    input: string;
  }): Promise<{ data: Array<{ embedding: number[] }> }>;
};

type VectorMatch = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type VectorIndex = {
  query(
    vector: number[],
    options: { topK: number; returnMetadata: "indexed" },
  ): Promise<{ matches: VectorMatch[] }>;
};

function createVectorSearch({
  embeddings,
  index,
}: {
  embeddings: EmbeddingsClient;
  index: VectorIndex;
}): SemanticSearch {
  return async (query, topK) => {
    const response = await embeddings.create({
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: "float",
      input: query,
    });
    const vector = response.data[0]?.embedding;
    if (!vector) return [];

    const matches = await index.query(vector, { topK, returnMetadata: "indexed" });
    return matches.matches.map((match) => ({
      sourceId: typeof match.metadata?.sourceId === "string" ? match.metadata.sourceId : match.id,
      score: match.score,
    }));
  };
}

export function createOpenAIVectorSearch(
  apiKey: string,
  index: VectorIndex,
  embeddings: EmbeddingsClient = new OpenAI({ apiKey }).embeddings,
): SemanticSearch {
  return createVectorSearch({ embeddings, index });
}
