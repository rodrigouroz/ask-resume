import OpenAI from "openai";
import type { SemanticSearch } from "./hybridRetrieve";

export const EMBEDDING_MODEL = "text-embedding-3-large";
export const EMBEDDING_DIMENSIONS = 1024;

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

type VectorIndex = {
  query(
    vector: number[],
    options: { topK: number; returnMetadata: "indexed" },
  ): Promise<{ matches: VectorMatch[] }>;
};

export function createVectorSearch({
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

export function createOpenAIVectorSearch(apiKey: string, index: VectorIndex): SemanticSearch {
  return createVectorSearch({ embeddings: new OpenAI({ apiKey }).embeddings, index });
}
