import { DurableObject } from "cloudflare:workers";
import {
  isResolvedWorkersAIModel,
  type PersistedWorkersAIModelSelection,
  type ResolvedWorkersAIModel,
} from "./workersAiSelection";

const DAILY_ASK_LIMIT = 250;

export class AskDailyBudget extends DurableObject<Env> {
  // fallow-ignore-next-line unused-class-member -- invoked through Durable Object RPC stubs.
  consume(limit = DAILY_ASK_LIMIT): boolean {
    const count = this.ctx.storage.kv.get<number>("count") ?? 0;
    if (count >= limit) return false;

    this.ctx.storage.kv.put("count", count + 1);
    return true;
  }

  // The object name isolates this value from daily budget counters.
  // fallow-ignore-next-line unused-class-member -- invoked through Durable Object RPC stubs.
  getWorkersAIModelSelection(): PersistedWorkersAIModelSelection | undefined {
    const model = this.ctx.storage.kv.get<unknown>("workersAiModel");
    const checkedAt = this.ctx.storage.kv.get<unknown>("workersAiModelCheckedAt");
    return isResolvedWorkersAIModel(model) && typeof checkedAt === "number"
      ? { model, checkedAt }
      : undefined;
  }

  // fallow-ignore-next-line unused-class-member -- invoked through Durable Object RPC stubs.
  setWorkersAIModelSelection(model: ResolvedWorkersAIModel): void {
    if (!isResolvedWorkersAIModel(model)) throw new Error("Unsupported Workers AI model selection");
    this.ctx.storage.kv.put("workersAiModel", model);
    this.ctx.storage.kv.put("workersAiModelCheckedAt", Date.now());
  }
}
