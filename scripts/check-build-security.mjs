import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const clientRoot = resolve("dist/client");
const headers = await readFile(resolve(clientRoot, "_headers"), "utf8");
const csp = headers
  .split("\n")
  .find((line) => line.trimStart().startsWith("Content-Security-Policy:"));

if (!csp) throw new Error("Built _headers is missing Content-Security-Policy");

const directives = new Map(
  csp
    .slice(csp.indexOf(":") + 1)
    .split(";")
    .map((directive) => directive.trim().split(/\s+/))
    .filter(([name]) => name)
    .map(([name, ...sources]) => [name, sources]),
);

const scriptSources = directives.get("script-src") ?? [];
if (!scriptSources.includes("https://static.cloudflareinsights.com")) {
  throw new Error("script-src does not allow the Cloudflare Web Analytics beacon");
}

const fontSources = directives.get("font-src") ?? [];
if (fontSources.length !== 1 || fontSources[0] !== "'self'") {
  throw new Error("font-src must remain limited to 'self'");
}

const assetsRoot = resolve(clientRoot, "assets");
const cssFiles = (await readdir(assetsRoot)).filter((file) => file.endsWith(".css"));
const css = await Promise.all(cssFiles.map((file) => readFile(resolve(assetsRoot, file), "utf8")));
if (css.some((contents) => contents.includes("data:font/"))) {
  throw new Error("Built CSS contains a data: font blocked by font-src 'self'");
}

process.stdout.write("Build security policy verified\n");
