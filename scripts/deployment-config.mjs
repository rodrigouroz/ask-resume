import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { evidenceConfigSchema, profileSchema } from "../src/profileSchema.ts";
import { workerRuntimeConfig } from "../src/workerRuntimeConfig.ts";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function builtWranglerPath(root) {
  const entries = await readdir(resolve(root, "dist"), { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "client") continue;
    const candidate = resolve(root, "dist", entry.name, "wrangler.json");
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

export async function generateDeploymentConfig({ production = false, root = process.cwd() } = {}) {
  const profile = profileSchema.parse(await readJson(resolve(root, "profile/profile.json")));
  evidenceConfigSchema.parse(await readJson(resolve(root, "profile/evidence.json")));
  const sourcePath = await builtWranglerPath(root);
  const config = await readJson(sourcePath);
  const deployment = profile.deployment;

  config.name = production ? deployment.workerName : `${deployment.workerName}-preview`;
  config.routes = production
    ? deployment.customDomains.map(({ hostname, zoneName, customDomain }) =>
        customDomain
          ? { pattern: hostname, custom_domain: true }
          : { pattern: `${hostname}/*`, zone_name: zoneName },
      )
    : [];
  if (production) {
    config.assets.binding = "ASSETS";
    config.assets.run_worker_first = true;
  }
  config.workers_dev = true;
  const runtimeConfig = workerRuntimeConfig(profile);
  Object.assign(config, runtimeConfig);
  if (!("ai" in runtimeConfig)) delete config.ai;

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
