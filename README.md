# Ask Resume

This repository produces one online CV per checkout: an accessible website, a cited professional assistant, a visual CV, an ATS-oriented resume, SEO metadata, and an independent Cloudflare Worker deployment.

The checked-in `profile/` is Rodrigo Uroz's real profile and preserves the current public design. `examples/marina-soler/profile/` is a completely fictional second profile used as the isolation test. There is no profile selector, account system, database of people, or multi-tenant runtime.

## Quick start

Use Node 26, then install and validate the checkout:

```bash
npm ci
npm run profile:check
npm run dev
```

Everything personal lives in one directory:

```text
profile/
├── profile.json       identity, presentation, SEO, PDF and deployment
├── evidence.json      approved public facts and live chat evaluations
├── theme.json         visual tokens
└── assets/            favicon, social image, photos and local brand assets
```

Edit only that directory to make the checkout represent another person. The build fails on invalid schemas, duplicate IDs, broken evidence references, unsafe asset paths, missing files, invalid URLs, or suspicious private-data fields.

Professional experience is the required core and must contain at least one entry. `capabilities`, `projects`, and `education` may be omitted or set to an empty array; `mentoring` and `beyond` may also be omitted. Empty sections disappear consistently from the navigation, website, visual CV, and ATS resume. Evidence cannot point to a section that the profile does not render.

## Commands

```bash
npm run profile:check
npm run dev
npm run cv:pdf
npm run eval:live -- https://your-preview.workers.dev
npm run deploy
npm run verify:live -- https://your-preview.workers.dev
```

`npm run cv:pdf` writes both PDF projections named in `profile.json`: the visual CV and the additional linear ATS resume. The ATS artifact never replaces the public visual CV automatically.

`npm run deploy` builds a temporary Wrangler configuration from the active profile and deploys `<workerName>-preview` to `workers.dev` with no custom routes. Analytics Engine, rate limiting, the daily budget, Workers AI, and the Worker name are scoped by the active checkout. `npm run deploy:production` enables the profile's custom routes and must only be used after explicit production approval.

For an OpenAI profile, copy the committed template, replace its placeholder locally, and configure the same secret on the preview Worker after its first deploy:

```bash
cp .dev.vars.example .dev.vars
npx wrangler secret put OPENAI_API_KEY --name <workerName>-preview
```

A Workers AI profile needs no OpenAI secret.

## Proving profile isolation

The Marina fixture is intended to be copied into a second checkout, not selected at runtime. It deliberately omits independent projects and mentoring to exercise optional-section behavior:

```bash
git clone <your-fork-url> marina-cv
cd marina-cv
# This intentionally replaces the checkout's active profile.
rsync -a --delete --checksum examples/marina-soler/profile/ profile/
npm ci
npm run profile:check
npm run check
npm run test:e2e
npm run cv:pdf
npm run deploy
```

Before publishing the starter, the Rodrigo and Marina checkouts must each pass their local and live gates. The Marina build is also scanned for Rodrigo's names, domains, source IDs, brands, and assets. Production remains unchanged until both previews receive visual and conversational acceptance.

## Assistant providers

`POST /api/ask`, its cited response, and the `GroundedModel` interface stay provider-independent.

- `openai` remains Rodrigo's control provider.
- `workers-ai` uses the `AI` binding and defaults to `@cf/zai-org/glm-4.7-flash`.
- `@cf/zai-org/glm-5.3-flash` is recorded as an optional paid control, not an automatic default.

Provider adoption is evidence-based. The same bilingual live suite checks grounding, exact citations, honest negatives, malformed output, private-data requests, and prompt-injection attempts. GLM 4.7 becomes the starter default only after it reaches parity with the OpenAI control; otherwise OpenAI remains the default.

The August 2026 preview evaluation did not reach that bar: both GLM presets failed supported or adversarial cases, and the 4.7 two-pass path was too slow for the chat UX. The checked-in Rodrigo and Marina profiles therefore use OpenAI by default. See [docs/workers-ai-evaluation.md](docs/workers-ai-evaluation.md) for the evidence and retest procedure.

## Evidence and privacy boundary

Every assistant claim must exist in `profile/evidence.json` as a public fact with stable `sourceId`, `sectionId`, `factId`, and `reviewedAt` values. Time-sensitive facts also use `expiresAt` and disappear from runtime context when stale. The model receives the full current corpus; Vectorize and embeddings are intentionally absent.

The assistant has no repository, browser, email, filesystem, or private-data access. Unsupported questions use a localized deterministic fallback. Conversations stay in the current tab. Analytics contain only allowlisted aggregate event names and counts—never question text, answers, safety IDs, IP addresses, or visitor identifiers.

## Logos and assets

Runtime assets are always local. Each asset-backed brand records a local path and alt text, with optional source and license notes. If no approved mark exists, use a deterministic monogram.

```bash
npm run logos:suggest -- "Company name" company.example
```

This command prints discovery links for the official site, Logo.dev, and Loguitos. It never downloads or incorporates a mark. Neither Logo.dev nor Loguitos is a runtime dependency or deployment requirement.

## Quality gates

```bash
npm run check
npm run test:coverage
npx playwright install chromium
npm run test:e2e
npm run cv:pdf
```

`npm run check` covers formatting, type-aware lint, TypeScript, unit tests, the production build, profile validation, and Cloudflare binding drift. Playwright covers desktop/mobile behavior and SEO. PDF acceptance also requires rendered-page inspection, extractable text, links, reading order, metadata, page count, and tagging—not merely a successful print command.

The reusable-resume decisions and sources are versioned in [docs/resume-principles.md](docs/resume-principles.md). See [CONTRIBUTING.md](CONTRIBUTING.md) for the evidence-change contract and [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

[MIT](LICENSE) © Rodrigo Uroz
