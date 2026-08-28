import type { Language } from "../content";
import type { CanonicalEvidence, ConversationTurn } from "./contracts";

export type GroundedDraft = {
  answer: string;
  sourceIds: string[];
  verification?: "complete";
};

export type GroundedModel = {
  safetyIdentifierSupport?: "provider";
  draft(input: {
    corpus: readonly CanonicalEvidence[];
    history?: readonly ConversationTurn[];
    language: Language;
    question: string;
    safetyIdentifier?: string;
  }): Promise<GroundedDraft>;
  verify(input: {
    answer: string;
    evidence: readonly CanonicalEvidence[];
    history?: readonly ConversationTurn[];
    language: Language;
    question: string;
    safetyIdentifier?: string;
  }): Promise<{ answersQuestion: boolean; languageMatches: boolean; supported: boolean }>;
};
