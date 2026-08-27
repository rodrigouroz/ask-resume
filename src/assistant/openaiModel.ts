import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  evidenceJson,
  groundedDraftSchema,
  groundingDraftInstructions,
  groundingVerificationInstructions,
  groundingVerificationSchema,
  languageName,
} from "./groundingPrompt";
import type { GroundedModel } from "./model";
import { ANSWER_MODEL, VERIFICATION_MODEL } from "./modelConfig";

const MODERATION = {
  model: "omni-moderation-latest",
  policy: { input: { mode: "block" }, output: { mode: "block" } },
} as const;

type ParsedResponse = { output_parsed?: unknown };
type ResponsesClient = {
  parse(input: Record<string, unknown>): Promise<ParsedResponse>;
};

function safetyParameter(safetyIdentifier: string | undefined): Record<string, string> {
  return safetyIdentifier ? { safety_identifier: safetyIdentifier } : {};
}

export function createOpenAIModel(
  apiKey: string,
  responses: ResponsesClient = new OpenAI({ apiKey }).responses,
): GroundedModel {
  return {
    safetyIdentifierSupport: "provider",
    async draft({ corpus, history = [], language, question, safetyIdentifier }) {
      const response = await responses.parse({
        model: ANSWER_MODEL,
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 700,
        moderation: MODERATION,
        instructions: groundingDraftInstructions(),
        input: `APPROVED_CORPUS:\n${evidenceJson(corpus)}\n\nRESPONSE_LANGUAGE:\nWrite the complete answer in ${languageName(language)}.\n\nQUESTION:\n${question}\n\nCONVERSATION_CONTEXT_NOT_EVIDENCE:\n${JSON.stringify(history)}`,
        text: { format: zodTextFormat(groundedDraftSchema, "grounded_answer") },
        ...safetyParameter(safetyIdentifier),
      });

      return groundedDraftSchema.parse(response.output_parsed);
    },

    async verify({ answer, evidence, history = [], language, question, safetyIdentifier }) {
      const response = await responses.parse({
        model: VERIFICATION_MODEL,
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 300,
        moderation: MODERATION,
        instructions: groundingVerificationInstructions(language),
        input: `USER_QUESTION:\n${question}\n\nCONVERSATION_CONTEXT_NOT_EVIDENCE:\n${JSON.stringify(history)}\n\nANSWER:\n${answer}\n\nCITATIONS_RENDERED_BY_APPLICATION:\n${JSON.stringify(evidence.map(({ sourceId }) => sourceId))}\n\nAPPROVED_EVIDENCE:\n${evidenceJson(evidence)}`,
        text: {
          format: zodTextFormat(groundingVerificationSchema, "grounding_verification"),
        },
        ...safetyParameter(safetyIdentifier),
      });

      return groundingVerificationSchema.parse(response.output_parsed);
    },
  };
}
