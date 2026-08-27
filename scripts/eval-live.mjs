// fallow-ignore-file security-sink -- the operator-provided URL is restricted to local or canonical hosts below.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:5173");
const profile = JSON.parse(await readFile(resolve("profile/profile.json"), "utf8"));
const evidence = JSON.parse(await readFile(resolve("profile/evidence.json"), "utf8"));

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires an evaluation ID`);
  return value;
}

const selectedCaseId = argumentValue("--case");
const firstCaseId = argumentValue("--from");
if (selectedCaseId && firstCaseId) throw new Error("Use either --case or --from, not both");
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
const firstCaseIndex = firstCaseId ? evidence.evals.findIndex(({ id }) => id === firstCaseId) : 0;
if (firstCaseIndex < 0) throw new Error(`Unknown evaluation case: ${firstCaseId}`);
const resumedCases = evidence.evals.slice(firstCaseIndex);
const cases = selectedCaseId
  ? evidence.evals.filter(({ id }) => id === selectedCaseId)
  : resumedCases;
if (cases.length === 0) throw new Error(`Unknown evaluation case: ${selectedCaseId}`);
let failures = 0;
const requestSpacingMs =
  baseUrl.hostname.endsWith(".workers.dev") || profile.deployment.aiProvider === "workers-ai"
    ? 6_500
    : 0;
let lastRequestStartedAt = 0;
const maxRateLimitRetries = 2;
const defaultRateLimitRetryMs = 60_000;

async function waitForRateLimitWindow() {
  const remaining = lastRequestStartedAt + requestSpacingMs - Date.now();
  if (remaining > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, remaining));
  lastRequestStartedAt = Date.now();
}

function rateLimitRetryMs(response) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return defaultRateLimitRetryMs;
  const seconds = Number.parseFloat(retryAfter);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : defaultRateLimitRetryMs;
}

function evaluationRequestBody(testCase) {
  return JSON.stringify({
    question: testCase.question,
    uiLanguage: testCase.uiLanguage,
    history: testCase.history ?? [],
    safetyId: crypto.randomUUID(),
  });
}

function isFinalRateLimitResponse(response, retry) {
  return response.status !== 429 || retry === maxRateLimitRetries;
}

async function requestEvaluation(testCase) {
  for (let retry = 0; retry <= maxRateLimitRetries; retry += 1) {
    await waitForRateLimitWindow();
    const response = await fetch(new URL("/api/ask", baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: evaluationRequestBody(testCase),
    });
    if (isFinalRateLimitResponse(response, retry)) return response;
    const delayMs = rateLimitRetryMs(response);
    process.stdout.write(
      `RETRY ${testCase.id}: HTTP 429; waiting ${Math.ceil(delayMs / 1_000)}s (${retry + 1}/${maxRateLimitRetries})\n`,
    );
    await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
  }
  throw new Error("Rate-limit retry loop ended unexpectedly");
}

function missingCitationProblems(expectedSources, actualSources) {
  return [...expectedSources]
    .filter((sourceId) => !actualSources.includes(sourceId))
    .map((sourceId) => `missing source ${sourceId}`);
}

function unexpectedCitationProblems(expectedSources, actualSources) {
  const unexpectedSources = actualSources.filter((sourceId) => !expectedSources.has(sourceId));
  return unexpectedSources.length > 0 ? [`unexpected sources ${unexpectedSources.join(",")}`] : [];
}

function citationProblems(testCase, actualSources) {
  if (!testCase.sourceIds) return [];
  const expectedSources = new Set(testCase.sourceIds);
  const allowedSources = new Set(testCase.allowedSourceIds ?? testCase.sourceIds);
  return [
    ...missingCitationProblems(expectedSources, actualSources),
    ...unexpectedCitationProblems(allowedSources, actualSources),
  ];
}

function requiredContentProblems(required, normalizedAnswer) {
  if (!required) return [];
  return required
    .filter((value) => !normalizedAnswer.includes(value.toLocaleLowerCase()))
    .map((value) => `missing required output ${value}`);
}

function forbiddenContentProblems(forbidden, normalizedAnswer) {
  if (!forbidden) return [];
  return forbidden
    .filter((value) => normalizedAnswer.includes(value.toLocaleLowerCase()))
    .map((value) => `forbidden output ${value}`);
}

function answerContentProblems(testCase, answer) {
  const normalizedAnswer = String(answer ?? "").toLocaleLowerCase();
  return [
    ...requiredContentProblems(testCase.required, normalizedAnswer),
    ...forbiddenContentProblems(testCase.forbidden, normalizedAnswer),
  ];
}

function responseContractProblems(testCase, response, body) {
  return [
    ...(response.ok ? [] : [`HTTP ${response.status}`]),
    ...(testCase.statuses.includes(body.status) ? [] : [`status=${body.status}`]),
    ...(body.language === testCase.language ? [] : [`language=${body.language}`]),
  ];
}

function responseProblems(testCase, response, body) {
  const actualSources = body.citations?.map(({ sourceId }) => sourceId) ?? [];
  return [
    ...responseContractProblems(testCase, response, body),
    ...citationProblems(testCase, actualSources),
    ...answerContentProblems(testCase, body.answer),
  ];
}

for (const testCase of cases) {
  const problems = [];
  const attempts = testCase.attempts ?? 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await requestEvaluation(testCase);
    const body = await response.json();
    const attemptProblems = responseProblems(testCase, response, body);
    problems.push(
      ...attemptProblems.map((problem) =>
        attempts > 1 ? `attempt ${attempt}: ${problem}` : problem,
      ),
    );
  }
  if (problems.length > 0) failures += 1;
  process.stdout.write(
    `${problems.length === 0 ? "PASS" : "FAIL"} ${testCase.id}${problems.length ? `: ${problems.join("; ")}` : ""}\n`,
  );
}

process.stdout.write(`${cases.length - failures}/${cases.length} live cases passed\n`);
if (failures > 0) process.exitCode = 1;
