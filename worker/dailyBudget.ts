import { DurableObject } from "cloudflare:workers";

const DAILY_ASK_LIMIT = 250;

export class AskDailyBudget extends DurableObject<Env> {
  // fallow-ignore-next-line unused-class-member -- invoked through Durable Object RPC stubs.
  consume(limit = DAILY_ASK_LIMIT): boolean {
    const count = this.ctx.storage.kv.get<number>("count") ?? 0;
    if (count >= limit) return false;

    this.ctx.storage.kv.put("count", count + 1);
    return true;
  }
}
