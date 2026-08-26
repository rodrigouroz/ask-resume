import type { Language } from "../content";
import { z } from "zod";

export type SectionId = "experience" | "capabilities" | "projects" | "education" | "about";

export type Citation = {
  sourceId: string;
  sectionId: SectionId;
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

export type CanonicalEvidence = Citation & {
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

export const askResponseSchema = z.object({
  status: z.enum(["answered", "unknown"]),
  language: z.enum(["en", "es"]),
  answer: z.string(),
  citations: z.array(
    z.object({
      sourceId: z.string(),
      sectionId: z.enum(["experience", "capabilities", "projects", "education", "about"]),
    }),
  ),
});
