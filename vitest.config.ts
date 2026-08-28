import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: [
        "scripts/deployment-config.mjs",
        "src/**/*.{ts,tsx}",
        "worker/index.ts",
        "worker/workersAiModel.ts",
        "worker/workersAiSelection.ts",
      ],
      exclude: ["src/main.tsx", "src/**/*.test.{ts,tsx}", "src/test/**"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
