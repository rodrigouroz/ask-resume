import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateDeploymentConfig } from "./deployment-config.mjs";

const projectRoot = process.cwd();
const temporaryDirectories: string[] = [];

async function deploymentDirectory(customDomains: unknown[]): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "ask-resume-deployment-"));
  temporaryDirectories.push(root);
  await mkdir(resolve(root, "profile"));
  await mkdir(resolve(root, "dist/worker"), { recursive: true });

  const profile = JSON.parse(
    await readFile(resolve(projectRoot, "profile.template/profile.json"), "utf8"),
  );
  profile.deployment.customDomains = customDomains;
  await writeFile(resolve(root, "profile/profile.json"), JSON.stringify(profile));
  await writeFile(
    resolve(root, "profile/evidence.json"),
    await readFile(resolve(projectRoot, "profile.template/evidence.json"), "utf8"),
  );
  await writeFile(
    resolve(root, "dist/worker/wrangler.json"),
    JSON.stringify({ assets: { directory: "../client" } }),
  );
  return root;
}

async function generatedConfig(
  root: string,
  production: boolean,
): Promise<Record<string, unknown>> {
  const outputPath = await generateDeploymentConfig({ production, root });
  return JSON.parse(await readFile(outputPath, "utf8"));
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("deployment config", () => {
  it("configures production routes and Worker-first assets", async () => {
    const root = await deploymentDirectory([
      {
        hostname: "cv.example.com",
        zoneName: "example.com",
        customDomain: true,
      },
      {
        hostname: "example.com",
        zoneName: "example.com",
        customDomain: false,
      },
    ]);

    const config = await generatedConfig(root, true);

    expect(config).toMatchObject({
      name: "ask-marina-soler",
      routes: [
        { pattern: "cv.example.com", custom_domain: true },
        { pattern: "example.com/*", zone_name: "example.com" },
      ],
      assets: {
        directory: "../client",
        binding: "ASSETS",
        run_worker_first: true,
      },
      workers_dev: true,
    });
  });

  it("keeps preview deploys on workers.dev without production routes", async () => {
    const root = await deploymentDirectory([
      {
        hostname: "cv.example.com",
        zoneName: "example.com",
        customDomain: true,
      },
    ]);

    const config = await generatedConfig(root, false);

    expect(config).toMatchObject({
      name: "ask-marina-soler-preview",
      routes: [],
      assets: { directory: "../client" },
      workers_dev: true,
    });
    expect(config.assets).not.toHaveProperty("binding");
    expect(config.assets).not.toHaveProperty("run_worker_first");
  });
});
