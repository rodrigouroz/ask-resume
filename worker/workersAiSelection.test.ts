import { describe, expect, it, vi } from "vitest";
import {
  createWorkersAISelectionLoader,
  FREE_WORKERS_AI_MODEL,
  PREMIUM_WORKERS_AI_MODEL,
  type WorkersAIModelSelection,
} from "./workersAiSelection";

const SIX_HOURS_MS = 6 * 60 * 60 * 1_000;

describe("Workers AI model selection persistence", () => {
  it("loads the deployment selection once per Worker isolate", async () => {
    const checkedAt = Date.now();
    const getWorkersAIModelSelection = vi.fn<
      () => Promise<{ model: typeof FREE_WORKERS_AI_MODEL; checkedAt: number }>
    >(async () => ({ model: FREE_WORKERS_AI_MODEL, checkedAt }));
    const setWorkersAIModelSelection = vi.fn<(model: string) => Promise<void>>(
      async () => undefined,
    );
    const getByName = vi.fn<
      () => {
        getWorkersAIModelSelection: typeof getWorkersAIModelSelection;
        setWorkersAIModelSelection: typeof setWorkersAIModelSelection;
      }
    >(() => ({ getWorkersAIModelSelection, setWorkersAIModelSelection }));
    const selection: WorkersAIModelSelection = {};
    const load = createWorkersAISelectionLoader(selection);
    const env = {
      ASK_DAILY_BUDGET: { getByName },
    } as unknown as Env;

    await Promise.all([load(env), load(env)]);

    expect(getByName).toHaveBeenCalledOnce();
    expect(getByName).toHaveBeenCalledWith("workers-ai-model-selection");
    expect(getWorkersAIModelSelection).toHaveBeenCalledOnce();
    expect(selection.resolvedModel).toBe(FREE_WORKERS_AI_MODEL);
    expect(selection.expiresAt).toBe(checkedAt + SIX_HOURS_MS);

    await selection.persist?.(PREMIUM_WORKERS_AI_MODEL);
    expect(setWorkersAIModelSelection).toHaveBeenCalledWith(PREMIUM_WORKERS_AI_MODEL);
  });

  it("falls back to in-memory detection when persistence is unavailable", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const selection: WorkersAIModelSelection = {};
    const load = createWorkersAISelectionLoader(selection);
    const env = {
      ASK_DAILY_BUDGET: {
        getByName: () => ({
          getWorkersAIModelSelection: vi.fn<() => Promise<never>>(async () => {
            throw new Error("storage unavailable");
          }),
          setWorkersAIModelSelection: vi.fn<(model: string) => void>(),
        }),
      },
    } as unknown as Env;

    try {
      await expect(load(env)).resolves.toBeUndefined();
      expect(selection.resolvedModel).toBeUndefined();
      expect(selection.persist).toBeUndefined();
      expect(error).toHaveBeenCalledWith("workers_ai_selection_load_failed", "Error");
    } finally {
      error.mockRestore();
    }
  });

  it("expires a persisted choice so account access can be evaluated again", async () => {
    const getWorkersAIModelSelection = vi.fn<
      () => Promise<{ model: typeof FREE_WORKERS_AI_MODEL; checkedAt: number }>
    >(async () => ({
      model: FREE_WORKERS_AI_MODEL,
      checkedAt: Date.now() - SIX_HOURS_MS - 1,
    }));
    const selection: WorkersAIModelSelection = {
      resolvedModel: FREE_WORKERS_AI_MODEL,
      expiresAt: Date.now() - 1,
    };
    const load = createWorkersAISelectionLoader(selection);
    const env = {
      ASK_DAILY_BUDGET: {
        getByName: () => ({
          getWorkersAIModelSelection,
          setWorkersAIModelSelection: vi.fn<(model: string) => Promise<void>>(
            async () => undefined,
          ),
        }),
      },
    } as unknown as Env;

    await load(env);

    expect(getWorkersAIModelSelection).toHaveBeenCalledOnce();
    expect(selection.resolvedModel).toBeUndefined();
    expect(selection.expiresAt).toBeUndefined();
  });
});
