import { z } from "zod";
import {
  evidenceJson,
  groundedDraftSchema,
  groundingDraftInstructions,
  groundingVerificationInstructions,
  groundingVerificationSchema,
  languageName,
} from "../src/assistant/groundingPrompt";
import type { GroundedModel } from "../src/assistant/model";
import {
  AUTO_WORKERS_AI_MODEL,
  FREE_WORKERS_AI_MODEL,
  PREMIUM_WORKERS_AI_MODEL,
  type ResolvedWorkersAIModel,
  type WorkersAIModelSelection,
} from "./workersAiSelection";

function workersAIErrorCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = Reflect.get(error, "code");
    if (typeof code === "number") return code;
    if (typeof code === "string" && /^\d+$/.test(code)) return Number.parseInt(code, 10);
  }
  const message = error instanceof Error ? error.message : "";
  return /\b5035\b/u.test(message) ? 5035 : undefined;
}

function paidPlanRequired(error: unknown): boolean {
  return workersAIErrorCode(error) === 5035;
}

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
    answer: { type: "string", maxLength: 2_000 },
    sourceIds: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 100 },
      maxItems: 12,
    },
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

type Completion = z.infer<typeof completionSchema>;
type SelectedModelRunner = <T>(run: (model: string) => Promise<T>) => Promise<T>;

function zodIssues(error: z.ZodError): string {
  return error.issues.map(({ code, path }) => `${path.join(".")}:${code}`).join(",");
}

function reportRunError(error: unknown): void {
  const message = error instanceof Error ? error.message : "";
  const code = workersAIErrorCode(error);
  const kind =
    code === 5035
      ? "paid_plan_required"
      : /json mode/i.test(message)
        ? "json_mode_unmet"
        : /rate|limit|quota/i.test(message)
          ? "provider_limit"
          : "provider_error";
  const details = JSON.stringify({
    kind,
    code: code ?? null,
    name: error instanceof Error ? error.name : "UnknownError",
  });
  if (code === 5035) console.info("workers_ai_run_unavailable", details);
  else console.error("workers_ai_run_failed", details);
}

function parseCompletion(rawCompletion: unknown): Completion {
  const result = completionSchema.safeParse(rawCompletion);
  if (result.success) return result.data;
  console.error("workers_ai_invalid_envelope", zodIssues(result.error));
  throw new Error("Workers AI returned an invalid completion envelope");
}

function logUsage(model: string, completion: Completion): void {
  if (!completion.usage) return;
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

function completionContent(completion: Completion): unknown {
  const content =
    "response" in completion ? completion.response : completion.choices[0]?.message.content;
  if (content !== undefined && content !== null && content !== "") return content;

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

function parseJsonContent(content: unknown): unknown {
  if (typeof content !== "string") return content;
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("workers_ai_invalid_json", error instanceof Error ? error.name : "UnknownError");
    throw new Error("Workers AI returned malformed JSON");
  }
}

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
    reportRunError(error);
    throw error;
  }

  const completion = parseCompletion(rawCompletion);
  logUsage(model, completion);
  const result = schema.safeParse(parseJsonContent(completionContent(completion)));
  if (!result.success) {
    console.error("workers_ai_invalid_structure", zodIssues(result.error));
    throw new Error("Workers AI returned an invalid structured response");
  }
  return result.data;
}

function createSelectedModelRunner(
  configuredModel: string,
  selection: WorkersAIModelSelection,
): SelectedModelRunner {
  function preferredModel(): string {
    if (configuredModel !== AUTO_WORKERS_AI_MODEL) return configuredModel;
    return selection.resolvedModel ?? PREMIUM_WORKERS_AI_MODEL;
  }

  function logSelection(model: string, reason: "paid_access" | "paid_plan_required" | "persisted") {
    if (selection.lastLoggedModel === model) return;
    selection.lastLoggedModel = model;
    console.info("workers_ai_model_selected", JSON.stringify({ model, reason }));
  }

  async function rememberSelection(
    model: ResolvedWorkersAIModel,
    reason: "paid_access" | "paid_plan_required",
  ) {
    selection.resolvedModel = model;
    logSelection(model, reason);
    try {
      await selection.persist?.(model);
    } catch (error) {
      console.error(
        "workers_ai_selection_save_failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  return async function runWithSelectedModel<T>(run: (model: string) => Promise<T>): Promise<T> {
    const model = preferredModel();
    try {
      const result = await run(model);
      if (configuredModel === AUTO_WORKERS_AI_MODEL) {
        if (!selection.resolvedModel) {
          await rememberSelection(PREMIUM_WORKERS_AI_MODEL, "paid_access");
        } else {
          logSelection(model, "persisted");
        }
      }
      return result;
    } catch (error) {
      if (
        configuredModel !== AUTO_WORKERS_AI_MODEL ||
        model !== PREMIUM_WORKERS_AI_MODEL ||
        !paidPlanRequired(error)
      ) {
        throw error;
      }

      const result = await run(FREE_WORKERS_AI_MODEL);
      await rememberSelection(FREE_WORKERS_AI_MODEL, "paid_plan_required");
      return result;
    }
  };
}

export function createWorkersAIModel(
  ai: Ai,
  configuredModel: string,
  profileSlug: string,
  selection: WorkersAIModelSelection = {},
): GroundedModel {
  const runWithSelectedModel = createSelectedModelRunner(configuredModel, selection);
  const verifierModel =
    configuredModel === AUTO_WORKERS_AI_MODEL ? FREE_WORKERS_AI_MODEL : configuredModel;

  return {
    async draft({ corpus, history = [], language, question }) {
      const draft = await runWithSelectedModel((model) =>
        runStructured(
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
        ),
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

    async verify({ answer, evidence, history = [], language, question }) {
      const verification = await runStructured(
        ai,
        verifierModel,
        `${profileSlug}:verify-v2`,
        {
          messages: [
            {
              role: "system",
              content: groundingVerificationInstructions(language),
            },
            {
              role: "user",
              content: `USER_QUESTION:\n${question}\n\nCONVERSATION_CONTEXT_NOT_EVIDENCE:\n${JSON.stringify(history)}\n\nANSWER:\n${answer}\n\nCITATIONS_RENDERED_BY_APPLICATION:\n${JSON.stringify(evidence.map(({ sourceId }) => sourceId))}\n\nAPPROVED_EVIDENCE:\n${evidenceJson(evidence)}`,
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
