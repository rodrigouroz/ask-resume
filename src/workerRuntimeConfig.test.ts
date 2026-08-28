import { describe, expect, it } from "vitest";
import { profile } from "./profile";
import { workerRuntimeConfig } from "./workerRuntimeConfig";

describe("Worker runtime config", () => {
  it("defines shared variables and bindings from the profile", () => {
    expect(workerRuntimeConfig(profile)).toMatchObject({
      vars: {
        AI_PROVIDER: profile.deployment.aiProvider,
        DAILY_ASK_LIMIT: String(profile.deployment.dailyQuestionLimit),
        PROFILE_SLUG: profile.identity.slug,
        WORKERS_AI_MODEL: profile.deployment.workersAiModel,
      },
      analytics_engine_datasets: [
        {
          binding: "PRODUCT_ANALYTICS",
          dataset: profile.deployment.analyticsDataset,
        },
      ],
      ratelimits: [
        {
          name: "ASK_RATE_LIMITER",
          namespace_id: profile.deployment.rateLimitNamespaceId,
          simple: { limit: 10, period: 60 },
        },
      ],
    });
  });

  it("only emits the Workers AI binding for that provider", () => {
    const workersAI = workerRuntimeConfig({
      ...profile,
      deployment: { ...profile.deployment, aiProvider: "workers-ai" },
    });
    const openAI = workerRuntimeConfig({
      ...profile,
      deployment: { ...profile.deployment, aiProvider: "openai" },
    });

    expect(workersAI).toHaveProperty("ai", { binding: "AI", remote: true });
    expect(openAI).not.toHaveProperty("ai");
  });
});
