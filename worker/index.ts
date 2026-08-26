import { createAnswerService, unknownAnswer } from "../src/assistant/answerQuestion";
import { askRequestSchema } from "../src/assistant/contracts";
import type { GroundedModel } from "../src/assistant/model";
import { createOpenAIModel } from "../src/assistant/openaiModel";
import { resolveResponseLanguage } from "../src/assistant/language";

type ModelFactory = (env: Env) => GroundedModel;
type BudgetConsumer = (env: Env) => Promise<boolean>;

const consumeDailyBudget: BudgetConsumer = async (env) => {
  if (!env.ASK_DAILY_BUDGET) return true;
  const day = new Date().toISOString().slice(0, 10);
  return env.ASK_DAILY_BUDGET.getByName(day).consume();
};

const jsonHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
} as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: jsonHeaders });
}

export function createWorker(
  modelFactory: ModelFactory = (env) => createOpenAIModel(env.OPENAI_API_KEY),
  budgetConsumer: BudgetConsumer = consumeDailyBudget,
): ExportedHandler<Env> {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
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

      if (!(await budgetConsumer(env))) {
        return json(
          unknownAnswer(resolveResponseLanguage(parsed.data.question, parsed.data.uiLanguage)),
        );
      }

      try {
        const answerQuestion = createAnswerService({ model: modelFactory(env) });
        return json(await answerQuestion(parsed.data));
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
