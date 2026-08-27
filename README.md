# Ask Resume

Ask Resume turns one checkout into one person's online CV: an accessible website, a cited professional assistant, a visual CV, an ATS-oriented resume, SEO metadata, and an independent Cloudflare Worker deployment.

There is no account system, profile selector, database of people, or multi-tenant runtime.

## How profiles work

The repository commits one fictional profile:

```text
profile.template/        synthetic Marina Soler starter, safe to commit
profile/                 your active profile, ignored by Git
output/                  generated artifacts, ignored by Git
```

`profile.template/` contains the fully working fictional Marina Soler example. `npm run profile:init` copies it to `profile/` only when that directory does not already exist. It never overwrites an active profile.

Because `profile/` is ignored, Git does not back it up. Keep a private backup of your real profile and assets.

## Create your CV

Fork or clone the repository, then use Node 26:

```bash
npm ci
npm run profile:init
npm run profile:check
npm run dev
```

Open the local URL printed by Vite. At first it shows the fictional Marina profile.

Turn it into your real CV by editing only:

```text
profile/
├── profile.json       identity, presentation, SEO, PDF and deployment
├── evidence.json      approved public facts and live chat evaluations
├── theme.json         visual tokens
└── assets/            favicon, social image, photos and local brand assets
```

Replace every fictional identity, URL, deployment name, fact, evaluation, and asset before publishing. The validator rejects invalid schemas, duplicate IDs, broken evidence references, unsafe asset paths, missing files, invalid URLs, and suspicious private-data fields.

Professional experience is the required core and must contain at least one entry. `capabilities`, `projects`, and `education` may be omitted or empty; `mentoring` and `beyond` may also be omitted. Empty sections disappear from the navigation, website, visual CV, and ATS resume. Evidence cannot reference a section that is not rendered.

## Validate and generate PDFs

```bash
npm run profile:check
npm run check
npm run test:coverage
npx playwright install chromium
npm run test:e2e
npm run cv:pdf
```

`npm run cv:pdf` generates the visual CV and linear ATS resume named in `profile/profile.json`. The ATS artifact never replaces the public visual CV automatically.

PDF acceptance includes rendered-page inspection, extractable text, working links, reading order, metadata, page count, and tagging—not merely a successful command.

## Deploy a preview

The default provider is OpenAI. Create a local development secret and deploy the preview Worker:

```bash
cp .dev.vars.example .dev.vars
npm run deploy
npx wrangler secret put OPENAI_API_KEY --name your-worker-preview
npm run eval:live -- https://your-worker-preview.your-account.workers.dev
npm run verify:live -- https://your-worker-preview.your-account.workers.dev
```

`npm run deploy` generates a temporary Wrangler configuration from the active `profile/`. The preview uses `<workerName>-preview`, no custom routes, and its own Analytics Engine dataset, rate limiter, and daily budget.

After the preview passes and you have reviewed the site, chat, SEO, and PDFs:

```bash
npm run deploy:production
```

Production deployment enables the custom domains configured in `profile/profile.json`. Use it only after confirming those routes and the target Cloudflare account.

Workers AI remains available as an evaluation provider. The checked-in GLM presets are not the default because the latest recorded run did not meet the grounding and latency bar. See [docs/workers-ai-evaluation.md](docs/workers-ai-evaluation.md).

## Evidence and privacy boundary

Every assistant claim must exist in `profile/evidence.json` as a public fact with stable `sourceId`, `sectionId`, `factId`, and `reviewedAt` values. Time-sensitive facts also use `expiresAt` and disappear from runtime context when stale. Tailoring may select and reorder verified facts; it must never invent metrics.

The assistant has no repository, browser, email, filesystem, or private-data access. Unsupported questions use a localized deterministic fallback. Conversations stay in the current tab. Analytics contain only allowlisted aggregate event names and counts—never question text, answers, safety IDs, IP addresses, or visitor identifiers.

Do not put credentials, private notes, unpublished evidence, or other secrets in either profile directory. Git ignore prevents new accidental commits; it is not encryption and does not erase earlier repository history.

## Logos and assets

Runtime assets are always local. Each asset-backed brand records a local path and alt text, with optional source and license notes. If no approved mark exists, use a deterministic monogram.

```bash
npm run logos:suggest -- "Company name" company.example
```

This command prints discovery links for the official site, Logo.dev, and Loguitos. It never downloads or incorporates a mark. Neither service is a runtime dependency.

## Commands

```bash
npm run profile:init
npm run profile:check
npm run profile:privacy
npm run dev
npm run cv:pdf
npm run eval:live -- https://your-preview.workers.dev
npm run deploy
npm run verify:live -- https://your-preview.workers.dev
```

The reusable-resume decisions and sources are versioned in [docs/resume-principles.md](docs/resume-principles.md). See [CONTRIBUTING.md](CONTRIBUTING.md) for the evidence-change contract and [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

[MIT](LICENSE) © Rodrigo Uroz
