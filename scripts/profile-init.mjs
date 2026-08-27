import { access, cp } from "node:fs/promises";
import { resolve } from "node:path";

const templateDirectory = resolve("profile.template");
const profileDirectory = resolve("profile");

try {
  await access(profileDirectory);
  process.stdout.write("profile/ already exists; leaving it unchanged.\n");
  process.exit(0);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await access(templateDirectory);
await cp(templateDirectory, profileDirectory, {
  recursive: true,
  errorOnExist: true,
  force: false,
});

process.stdout.write("Created private profile/ from the synthetic profile.template/.\n");
