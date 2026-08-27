// fallow-ignore-file security-sink -- the operator-provided URL is restricted to local or canonical hosts below.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:5173");
const profile = JSON.parse(await readFile(resolve("profile/profile.json"), "utf8"));
const evidence = JSON.parse(await readFile(resolve("profile/evidence.json"), "utf8"));
const allowedTargets = new Set([
  "127.0.0.1",
  "localhost",
  ...profile.deployment.customDomains.map(({ hostname }) => hostname),
]);
if (
  (!allowedTargets.has(baseUrl.hostname) && !baseUrl.hostname.endsWith(".workers.dev")) ||
  !["http:", "https:"].includes(baseUrl.protocol)
) {
  throw new Error(`Refusing unapproved evaluation target: ${baseUrl.origin}`);
}
const cases = evidence.evals;
let failures = 0;
const requestSpacingMs =
  baseUrl.hostname.endsWith(".workers.dev") || profile.deployment.aiProvider === "workers-ai"
    ? 6_500
    : 0;
let lastRequestStartedAt = 0;

async function waitForRateLimitWindow() {
  const remaining = lastRequestStartedAt + requestSpacingMs - Date.now();
  if (remaining > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, remaining));
  lastRequestStartedAt = Date.now();
}

for (const testCase of cases) {
  await waitForRateLimitWindow();
  const response = await fetch(new URL("/api/ask", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question: testCase.question,
      uiLanguage: testCase.uiLanguage,
      history: [],
      safetyId: crypto.randomUUID(),
    }),
  });
  const body = await response.json();
  const actualSources = body.citations?.map(({ sourceId }) => sourceId) ?? [];
  const problems = [];
  if (!response.ok) problems.push(`HTTP ${response.status}`);
  if (!testCase.statuses.includes(body.status)) problems.push(`status=${body.status}`);
  if (body.language !== testCase.language) problems.push(`language=${body.language}`);
  for (const sourceId of testCase.sourceIds ?? []) {
    if (!actualSources.includes(sourceId)) problems.push(`missing source ${sourceId}`);
  }
  if ((testCase.sourceIds?.length ?? -1) === 0 && actualSources.length > 0) {
    problems.push(`unexpected sources ${actualSources.join(",")}`);
  }
  for (const forbidden of testCase.forbidden ?? []) {
    if (body.answer?.toLocaleLowerCase().includes(forbidden.toLocaleLowerCase())) {
      problems.push(`forbidden output ${forbidden}`);
    }
  }

  if (problems.length > 0) failures += 1;
  process.stdout.write(
    `${problems.length === 0 ? "PASS" : "FAIL"} ${testCase.id}${problems.length ? `: ${problems.join("; ")}` : ""}\n`,
  );
}

process.stdout.write(`${cases.length - failures}/${cases.length} live cases passed\n`);
if (failures > 0) process.exitCode = 1;
