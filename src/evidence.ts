import rawEvidence from "../profile/evidence.json" with { type: "json" };
import { evidenceConfigSchema } from "./profileSchema.ts";
import type { Language } from "./profileSchema.ts";

export const evidenceConfig = evidenceConfigSchema.parse(rawEvidence);

const labelsBySourceId = new Map(
  evidenceConfig.items.map(({ labels, sourceId }) => [sourceId, labels]),
);

export function evidenceLabel(sourceId: string, language: Language): string {
  return labelsBySourceId.get(sourceId)?.[language] ?? sourceId;
}
