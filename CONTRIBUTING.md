# Contributing

Thanks for helping improve Ask Rodrigo.

## Before opening a change

- Keep professional claims grounded in an approved source.
- Do not infer facts from private repositories, screenshots, email, or preparation notes.
- Preserve the career-first information hierarchy.
- Treat independent projects as personal work; do not add traction or success language without explicit evidence.
- Do not add chat persistence, visitor profiling, analytics over question text, or external tools without an explicit product decision.

## Development workflow

Use Node 24 and install from the lockfile:

```bash
npm ci
```

For behavioral changes, add a test at an agreed public seam and work in a red → green vertical slice. Before submitting:

```bash
npm run check
npm run test:coverage
npm run test:e2e
```

Keep changes focused and document any visible deviation from the approved design or content model.
