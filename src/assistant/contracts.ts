import type { Language } from "../content";
import { z } from "zod";

export type SectionId = "experience" | "capabilities" | "projects" | "education" | "about";

export type EvidenceReference = {
  sourceId: string;
  sectionId: SectionId;
};

export type Citation = EvidenceReference & {
  label: string;
};

export type ConversationTurn = {
  question: string;
  answer: string;
};

export type AskRequest = {
  question: string;
  uiLanguage: Language;
  history?: ConversationTurn[] | undefined;
  safetyId?: string | undefined;
};

export type AskResponse = {
  status: "answered" | "unknown";
  language: Language;
  answer: string;
  citations: Citation[];
};

export type IsoDate = `${number}-${number}-${number}`;

export type CanonicalFact = {
  factId: string;
  text: string;
  reviewedAt: IsoDate;
  expiresAt?: IsoDate;
};

export type CanonicalEvidence = EvidenceReference & {
  title: string;
  facts: readonly CanonicalFact[];
};

export const askRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  uiLanguage: z.enum(["en", "es"]),
  history: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(500),
        answer: z.string().trim().min(1).max(2_000),
      }),
    )
    .max(6)
    .optional(),
  safetyId: z.uuid().optional(),
});
