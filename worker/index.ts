import { createAnswerService, unknownAnswer } from "../src/assistant/answerQuestion";
import { askRequestSchema } from "../src/assistant/contracts";
import type { GroundedModel } from "../src/assistant/model";
import { createOpenAIModel } from "../src/assistant/openaiModel";
import { resolveResponseLanguage } from "../src/assistant/language";
import { clientAnalyticsEventSchema, recordProductAnalyticsEvent } from "./productAnalytics";
import { createWorkersAIModel } from "./workersAiModel";
import {
  AUTO_WORKERS_AI_MODEL,
  createWorkersAISelectionLoader,
  type WorkersAIModelSelection,
} from "./workersAiSelection";

type ModelFactory = (env: Env) => GroundedModel | Promise<GroundedModel>;
type BudgetConsumer = (env: Env) => Promise<boolean>;

const consumeDailyBudget: BudgetConsumer = async (env) => {
  if (!env.ASK_DAILY_BUDGET) return true;
  const day = new Date().toISOString().slice(0, 10);
  const configuredLimit = Number.parseInt(env.DAILY_ASK_LIMIT, 10);
  const limit =
    Number.isSafeInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 250;
  return env.ASK_DAILY_BUDGET.getByName(day).consume(limit);
};

function createConfiguredModel(
  env: Env,
  workersAISelection: WorkersAIModelSelection,
): GroundedModel {
  const provider = env.AI_PROVIDER as string;
  if (provider === "workers-ai") {
    if (!env.AI) throw new Error("Workers AI binding is not configured");
    return createWorkersAIModel(env.AI, env.WORKERS_AI_MODEL, env.PROFILE_SLUG, workersAISelection);
  }
  if (provider !== "openai") {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
  if (!env.OPENAI_API_KEY) throw new Error("OpenAI API key is not configured");
  return createOpenAIModel(env.OPENAI_API_KEY);
}

const jsonHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
} as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: jsonHeaders });
}

function noContent(): Response {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

async function handleClientAnalytics(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== url.origin) || (fetchSite && fetchSite !== "same-origin")) {
    return json({ error: "Forbidden" }, 403);
  }

  const clientKey = request.headers.get("cf-connecting-ip") ?? "local-or-unknown";
  const rateLimit = await env.ASK_RATE_LIMITER.limit({ key: `analytics:${clientKey}` });
  if (!rateLimit.success) return noContent();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const parsed = clientAnalyticsEventSchema.safeParse(payload);
  if (!parsed.success) return json({ error: "Invalid event" }, 400);

  recordProductAnalyticsEvent(env.PRODUCT_ANALYTICS, parsed.data.event, env.PROFILE_SLUG);
  return noContent();
}

export function createWorker(
  modelFactory?: ModelFactory,
  budgetConsumer: BudgetConsumer = consumeDailyBudget,
): ExportedHandler<Env> {
  const workersAISelection: WorkersAIModelSelection = {};
  const loadWorkersAISelection = createWorkersAISelectionLoader(workersAISelection);
  const resolvedModelFactory =
    modelFactory ??
    (async (env: Env) => {
      if (
        (env.AI_PROVIDER as string) === "workers-ai" &&
        (env.WORKERS_AI_MODEL as string) === AUTO_WORKERS_AI_MODEL
      ) {
        await loadWorkersAISelection(env);
      }
      return createConfiguredModel(env, workersAISelection);
    });

  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === "/api/analytics") return handleClientAnalytics(request, env);
      if (url.pathname !== "/api/ask") return new Response("Not found", { status: 404 });
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      const clientKey = request.headers.get("cf-connecting-ip") ?? "local-or-unknown";
      const rateLimit = await env.ASK_RATE_LIMITER.limit({ key: clientKey });
      if (!rateLimit.success) return json({ error: "Too many requests" }, 429);

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const parsed = askRequestSchema.safeParse(payload);
      if (!parsed.success) return json({ error: "Invalid request" }, 400);

      recordProductAnalyticsEvent(env.PRODUCT_ANALYTICS, "question_submitted", env.PROFILE_SLUG);

      if (!(await budgetConsumer(env))) {
        return json(
          unknownAnswer(resolveResponseLanguage(parsed.data.question, parsed.data.uiLanguage)),
        );
      }

      try {
        const answerQuestion = createAnswerService({ model: await resolvedModelFactory(env) });
        const answer = await answerQuestion(parsed.data);
        if (answer.status === "answered") {
          recordProductAnalyticsEvent(env.PRODUCT_ANALYTICS, "answer_succeeded", env.PROFILE_SLUG);
        }
        return json(answer);
      } catch {
        return json(
          unknownAnswer(resolveResponseLanguage(parsed.data.question, parsed.data.uiLanguage)),
        );
      }
    },
  };
}

export default createWorker();
export { AskDailyBudget } from "./dailyBudget";
