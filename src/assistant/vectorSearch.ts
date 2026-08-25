import OpenAI from "openai";
import type { SemanticSearch } from "./hybridRetrieve";
import { createVectorSearch } from "./vectorSearchCore";
import type { VectorIndex } from "./vectorSearchCore";

export function createOpenAIVectorSearch(apiKey: string, index: VectorIndex): SemanticSearch {
  return createVectorSearch({ embeddings: new OpenAI({ apiKey }).embeddings, index });
}
