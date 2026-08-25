import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const executable = path.join(root, "node_modules", ".bin", "fallow");
const result = spawnSync(
  executable,
  [
    "audit",
    "--format",
    "json",
    "--quiet",
    "--gate",
    "new-only",
    "--production-dead-code",
    "--production-health",
    "--production-dupes",
    "--coverage",
    "coverage/coverage-final.json",
    ...process.argv.slice(2),
  ],
  { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(`Unable to run Fallow: ${result.error.message}`);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("Fallow did not return a valid JSON report.");
  process.exit(result.status || 2);
}

if (result.status && result.status !== 0) process.exit(result.status);
if (report.verdict === "fail") process.exit(1);
if (report.verdict !== "pass" && report.verdict !== "warn") {
  console.error(`Unexpected Fallow verdict: ${String(report.verdict)}`);
  process.exit(2);
}
