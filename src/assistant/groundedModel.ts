import { z } from "zod";
import {
  evidenceJson,
  groundedDraftSchema,
  groundingDraftInstructions,
  groundingVerificationInstructions,
  groundingVerificationSchema,
  languageName,
  questionResolutionInstructions,
  questionResolutionSchema,
  questionWithContext,
} from "./groundingPrompt";
import type { GroundedModel } from "./model";

export type GroundedInferenceStage = "draft" | "resolution" | "verification";

export type GroundedInferenceRequest<T> = {
  stage: GroundedInferenceStage;
  instructions: string;
  context?: string;
  input: string;
  schema: z.ZodType<T>;
  safetyIdentifier?: string;
};

export type GroundedInferenceAdapter = {
  safetyIdentifierSupport?: "provider";
  run<T>(request: GroundedInferenceRequest<T>): Promise<{
    value: T;
    verification?: "complete";
  }>;
};

function safetyIdentifier(safetyIdentifier: string | undefined) {
  return safetyIdentifier ? { safetyIdentifier } : {};
}

export function createGroundedModel(adapter: GroundedInferenceAdapter): GroundedModel {
  return {
    ...(adapter.safetyIdentifierSupport
      ? { safetyIdentifierSupport: adapter.safetyIdentifierSupport }
      : {}),

    async draft({ corpus, history = [], language, question, safetyIdentifier: identifier }) {
      const safety = safetyIdentifier(identifier);
      const resolvedQuestion =
        history.length === 0
          ? question
          : (
              await adapter.run({
                stage: "resolution",
                instructions: questionResolutionInstructions(),
                input: questionWithContext(question, history),
                schema: questionResolutionSchema,
                ...safety,
              })
            ).value.resolvedQuestion;
      const draft = await adapter.run({
        stage: "draft",
        instructions: groundingDraftInstructions(),
        context: `APPROVED_CORPUS:\n${evidenceJson(corpus)}`,
        input: `RESPONSE_LANGUAGE:\nWrite the complete answer in ${languageName(language)}.\n\nCURRENT_QUESTION:\n${resolvedQuestion}`,
        schema: groundedDraftSchema,
        ...safety,
      });

      return {
        ...draft.value,
        resolvedQuestion,
        ...(draft.verification ? { verification: draft.verification } : {}),
      };
    },

    async verify({
      answer,
      evidence,
      history = [],
      language,
      question,
      safetyIdentifier: identifier,
    }) {
      const verification = await adapter.run({
        stage: "verification",
        instructions: groundingVerificationInstructions(language),
        input: `${questionWithContext(question, history)}\n\nANSWER:\n${answer}\n\nCITATIONS_RENDERED_BY_APPLICATION:\n${JSON.stringify(evidence.map(({ sourceId }) => sourceId))}\n\nAPPROVED_EVIDENCE:\n${evidenceJson(evidence)}`,
        schema: groundingVerificationSchema,
        ...safetyIdentifier(identifier),
      });

      return verification.value;
    },
  };
}
