// fallow-ignore-file security-sink -- this loopback-only server emits header values from a fixed map.
import { copyFile, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const destination = resolve(process.argv[2] ?? "public/rodrigo-uroz-cv.pdf");
const clientRoot = resolve("dist/client");
const deployedDestination = resolve(clientRoot, "rodrigo-uroz-cv.pdf");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

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
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: destination,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "11mm", right: "11mm", bottom: "11mm", left: "11mm" },
  });
  if (destination !== deployedDestination) await copyFile(destination, deployedDestination);
  process.stdout.write(`${destination}\n`);
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose(undefined))),
  );
}
