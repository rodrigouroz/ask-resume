export const AUTO_WORKERS_AI_MODEL = "auto";
export const PREMIUM_WORKERS_AI_MODEL = "@cf/deepseek-ai/deepseek-v4-flash-0731";
export const FREE_WORKERS_AI_MODEL = "@cf/zai-org/glm-4.7-flash";
const WORKERS_AI_SELECTION_TTL_MS = 6 * 60 * 60 * 1_000;

export type ResolvedWorkersAIModel = typeof PREMIUM_WORKERS_AI_MODEL | typeof FREE_WORKERS_AI_MODEL;

export type WorkersAIModelSelection = {
  resolvedModel?: ResolvedWorkersAIModel;
  expiresAt?: number;
  lastLoggedModel?: string;
  persist?: (model: ResolvedWorkersAIModel) => Promise<void>;
};

export type PersistedWorkersAIModelSelection = {
  model: ResolvedWorkersAIModel;
  checkedAt: number;
};

export function isResolvedWorkersAIModel(value: unknown): value is ResolvedWorkersAIModel {
  return value === PREMIUM_WORKERS_AI_MODEL || value === FREE_WORKERS_AI_MODEL;
}

export function createWorkersAISelectionLoader(selection: WorkersAIModelSelection) {
  let hydration: Promise<void> | undefined;

  return async function loadWorkersAISelection(env: Env): Promise<void> {
    if ((selection.expiresAt ?? 0) > Date.now()) return;
    if (hydration) return hydration;

    hydration = (async () => {
      if (!env.ASK_DAILY_BUDGET) return;

      const stub = env.ASK_DAILY_BUDGET.getByName("workers-ai-model-selection");
      selection.persist = async (model) => {
        await stub.setWorkersAIModelSelection(model);
        selection.resolvedModel = model;
        selection.expiresAt = Date.now() + WORKERS_AI_SELECTION_TTL_MS;
      };

      try {
        const stored = await stub.getWorkersAIModelSelection();
        if (
          stored &&
          isResolvedWorkersAIModel(stored.model) &&
          Number.isFinite(stored.checkedAt) &&
          stored.checkedAt + WORKERS_AI_SELECTION_TTL_MS > Date.now()
        ) {
          selection.resolvedModel = stored.model;
          selection.expiresAt = stored.checkedAt + WORKERS_AI_SELECTION_TTL_MS;
        } else {
          delete selection.resolvedModel;
          delete selection.expiresAt;
        }
      } catch (error) {
        console.error(
          "workers_ai_selection_load_failed",
          error instanceof Error ? error.name : "UnknownError",
        );
        delete selection.persist;
      }
    })().finally(() => {
      hydration = undefined;
    });

    return hydration;
  };
}
