import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const destination = resolve(process.argv[2] ?? ".wrangler/vectorize/ask-rodrigo-corpus.ndjson");
const temporaryDirectory = await mkdtemp(`${tmpdir()}/ask-rodrigo-corpus-`);
const temporaryModule = resolve(temporaryDirectory, "assistant/corpus.js");
const run = promisify(execFile);

try {
  await run(resolve("node_modules/.bin/tsc"), [
    "--ignoreConfig",
    "src/assistant/corpus.ts",
    "--outDir",
    temporaryDirectory,
    "--module",
    "preserve",
    "--target",
    "es2024",
    "--moduleResolution",
    "bundler",
    "--skipLibCheck",
  ]);
  const { getCurrentAssistantCorpus } = await import(pathToFileURL(temporaryModule).href);
  const today = new Date().toISOString().slice(0, 10);
  const approved = getCurrentAssistantCorpus(today).filter(({ status }) => status === "approved");
  const inputs = approved.map(({ title, searchTerms, facts }) =>
    [title, searchTerms.join(" · "), ...facts.map(({ text }) => text)].join("\n"),
  );
  const response = await new OpenAI({ apiKey }).embeddings.create({
    model: "text-embedding-3-large",
    dimensions: 1024,
    encoding_format: "float",
    input: inputs,
  });
  const records = approved.map(({ sourceId, sectionId, facts }, index) => {
    const values = response.data[index]?.embedding;
    if (!values) throw new Error(`Missing embedding for ${sourceId}`);
    return JSON.stringify({
      id: sourceId,
      values,
      metadata: {
        sourceId,
        sectionId,
        status: "approved",
        reviewedAt: facts
          .map(({ reviewedAt }) => reviewedAt)
          .sort()
          .at(-1),
      },
    });
  });

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${records.join("\n")}\n`, "utf8");
  process.stdout.write(`${destination}\n`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
