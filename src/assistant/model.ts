import type { Language } from "../content";
import type { CanonicalEvidence, ConversationTurn } from "./contracts";

export type GroundedDraft = {
  answer: string;
  sourceIds: string[];
};

export type GroundedModel = {
  search?(input: {
    history?: readonly ConversationTurn[];
    language: Language;
    question: string;
    safetyIdentifier?: string;
  }): Promise<{ query: string }>;
  draft(input: {
    evidence: readonly CanonicalEvidence[];
    history?: readonly ConversationTurn[];
    language: Language;
    question: string;
    safetyIdentifier?: string;
  }): Promise<GroundedDraft>;
  verify(input: {
    answer: string;
    evidence: readonly CanonicalEvidence[];
    language: Language;
    question: string;
    safetyIdentifier?: string;
  }): Promise<{ answersQuestion: boolean; languageMatches: boolean; supported: boolean }>;
};
