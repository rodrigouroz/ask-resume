import { z } from "zod";

export type ProductAnalyticsEvent = "chat_opened" | "question_submitted" | "answer_succeeded";

export const clientAnalyticsEventSchema = z.object({ event: z.literal("chat_opened") }).strict();

export function recordProductAnalyticsEvent(
  dataset: AnalyticsEngineDataset,
  event: ProductAnalyticsEvent,
): void {
  dataset.writeDataPoint({
    indexes: ["ask-rodrigo"],
    blobs: [event],
    doubles: [1],
  });
}
