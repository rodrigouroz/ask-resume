import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const { stdout: trackedOutput } = await execFileAsync("git", [
  "ls-files",
  "--",
  "profile",
  "output",
]);
const tracked = trackedOutput.trim().split("\n").filter(Boolean);

if (tracked.length > 0) {
  throw new Error(`Private/generated paths are tracked by Git:\n${tracked.join("\n")}`);
}

const { stdout: ignoredOutput } = await execFileAsync("git", [
  "check-ignore",
  "--no-index",
  "--",
  "profile/profile.json",
  "output/generated.pdf",
]);
const ignored = new Set(ignoredOutput.trim().split("\n").filter(Boolean));

for (const expected of ["profile/profile.json", "output/generated.pdf"]) {
  if (!ignored.has(expected)) throw new Error(`${expected} is not ignored by Git`);
}

process.stdout.write("Profile privacy OK: profile/ and output/ are ignored and untracked.\n");
