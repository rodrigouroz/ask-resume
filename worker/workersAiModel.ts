import { z } from "zod";
import {
  createGroundedModel,
  type GroundedInferenceRequest,
  type GroundedInferenceStage,
} from "../src/assistant/groundedModel";
import type { GroundedModel } from "../src/assistant/model";
import {
  AUTO_WORKERS_AI_MODEL,
  FREE_WORKERS_AI_MODEL,
  PREMIUM_WORKERS_AI_MODEL,
  type ResolvedWorkersAIModel,
  type WorkersAIModelSelection,
} from "./workersAiSelection";

const CONTEXT_RESOLUTION_MODEL = "@cf/meta/llama-3.2-3b-instruct";

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

const questionResolutionResponseFormat = jsonSchema(
  { resolvedQuestion: { type: "string", minLength: 1, maxLength: 500 } },
  ["resolvedQuestion"],
);

const verificationResponseFormat = jsonSchema(
  {
    answersQuestion: { type: "boolean" },
    languageMatches: { type: "boolean" },
    supported: { type: "boolean" },
  },
  ["answersQuestion", "languageMatches", "supported"],
);

const responseFormats = {
  resolution: questionResolutionResponseFormat,
  draft: draftResponseFormat,
  verification: verificationResponseFormat,
} satisfies Record<GroundedInferenceStage, ReturnType<typeof jsonSchema>>;

const stageConfiguration = {
  resolution: { affinity: "resolution-v3", maxCompletionTokens: 80 },
  draft: { affinity: "draft-v6", maxCompletionTokens: 300 },
  verification: { affinity: "verify-v4", maxCompletionTokens: 80 },
} satisfies Record<GroundedInferenceStage, { affinity: string; maxCompletionTokens: number }>;

type Completion = z.infer<typeof completionSchema>;
type SelectedModelRunner = <T>(
  run: (model: string) => Promise<T>,
) => Promise<{ model: string; result: T }>;

function zodIssues(error: z.ZodError): string {
  return error.issues.map(({ code, path }) => `${path.join(".")}:${code}`).join(",");
}

function reportRunError(error: unknown, model: string, stage: string, elapsedMs: number): void {
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
    elapsedMs,
    model,
    name: error instanceof Error ? error.name : "UnknownError",
    stage,
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

function logUsage(model: string, stage: string, elapsedMs: number, completion: Completion): void {
  if (!completion.usage) return;
  console.log(
    "workers_ai_usage",
    JSON.stringify({
      model,
      stage,
      elapsedMs,
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
  stage: GroundedInferenceStage,
  sessionAffinity: string,
  input: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  const startedAt = performance.now();
  let rawCompletion: unknown;
  try {
    rawCompletion = await ai.run(model, input, {
      extraHeaders: { "x-session-affinity": sessionAffinity },
    });
  } catch (error) {
    reportRunError(error, model, stage, Math.round(performance.now() - startedAt));
    throw error;
  }

  const completion = parseCompletion(rawCompletion);
  logUsage(model, stage, Math.round(performance.now() - startedAt), completion);
  const result = schema.safeParse(parseJsonContent(completionContent(completion)));
  if (!result.success) {
    console.error("workers_ai_invalid_structure", zodIssues(result.error));
    throw new Error("Workers AI returned an invalid structured response");
  }
  return result.data;
}

function messages<T>(request: GroundedInferenceRequest<T>) {
  return [
    {
      role: "system",
      content: request.context
        ? `${request.instructions} ${request.context}`
        : request.instructions,
    },
    { role: "user", content: request.input },
  ];
}

function logDraftResult(value: object): void {
  const answer = Reflect.get(value, "answer");
  const sourceIds = Reflect.get(value, "sourceIds");
  console.log(
    "workers_ai_draft_result",
    JSON.stringify({
      hasAnswer: typeof answer === "string" && answer.trim().length > 0,
      sourceCount: Array.isArray(sourceIds) ? sourceIds.length : 0,
    }),
  );
}

function logVerificationResult(value: object): void {
  console.log(
    "workers_ai_verification_result",
    JSON.stringify({
      answersQuestion: Reflect.get(value, "answersQuestion"),
      languageMatches: Reflect.get(value, "languageMatches"),
      supported: Reflect.get(value, "supported"),
    }),
  );
}

const resultLoggers: Partial<Record<GroundedInferenceStage, (value: object) => void>> = {
  draft: logDraftResult,
  verification: logVerificationResult,
};

function logResult(stage: GroundedInferenceStage, value: unknown): void {
  const log = resultLoggers[stage];
  if (log && typeof value === "object" && value !== null) log(value);
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

  return async function runWithSelectedModel<T>(
    run: (model: string) => Promise<T>,
  ): Promise<{ model: string; result: T }> {
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
      return { model, result };
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
      return { model: FREE_WORKERS_AI_MODEL, result };
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

  return createGroundedModel({
    async run(request) {
      const configuration = stageConfiguration[request.stage];
      const run = (model: string) =>
        runStructured(
          ai,
          model,
          request.stage,
          `${profileSlug}:${configuration.affinity}`,
          {
            messages: messages(request),
            max_completion_tokens: configuration.maxCompletionTokens,
            chat_template_kwargs: { enable_thinking: false },
            reasoning_effort: "low",
            response_format: responseFormats[request.stage],
            store: false,
            temperature: 0,
          },
          request.schema,
        );
      const { model, result } =
        request.stage === "resolution"
          ? { model: CONTEXT_RESOLUTION_MODEL, result: await run(CONTEXT_RESOLUTION_MODEL) }
          : await runWithSelectedModel(run);

      logResult(request.stage, result);
      return {
        value: result,
        ...(request.stage === "draft" && model === PREMIUM_WORKERS_AI_MODEL
          ? { verification: "complete" as const }
          : {}),
      };
    },
  });
}
