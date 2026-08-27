import { access, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { evidenceConfigSchema, profileSchema, themeSchema } from "../src/profileSchema.ts";

const profileDirectory = resolve(process.argv[2] ?? "profile");
const assetsDirectory = resolve(profileDirectory, "assets");

async function readJson(fileName) {
  return JSON.parse(await readFile(resolve(profileDirectory, fileName), "utf8"));
}

const [profile, evidence, theme] = await Promise.all([
  readJson("profile.json").then((value) => profileSchema.parse(value)),
  readJson("evidence.json").then((value) => evidenceConfigSchema.parse(value)),
  readJson("theme.json").then((value) => themeSchema.parse(value)),
]);

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

assertUnique(
  profile.presentation.experiences.map(({ id }) => id),
  "experience id",
);
assertUnique(
  profile.presentation.capabilities.map(({ id }) => id),
  "capability id",
);
assertUnique(
  profile.presentation.projects.map(({ id }) => id),
  "project id",
);
assertUnique(
  profile.presentation.education.map(({ id }) => id),
  "education id",
);
assertUnique(
  evidence.items.map(({ sourceId }) => sourceId),
  "sourceId",
);
assertUnique(
  evidence.items.flatMap(({ facts }) => facts.map(({ factId }) => factId)),
  "factId",
);
assertUnique(
  evidence.evals.map(({ id }) => id),
  "eval id",
);

const sourceIds = new Set(evidence.items.map(({ sourceId }) => sourceId));
const visibleSections = new Set(["experience"]);
if (profile.presentation.capabilities.length > 0) visibleSections.add("capabilities");
if (profile.presentation.projects.length > 0) visibleSections.add("projects");
if (profile.presentation.education.length > 0) visibleSections.add("education");
if (
  profile.presentation.education.length > 0 ||
  profile.presentation.mentoring ||
  profile.presentation.beyond
) {
  visibleSections.add("about");
}

for (const item of evidence.items) {
  if (!visibleSections.has(item.sectionId)) {
    throw new Error(`evidence ${item.sourceId} references hidden section ${item.sectionId}`);
  }
}

for (const testCase of evidence.evals) {
  for (const sourceId of testCase.sourceIds ?? []) {
    if (!sourceIds.has(sourceId)) {
      throw new Error(`eval ${testCase.id} references unknown sourceId ${sourceId}`);
    }
  }
}

for (const item of evidence.items) {
  for (const fact of item.facts) {
    const reviewedAt = new Date(`${fact.reviewedAt}T00:00:00Z`);
    if (
      Number.isNaN(reviewedAt.valueOf()) ||
      !reviewedAt.toISOString().startsWith(fact.reviewedAt)
    ) {
      throw new Error(`fact ${fact.factId} has invalid reviewedAt ${fact.reviewedAt}`);
    }
    if (fact.expiresAt && fact.expiresAt < fact.reviewedAt) {
      throw new Error(`fact ${fact.factId} expires before it was reviewed`);
    }
    for (const rawUrl of fact.text.match(/https?:\/\/[^\s]+/g) ?? []) {
      const candidate = rawUrl.replace(/[.,;:)]+$/, "");
      if (new URL(candidate).protocol !== "https:") {
        throw new Error(`fact ${fact.factId} contains a non-HTTPS URL`);
      }
    }
  }
}

const suspiciousKey = /(?:api.?key|password|private.?key|secret|token)/i;
function rejectSuspiciousKeys(value, path = "evidence") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectSuspiciousKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (suspiciousKey.test(key)) throw new Error(`${path}.${key} looks like private data`);
    rejectSuspiciousKeys(nested, `${path}.${key}`);
  }
}
rejectSuspiciousKeys(evidence);

const assetPaths = new Set([
  profile.assets.favicon,
  profile.assets.socialImage,
  ...profile.presentation.experiences.flatMap(({ brand }) =>
    brand.kind === "asset" ? [brand.asset] : [],
  ),
]);

await Promise.all(
  [...assetPaths].map(async (assetPath) => {
    const absolutePath = resolve(assetsDirectory, assetPath);
    if (!absolutePath.startsWith(`${assetsDirectory}/`)) {
      throw new Error(`asset escapes profile/assets: ${assetPath}`);
    }
    await access(absolutePath);
  }),
);

if (extname(profile.assets.socialImage).toLowerCase() === ".png") {
  const image = await readFile(resolve(assetsDirectory, profile.assets.socialImage));
  if (image.toString("ascii", 1, 4) !== "PNG") throw new Error("social image is not a PNG");
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== profile.assets.socialImageWidth || height !== profile.assets.socialImageHeight) {
    throw new Error(
      `social image is ${width}x${height}, expected ${profile.assets.socialImageWidth}x${profile.assets.socialImageHeight}`,
    );
  }
}

if (profile.pdf.pagePolicy.min > profile.pdf.pagePolicy.max) {
  throw new Error("pdf pagePolicy.min must not exceed pagePolicy.max");
}

process.stdout.write(
  `Profile OK: ${profile.identity.name}; ${evidence.items.length} evidence sources; ${assetPaths.size} referenced assets; accent ${theme.colors.accent}\n`,
);
