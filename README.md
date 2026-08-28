# Ask Resume

Ask Resume turns one checkout into one person's online CV: an accessible website, a cited professional assistant, a visual CV, an ATS-oriented resume, SEO metadata, and an optional Cloudflare deployment.

The repository holds one active profile at a time. It is not an account system or multi-tenant service.

## Create your CV

Use Node 26, then install the project and create your private profile:

```bash
npm ci
npm run profile:init
```

`profile:init` copies the fictional Marina Soler example from `profile.template/` to `profile/`. It never overwrites an existing profile.

### 1. Add your information

Edit only these files:

```text
profile/
├── profile.json       identity, presentation, SEO, PDF and deployment
├── evidence.json      approved public facts used by the assistant
├── theme.json         visual tokens
└── assets/            favicon, social image and local brand assets
```

Replace every fictional identity, URL, deployment name, fact, evaluation, and asset before publishing.

Professional experience is required. Capabilities, projects, education, mentoring, and personal information are optional; empty sections are not rendered.

`profile/` is ignored by Git. Keep a private backup of your real profile and assets.

### 2. Validate and preview

```bash
npm run profile:check
npm run dev
```

Open the local URL printed by Vite. Run `profile:check` again after changing profile data or assets.

### 3. Generate your PDFs

```bash
npx playwright install chromium
npm run cv:pdf
```

Installing Chromium is required once on each machine because it renders the PDFs. It does not run the Playwright test suite.

`cv:pdf` validates and builds the profile, then creates the visual CV and linear ATS resume in `profile/assets/`. Their filenames come from `profile/profile.json`.

You do not need to run the repository unit tests, coverage, or Playwright end-to-end tests to preview or generate your CV.

## Publish it with Cloudflare (optional)

The default deployment uses Cloudflare Workers AI and does not require a model API key.

Create an isolated preview first:

```bash
npx wrangler login
npm run deploy
```

The command prints the preview URL. After reviewing the website, assistant, SEO, and PDFs, verify that preview and deploy the configured production domains:

```bash
npm run verify:live -- https://your-preview.workers.dev
npm run eval:live -- https://your-preview.workers.dev
npm run deploy:production
```

Production deployment uses the Cloudflare account and custom domains configured in `profile/profile.json`; confirm both before running it.

Advanced provider configuration, model selection, quotas, and evaluation evidence live in [docs/workers-ai-evaluation.md](docs/workers-ai-evaluation.md).

## Content and privacy

- Put only approved public professional facts in `profile/evidence.json`.
- Do not include credentials, private notes, unpublished evidence, or secrets in either profile directory.
- Time-sensitive facts must include an expiration date so the assistant stops using stale claims.
- Analytics contain aggregate event names and counts, never questions, answers, IP addresses, or visitor identifiers.

Git ignore prevents new accidental commits; it is not encryption and does not erase repository history.

## Logos and assets (optional)

Runtime assets are local. To find possible official sources for a company mark:

```bash
npm run logos:suggest -- "Company name" company.example
```

This prints discovery links only. It does not download or add a logo.

## Develop the starter

If you are changing Ask Resume itself rather than creating your personal CV, follow [CONTRIBUTING.md](CONTRIBUTING.md). The contributor workflow contains formatting, type checking, unit tests, coverage, Playwright, and release validation; none of those gates are part of the personal CV workflow above.

The product and resume principles are documented in [docs/resume-principles.md](docs/resume-principles.md). Security reports belong in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Rodrigo Uroz
