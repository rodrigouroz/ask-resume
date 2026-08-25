# Ask Rodrigo

Ask Rodrigo is Rodrigo Uroz's public, interactive résumé. The résumé is useful on its own; the assistant adds a cited conversational path through the same professional evidence.

The project is also intended to be a public example of a grounded AI product: curated sources, explicit citations, no inference when evidence is missing, and a clear boundary between professional experience and independent personal projects.

## Current status

The responsive résumé and assistant interaction are implemented. The assistant currently uses a small deterministic answer policy for interface development and guardrail tests. Model-backed retrieval, the public corpus, Cloudflare Vectorize, abuse controls, and production email/domain configuration are separate upcoming slices.

## Product principles

- Professional experience is the primary narrative.
- Independent projects are presented as personal products, without invented traction or success claims.
- Every supported answer names a visible source.
- Unsupported questions receive an honest fallback and a direct contact option.
- The site stores the explicit language preference only. The current frontend does not persist chat content.
- English is the default; Spanish is available throughout the résumé and assistant.

## Stack

- React 19 + Vite 8
- TypeScript 7 native compiler with strict settings
- Oxfmt
- Oxlint + `oxlint-tsgolint` type-aware checks
- Fallow changed-code audit in the pre-commit hook
- Vitest + Testing Library
- Playwright desktop/mobile end-to-end tests

Node 24 is the supported runtime. Use the version in `.node-version` or `.nvmrc`.

## Development

```bash
npm ci
npm run dev
```

## Quality gates

```bash
npm run check
npm run test:coverage
npx playwright install chromium
npm run test:e2e
```

`npm run check` verifies formatting, type-aware lint, TypeScript, Vitest, and the production build. CI runs those gates and Playwright independently.

Install the repository's Fallow-managed pre-commit gate once per clone:

```bash
npm install --global fallow
fallow hooks install --target git --branch main
```

The hook audits the pending changes for newly introduced dead code, complexity, and duplication before Git creates a commit.

## Project structure

```text
src/content.ts                 Approved résumé content
src/lib/answerQuestion.ts      Current grounded demo policy
src/components/                Accessible presentation and interactions
src/*.test.tsx                 Public UI behavior tests
e2e/                           Desktop and mobile product flows
```

## What is deliberately not here yet

- Production model credentials or secrets
- Private repository access
- Visitor chat persistence or feedback collection
- Unapproved preparation notes or private CV source files
- Claims inferred from source code or private data

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change and [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

[MIT](LICENSE) © Rodrigo Uroz
