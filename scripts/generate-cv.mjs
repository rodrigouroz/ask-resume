// fallow-ignore-file security-sink -- this loopback-only server emits header values from a fixed map.
import { copyFile, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const profile = JSON.parse(await readFile(resolve("profile/profile.json"), "utf8"));
const requestedDestination = process.argv[2] ? resolve(process.argv[2]) : null;
const clientRoot = resolve("dist/client");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

const documents = requestedDestination
  ? [{ path: requestedDestination, query: "/" }]
  : [
      { path: resolve("profile/assets", profile.pdf.visualFileName), query: "/" },
      {
        path: resolve("profile/assets", profile.pdf.atsFileName),
        query: "/?resume=ats&language=en",
      },
    ];

function requestedFile(url) {
  const pathname = new URL(url ?? "/", "http://127.0.0.1").pathname;
  return pathname === "/" ? resolve(clientRoot, "index.html") : resolve(clientRoot, `.${pathname}`);
}

function isInsideClientRoot(filePath) {
  return filePath === clientRoot || filePath.startsWith(`${clientRoot}/`);
}

async function serveFile(request, response) {
  const filePath = requestedFile(request.url);
  if (!isInsideClientRoot(filePath)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404).end();
  }
}

const server = createServer((request, response) => void serveFile(request, response));
await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(4173, "127.0.0.1", resolveListen);
});
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ locale: "en-US" });
  for (const document of documents) {
    await page.goto(`http://127.0.0.1:4173${document.query}`, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: document.path,
      format: "A4",
      outline: true,
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      margin: { top: "11mm", right: "11mm", bottom: "11mm", left: "11mm" },
    });
    const deployedDestination = resolve(clientRoot, document.path.split("/").at(-1));
    if (document.path !== deployedDestination) {
      await copyFile(document.path, deployedDestination);
    }
    process.stdout.write(`${document.path}\n`);
  }
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose(undefined))),
  );
}
