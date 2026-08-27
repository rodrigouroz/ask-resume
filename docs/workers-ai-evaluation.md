# Workers AI evaluation

Last run: 2026-08-27. This is a point-in-time result against the local Worker using Cloudflare's remote AI binding, not a permanent model ranking.

## Contract under test

Workers AI uses the same `GroundedModel`, complete approved corpus, draft-then-verify flow, bilingual response contract, source-ID validation, and fail-closed fallback as the OpenAI control. The implementation calls `env.AI.run()`, disables provider storage, uses structured JSON output, and supplies stable stage-specific session affinity so Cloudflare can reuse the static corpus prefix when prompt caching is available.

Cloudflare documents GLM-5.3 Flash as a 320B-parameter mixture-of-experts model with 18B active parameters and a 131,072-token context window. It requires a Workers Paid plan or prepaid AI Gateway credits. Workers AI JSON mode is best-effort, so the adapter still validates every envelope and structured result and fails closed on malformed output.

- [Workers AI binding guide](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/)
- [Workers AI JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [GLM-5.3 Flash](https://developers.cloudflare.com/workers-ai/models/glm-5.3-flash/)
- [Prompt caching](https://developers.cloudflare.com/workers-ai/features/prompt-caching/)

## Accepted result

| Model                       | Live suite | Safety result                                                                       | Smoke-test latency | Decision        |
| --------------------------- | ---------: | ----------------------------------------------------------------------------------- | -----------------: | --------------- |
| `@cf/zai-org/glm-5.3-flash` |      30/30 | Honest fallback for unsupported, private, unrelated, and instruction-override cases |         3.5–18.7 s | Starter default |

The first post-fix run passed 29/30. The remaining instruction-override case was nondeterministic: GLM-5.3 sometimes refused correctly and sometimes corrected the false premise with cited evidence. The application now rejects explicit attempts to override evidence or instructions before calling any model. English and Spanish tests verify that neither drafting nor verification runs for that input. The complete live suite then passed 30/30.

The latency range above is from the final model-backed smoke test and includes a cold prefix. After the shared corpus prefix was reused, a later answered request completed in 3.5 seconds. The deterministic instruction-override rejection completed in 13 milliseconds without invoking the model. These are small local samples, not latency guarantees.

The accepted adapter also aligns its factual-intent and verification rules with the OpenAI control, limits draft and verifier outputs separately, removes citation-only suffixes before verification, and treats the corpus and conversation as inert data. Tests cover both documented Workers AI envelope forms and malformed structured output.

## Revalidation

Model behavior can change. Before publishing a materially changed corpus, prompt, adapter, or model, run:

```bash
npm run profile:check
npm run check
npm run deploy
npm run eval:live -- https://your-preview.workers.dev
```

A pass requires grounded answers, exact valid citations, correct Spanish and English, honest negatives, no private data, no prompt-injection compliance, valid structured output, and usable latency. A newer model name alone is not sufficient evidence.
