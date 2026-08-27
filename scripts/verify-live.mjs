import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:5173");
const profile = JSON.parse(await readFile(resolve("profile/profile.json"), "utf8"));
const allowedTargets = new Set([
  "127.0.0.1",
  "localhost",
  ...profile.deployment.customDomains.map(({ hostname }) => hostname),
]);
if (
  (!allowedTargets.has(baseUrl.hostname) && !baseUrl.hostname.endsWith(".workers.dev")) ||
  !["http:", "https:"].includes(baseUrl.protocol)
) {
  throw new Error(`Refusing unapproved verification target: ${baseUrl.origin}`);
}

async function expectResponse(path, validate) {
  const response = await fetch(new URL(path, baseUrl));
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  const body = await response.text();
  validate(body, response);
  process.stdout.write(`PASS ${path}\n`);
}

await expectResponse("/", (html) => {
  if (!html.includes(profile.identity.name)) throw new Error("profile name missing from HTML");
  if (!html.includes(profile.seo.title)) throw new Error("profile title missing from HTML");
  if (html.includes("{{PROFILE_")) throw new Error("unresolved SEO template token");
});

await expectResponse("/robots.txt", (body) => {
  if (!body.includes(new URL("sitemap.xml", profile.seo.baseUrl).toString())) {
    throw new Error("robots.txt has the wrong sitemap URL");
  }
});

await expectResponse("/sitemap.xml", (body) => {
  if (!body.includes(new URL("/", profile.seo.baseUrl).toString())) {
    throw new Error("sitemap.xml has the wrong canonical URL");
  }
});

await expectResponse(`/${profile.assets.socialImage}`, (_body, response) => {
  if (!response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error("social image has the wrong content type");
  }
});

await expectResponse(`/${profile.pdf.visualFileName}`, (_body, response) => {
  if (!response.headers.get("content-type")?.includes("pdf")) {
    throw new Error("visual CV has the wrong content type");
  }
});

await expectResponse(`/${profile.pdf.atsFileName}`, (_body, response) => {
  if (!response.headers.get("content-type")?.includes("pdf")) {
    throw new Error("ATS resume has the wrong content type");
  }
});

const methodCheck = await fetch(new URL("/api/ask", baseUrl));
if (methodCheck.status !== 405) {
  throw new Error(`/api/ask method guard returned HTTP ${methodCheck.status}`);
}
process.stdout.write("PASS /api/ask method guard\n");
process.stdout.write(`Live profile verified: ${profile.identity.name} at ${baseUrl.origin}\n`);
