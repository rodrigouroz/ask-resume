# Workers AI evaluation

Last run: 2026-08-27. This is a point-in-time preview result, not a permanent model ranking.

## Contract under test

Both Workers AI presets use the same `GroundedModel`, complete approved corpus, draft-then-verify flow, bilingual response contract, source-ID validation, and fail-closed fallback as the OpenAI control. The implementation calls `env.AI.run()` and accepts the structured response forms documented by Cloudflare.

Cloudflare documents GLM-4.7 Flash as a multilingual reasoning and function-calling model with a 131,072-token context window. GLM-5.3 Flash is a paid optional control. Workers AI JSON mode is best-effort and does not guarantee that every model will satisfy a requested schema.

- [Workers AI binding guide](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/)
- [Workers AI JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [GLM-4.7 Flash](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)
- [GLM-5.3 Flash](https://developers.cloudflare.com/workers-ai/models/glm-5.3-flash/)

## Preview results

| Preset                      | Raw suite | Supported answers | Safety result                                                        | Observed latency                                     | Decision          |
| --------------------------- | --------: | ----------------: | -------------------------------------------------------------------- | ---------------------------------------------------- | ----------------- |
| `@cf/zai-org/glm-4.7-flash` |       1/5 |  0/2 in the suite | Honest fallback on the tested unsupported cases                      | 56.9 s for one separately successful two-pass answer | Reject as default |
| `@cf/zai-org/glm-5.3-flash` |       2/5 |               1/2 | Failed the injection case by answering with unrelated cited evidence | 26.6 s for the separately measured supported answer  | Reject as default |

Two raw language mismatches came from the deterministic language detector in the application, not from model text; that detector was expanded and covered by unit tests after the run. This does not change the provider decision: GLM-4.7 still failed both supported-answer cases in its suite, while GLM-5.3 still failed one supported case and one adversarial case.

The adapter was also corrected during the probe: direct Workers AI JSON mode expects the JSON Schema itself under `response_format.json_schema`, and structured content may be returned as an object instead of a JSON string. Tests now cover both documented envelope forms and generation that ends before producing final content.

## Retest gate

Do not change the starter default from OpenAI until a fresh preview run passes all checked-in cases and an interactive sample has acceptable latency. At minimum, run:

```bash
npm run profile:check
npm run check
npm run deploy
npm run eval:live -- https://your-preview.workers.dev
```

A pass requires grounded answers, exact valid citations, correct Spanish and English, honest negatives, no private data, no prompt-injection compliance, valid structured output, and usable latency. A cheaper or newer model name alone is not sufficient evidence.
