import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { evidenceConfigSchema, profileSchema } from "../src/profileSchema.ts";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function builtWranglerPath() {
  const entries = await readdir(resolve("dist"), { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "client") continue;
    const candidate = resolve("dist", entry.name, "wrangler.json");
    try {
      await readFile(candidate, "utf8");
      candidates.push(candidate);
    } catch {
      // Ignore non-Worker output directories.
    }
  }
  if (candidates.length !== 1) {
    throw new Error(`Expected one built Worker config, found ${candidates.length}`);
  }
  return candidates[0];
}

export async function generateDeploymentConfig({ production = false } = {}) {
  const profile = profileSchema.parse(await readJson(resolve("profile/profile.json")));
  evidenceConfigSchema.parse(await readJson(resolve("profile/evidence.json")));
  const sourcePath = await builtWranglerPath();
  const config = await readJson(sourcePath);
  const deployment = profile.deployment;

  config.name = production ? deployment.workerName : `${deployment.workerName}-preview`;
  config.routes = production
    ? deployment.customDomains.map(({ hostname, zoneName }) => ({
        pattern: `${hostname}/*`,
        zone_name: zoneName,
      }))
    : [];
  config.workers_dev = true;
  config.vars = {
    AI_PROVIDER: deployment.aiProvider,
    DAILY_ASK_LIMIT: String(deployment.dailyQuestionLimit),
    PROFILE_SLUG: profile.identity.slug,
    WORKERS_AI_MODEL: deployment.workersAiModel,
  };
  config.ai = { binding: "AI" };
  config.analytics_engine_datasets = [
    { binding: "PRODUCT_ANALYTICS", dataset: deployment.analyticsDataset },
  ];
  config.ratelimits = [
    {
      name: "ASK_RATE_LIMITER",
      namespace_id: deployment.rateLimitNamespaceId,
      simple: { limit: 10, period: 60 },
    },
  ];

  delete config.configPath;
  delete config.userConfigPath;
  delete config.topLevelName;
  delete config.definedEnvironments;

  const outputPath = resolve(dirname(sourcePath), "wrangler.profile.json");
  await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`);
  return outputPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = await generateDeploymentConfig({
    production: process.argv.includes("--production"),
  });
  process.stdout.write(`${path}\n`);
}
