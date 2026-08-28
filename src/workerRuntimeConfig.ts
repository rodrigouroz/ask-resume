import type { ProfileConfig } from "./profileSchema.ts";

type RuntimeProfile = Pick<ProfileConfig, "deployment" | "identity">;

export function workerRuntimeConfig(profile: RuntimeProfile) {
  const { deployment, identity } = profile;
  return {
    vars: {
      AI_PROVIDER: deployment.aiProvider,
      DAILY_ASK_LIMIT: String(deployment.dailyQuestionLimit),
      PROFILE_SLUG: identity.slug,
      WORKERS_AI_MODEL: deployment.workersAiModel,
    },
    ...(deployment.aiProvider === "workers-ai" ? { ai: { binding: "AI", remote: true } } : {}),
    analytics_engine_datasets: [
      {
        binding: "PRODUCT_ANALYTICS",
        dataset: deployment.analyticsDataset,
      },
    ],
    ratelimits: [
      {
        name: "ASK_RATE_LIMITER",
        namespace_id: deployment.rateLimitNamespaceId,
        simple: { limit: 10, period: 60 as const },
      },
    ],
  };
}
