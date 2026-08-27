import { z } from "zod";
import {
  evidenceJson,
  factualQuestionForVerification,
  groundedDraftSchema,
  groundingDraftInstructions,
  groundingVerificationInstructions,
  groundingVerificationSchema,
  languageName,
} from "../src/assistant/groundingPrompt";
import type { GroundedModel } from "../src/assistant/model";

const usageSchema = z
  .object({
    prompt_tokens: z.number().int().nonnegative(),
    completion_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative(),
    prompt_tokens_details: z
      .object({ cached_tokens: z.number().int().nonnegative().optional() })
      .optional(),
    completion_tokens_details: z
      .object({ reasoning_tokens: z.number().int().nonnegative().optional() })
      .optional(),
  })
  .passthrough();

const completionSchema = z.union([
  z.object({
    choices: z
      .array(
        z.object({
          finish_reason: z.string().nullish(),
          message: z.object({
            content: z.unknown(),
            reasoning_content: z.unknown().optional(),
          }),
        }),
      )
      .min(1),
    usage: usageSchema.optional(),
  }),
  z.object({ response: z.unknown(), usage: usageSchema.optional() }),
]);

function jsonSchema(properties: Record<string, unknown>, required: string[]) {
  return {
    type: "json_schema",
    json_schema: {
      type: "object",
      additionalProperties: false,
      properties,
      required,
    },
  };
}

const draftResponseFormat = jsonSchema(
  {
    answer: { type: "string" },
    sourceIds: { type: "array", items: { type: "string" } },
  },
  ["answer", "sourceIds"],
);

const verificationResponseFormat = jsonSchema(
  {
    answersQuestion: { type: "boolean" },
    languageMatches: { type: "boolean" },
    supported: { type: "boolean" },
  },
  ["answersQuestion", "languageMatches", "supported"],
);

async function runStructured<T>(
  ai: Ai,
  model: string,
  sessionAffinity: string,
  input: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  let rawCompletion: unknown;
  try {
    rawCompletion = await ai.run(model, input, {
      extraHeaders: { "x-session-affinity": sessionAffinity },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const kind = /json mode/i.test(message)
      ? "json_mode_unmet"
      : /rate|limit|quota/i.test(message)
        ? "provider_limit"
        : "provider_error";
    console.error(
      "workers_ai_run_failed",
      JSON.stringify({ kind, name: error instanceof Error ? error.name : "UnknownError" }),
    );
    throw error;
  }
  const completionResult = completionSchema.safeParse(rawCompletion);
  if (!completionResult.success) {
    console.error(
      "workers_ai_invalid_envelope",
      completionResult.error.issues.map(({ code, path }) => `${path.join(".")}:${code}`).join(","),
    );
    throw new Error("Workers AI returned an invalid completion envelope");
  }
  const completion = completionResult.data;
  if (completion.usage) {
    console.log(
      "workers_ai_usage",
      JSON.stringify({
        model,
        promptTokens: completion.usage.prompt_tokens,
        cachedPromptTokens: completion.usage.prompt_tokens_details?.cached_tokens ?? 0,
        completionTokens: completion.usage.completion_tokens,
        reasoningTokens: completion.usage.completion_tokens_details?.reasoning_tokens ?? 0,
        totalTokens: completion.usage.total_tokens,
      }),
    );
  }
  const content =
    "response" in completion ? completion.response : completion.choices[0]?.message.content;
  if (content === undefined || content === null || content === "") {
    const choice = "choices" in completion ? completion.choices[0] : undefined;
    console.error(
      "workers_ai_missing_content",
      JSON.stringify({
        finishReason: choice?.finish_reason ?? null,
        hasReasoning: Boolean(choice?.message.reasoning_content),
      }),
    );
    throw new Error("Workers AI returned no message content");
  }
  let parsedContent: unknown = content;
  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      console.error(
        "workers_ai_invalid_json",
        error instanceof Error ? error.name : "UnknownError",
      );
      throw new Error("Workers AI returned malformed JSON");
    }
  }
  const result = schema.safeParse(parsedContent);
  if (!result.success) {
    console.error(
      "workers_ai_invalid_structure",
      result.error.issues.map(({ code, path }) => `${path.join(".")}:${code}`).join(","),
    );
    throw new Error("Workers AI returned an invalid structured response");
  }
  return result.data;
}

export function createWorkersAIModel(ai: Ai, model: string, profileSlug: string): GroundedModel {
  return {
    async draft({ corpus, history = [], language, question }) {
      const draft = await runStructured(
        ai,
        model,
        `${profileSlug}:draft-v2`,
        {
          messages: [
            {
              role: "system",
              content: `${groundingDraftInstructions()} APPROVED_CORPUS:\n${evidenceJson(corpus)}`,
            },
            {
              role: "user",
              content: `RESPONSE_LANGUAGE:\nWrite the complete answer in ${languageName(language)}.\n\nQUESTION:\n${question}\n\nCONVERSATION_CONTEXT_NOT_EVIDENCE:\n${JSON.stringify(history)}`,
            },
          ],
          max_completion_tokens: 700,
          chat_template_kwargs: { enable_thinking: false },
          reasoning_effort: "low",
          response_format: draftResponseFormat,
          store: false,
          temperature: 0,
        },
        groundedDraftSchema,
      );
      console.log(
        "workers_ai_draft_result",
        JSON.stringify({
          hasAnswer: draft.answer.trim().length > 0,
          sourceCount: draft.sourceIds.length,
        }),
      );
      return draft;
    },

    async verify({ answer, evidence, language, question }) {
      const verification = await runStructured(
        ai,
        model,
        `${profileSlug}:verify-v1`,
        {
          messages: [
            {
              role: "system",
              content: groundingVerificationInstructions(language),
            },
            {
              role: "user",
              content: `FACTUAL_QUESTION_FOR_VERIFICATION:\n${factualQuestionForVerification(question)}\n\nANSWER:\n${answer}\n\nCITATIONS_RENDERED_BY_APPLICATION:\n${JSON.stringify(evidence.map(({ sourceId }) => sourceId))}\n\nAPPROVED_EVIDENCE:\n${evidenceJson(evidence)}`,
            },
          ],
          max_completion_tokens: 300,
          chat_template_kwargs: { enable_thinking: false },
          reasoning_effort: "low",
          response_format: verificationResponseFormat,
          store: false,
          temperature: 0,
        },
        groundingVerificationSchema,
      );
      console.log(
        "workers_ai_verification_result",
        JSON.stringify({
          answersQuestion: verification.answersQuestion,
          languageMatches: verification.languageMatches,
          supported: verification.supported,
        }),
      );
      return verification;
    },
  };
}
