import { spawn } from "node:child_process";
import { generateDeploymentConfig } from "./deployment-config.mjs";

const production = process.argv.includes("--production");
const configPath = await generateDeploymentConfig({ production });
const child = spawn("npx", ["wrangler", "deploy", "--config", configPath], {
  stdio: "inherit",
});

const exitCode = await new Promise((resolveExit, rejectExit) => {
  child.once("error", rejectExit);
  child.once("exit", (code, signal) => {
    if (signal) rejectExit(new Error(`wrangler exited with signal ${signal}`));
    else resolveExit(code ?? 1);
  });
});

process.exitCode = exitCode;
