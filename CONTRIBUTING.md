# Contributing

Thanks for helping improve Ask Rodrigo.

## Before opening a change

- Keep professional claims grounded in an approved source.
- Add approved evidence once, in canonical English, with stable `factId`, `sourceId`, and `sectionId` values. Localize visible source labels separately.
- Do not infer facts from private repositories, screenshots, email, or preparation notes.
- Preserve the career-first information hierarchy.
- Treat independent projects as personal work; do not add traction or success language without explicit evidence.
- Do not add chat persistence, visitor profiling, analytics over question text, or external tools without an explicit product decision.

## Development workflow

Use Node 26 and install from the lockfile:

```bash
npm ci
```

Install the Fallow-managed pre-commit hook once per clone:

```bash
npm install --global fallow
fallow hooks install --target git --branch main
```

The hook uses Fallow's `new-only` audit gate, so existing findings do not block an unrelated commit. Do not bypass it with `--no-verify` unless the reason is documented in the pull request.

For behavioral changes, add a test at an agreed public seam and work in a red → green vertical slice. Before submitting:

```bash
npm run check
npm run test:coverage
npm run test:e2e
```

Keep changes focused and document any visible deviation from the approved design or content model.

## Corpus changes

The corpus is a public trust boundary, not a convenient place for plausible biography. A new fact must be explicitly approved by Rodrigo and must include its own stable ID, approval state, and review date. Do not promote preparation notes or implementation details discovered in a repository into approved evidence.

When a fact changes, update deterministic retrieval coverage in `src/assistant/evals/retrieval.json`. When the change affects model behavior or safety, also update `src/assistant/evals/live.json` and run the live suite against the intended environment. Equivalent Spanish and English questions should retrieve the same stable evidence IDs.
