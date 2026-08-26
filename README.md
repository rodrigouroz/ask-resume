# Ask Rodrigo

Ask Rodrigo is Rodrigo Uroz's public, interactive résumé. The résumé is useful on its own; the assistant adds a cited conversational path through the same professional evidence.

The project is also a public example of a grounded AI product: curated sources, explicit citations, no inference when evidence is missing, and a clear boundary between professional experience and independent personal projects.

## Current status

The responsive résumé and genuinely bilingual assistant are implemented end to end. A Cloudflare Worker gives GPT-5.6 Terra one canonical English corpus, then GPT-5.6 Sol checks the draft against only its cited sources before the response reaches the UI. A print-tested PDF résumé is generated from the same public presentation.

## Product principles

- Professional experience is the primary narrative.
- Independent projects are presented as personal products, without invented traction or success claims.
- Every supported answer cites stable `sourceId` and `sectionId` values that do not depend on visible labels or language.
- Unsupported questions receive an honest fallback and a direct contact option.
- The site stores the explicit UI language preference only. Conversation context remains in memory for the current tab, model requests use `store: false`, and the application does not persist chat content.
- UI language, detected question language, and canonical corpus language remain separate.

## Stack

- React 19 + Vite 8
- Cloudflare Workers + Durable Objects + Analytics Engine + rate-limit binding
- OpenAI Responses API + GPT-5.6 Terra and Sol structured outputs
- Zod request and response contracts
- TypeScript 7 native compiler with strict settings
- Oxfmt
- Oxlint + `oxlint-tsgolint` type-aware checks
- Fallow changed-code audit in the pre-commit hook
- Vitest + Testing Library
- Playwright desktop/mobile end-to-end tests

Node 26 is the supported runtime. Use the version in `.node-version` or `.nvmrc`.

## Development

```bash
npm ci
npm run dev
```

For local model calls, create an uncommitted `.dev.vars` file containing `OPENAI_API_KEY`. In production, configure it with `wrangler secret put OPENAI_API_KEY`; never store the value in Git.

### Privacy-safe analytics

Cloudflare Web Analytics measures aggregate visits and page performance. The application also writes three anonymous product events to the `ask_rodrigo_funnel` Analytics Engine dataset:

- `chat_opened`: the visitor intentionally opens or first engages with the assistant, at most once per page load.
- `question_submitted`: a valid question reaches the Worker after request validation and rate limiting.
- `answer_succeeded`: the assistant returns a grounded `answered` response.

Events contain only the event name and a numeric count. They never include question text, answers, the safety ID, IP addresses, or another visitor identifier. Query aggregate totals with:

```sql
SELECT
  blob1 AS event,
  SUM(_sample_interval * double1) AS total
FROM ask_rodrigo_funnel
WHERE timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY event
ORDER BY event
```

## Assistant architecture

Each request follows a narrow, auditable path:

1. The UI sends the question, selected UI language, up to six in-memory conversation turns, and a non-identifying session safety ID.
2. Language resolution uses the question when it is clearly Spanish or English and the UI language only when the question is mixed or ambiguous.
3. Alfred's always-on policy prevents impersonation, private-data claims, outside knowledge, and unsupported inference.
4. GPT-5.6 Terra receives the complete current corpus before the dynamic question and conversation context, allowing the stable prefix to benefit from OpenAI's prompt cache. It returns an answer and the source IDs that directly support it, or an empty result when the corpus is insufficient.
5. Empty results use the deterministic contact fallback without another model call. Otherwise, GPT-5.6 Sol checks the draft against only the cited sources and rejects it unless every factual claim is supported and the response language is correct.
6. The API returns a structured `answered` or `unknown` response with stable citations. Unknown, unsafe, exhausted-budget, and internal-error paths all use the localized contact fallback.

The corpus is intentionally stored once in canonical English. The model may translate an answer, but translated copies are never persisted as competing sources of truth.

## Corpus approval

Public evidence lives in `src/assistant/corpus.ts`. Being in that runtime corpus is the approval boundary: every fact has a stable `factId` and its own review date. Time-sensitive facts also have an expiration date and disappear from the model context after it passes; editing another fact does not renew them. Every source has stable `sourceId` and `sectionId` identifiers. Visible citation labels live separately in `src/assistant/sources.ts` and may be translated without changing navigation.

To change a professional claim:

1. Get Rodrigo's explicit approval for the exact fact.
2. Add or update the canonical English fact without renaming an existing ID merely for wording or localization.
3. Set or update that fact's own review date. Give current employment, availability, visas, current tools, and live URLs a proportionate expiration date.
4. Add or update a live evaluation case when the change affects model behavior.
5. Run the quality gates below and inspect the visible citation target.

Preparation notes, private repositories, email, and unapproved CV material are not runtime evidence.

## PDF résumé

Regenerate the downloadable résumé from the built site with:

```bash
npm run cv:pdf
```

This writes `public/rodrigo-uroz-cv.pdf`. Review all rendered pages before committing it; a successful browser print alone is not a visual-layout check.

## Quality gates

```bash
npm run check
npm run test:coverage
npx playwright install chromium
npm run test:e2e
npm run eval:live -- https://rodrigouroz.com
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
src/content.ts                  Localized résumé presentation
src/assistant/corpus.ts         Canonical approved public evidence
src/assistant/                  Corpus, language, model, eval, and citation contracts
src/components/chat/            Chat focus, transcript, and composer modules
worker/index.ts                 Same-origin /api/ask boundary and abuse controls
worker/dailyBudget.ts           Exact UTC-day assistant-request budget
worker/productAnalytics.ts      Anonymous Analytics Engine funnel events
scripts/                        Live evals, quality audit, and PDF generation
src/components/                 Accessible presentation and interactions
e2e/                            Desktop and mobile product flows
```

The assistant has no repository, browser, email, filesystem, network, or external tool access. Abuse controls include strict request schemas, per-IP rate limiting, a global daily Durable Object budget, input/output moderation, bounded token and history sizes, `store: false`, a restrictive Content Security Policy, and honest failure behavior.

Turnstile is deliberately deferred until traffic produces a concrete suspicious-client signal. The current public baseline avoids visitor friction while retaining rate limits and an exact global cost ceiling.

## Deliberate boundaries

- Private repository access
- Visitor chat persistence or feedback collection
- Unapproved preparation notes or private CV source files
- Claims inferred from source code or private data
- Analytics over visitor question text

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change and [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

[MIT](LICENSE) © Rodrigo Uroz
