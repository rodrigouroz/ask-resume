import { rm } from "node:fs/promises";
import { basename, resolve } from "node:path";

const buildDirectory = resolve("dist");
if (basename(buildDirectory) !== "dist") throw new Error("Refusing to clean an unexpected path");
await rm(buildDirectory, { force: true, recursive: true });
