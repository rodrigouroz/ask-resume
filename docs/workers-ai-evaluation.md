# Workers AI evaluation

Last run: 2026-08-27. This is a point-in-time result against the local Worker using Cloudflare's remote AI binding, not a permanent model ranking.

## Contract under test

Workers AI uses the same `GroundedModel`, complete approved corpus, draft-then-verify flow, bilingual response contract, source-ID validation, and fail-closed fallback as the OpenAI control. The implementation calls `env.AI.run()`, disables provider storage, uses structured JSON output, and supplies stable stage-specific session affinity so Cloudflare can reuse the static corpus prefix when prompt caching is available.

Cloudflare makes Workers AI available on both Free and Paid Workers plans. The Free plan includes 10,000 neurons per account per day and cannot buy overage without upgrading. GLM-5.3 requires Workers Paid or prepaid AI Gateway credits, while GLM-4.7, Gemma 4, GPT-OSS 120B, and Qwen3 30B are eligible for the free allocation. Workers AI JSON mode is best-effort, so the adapter still validates every envelope and structured result and fails closed on malformed output.

- [Workers AI binding guide](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/)
- [Workers AI JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Workers AI pricing and free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [GLM-4.7 Flash](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)
- [Gemma 4 26B A4B](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/)
- [GLM-5.3 Flash](https://developers.cloudflare.com/workers-ai/models/glm-5.3-flash/)
- [Prompt caching](https://developers.cloudflare.com/workers-ai/features/prompt-caching/)

## Accepted result

| Model                           | Plan eligibility | Evaluation | Result                                                                                         | Decision                  |
| ------------------------------- | ---------------- | ---------: | ---------------------------------------------------------------------------------------------- | ------------------------- |
| `@cf/zai-org/glm-4.7-flash`     | Free allocation  |      30/30 | Passed bilingual grounding, exact citations, honest negatives, privacy, and injection handling | Starter default           |
| `@cf/google/gemma-4-26b-a4b-it` | Free allocation  |  4/4 smoke | Passed representative English, Spanish, grounding, and unsupported cases                       | Free runner-up            |
| `@cf/openai/gpt-oss-120b`       | Free allocation  |  2/4 smoke | One grounded answer passed; two supported cases hit provider errors and fell back              | Rejected for this starter |
| `@cf/qwen/qwen3-30b-a3b-fp8`    | Free allocation  |  1/4 smoke | Returned reasoning without usable structured content for the three supported cases             | Rejected for this starter |
| `@cf/zai-org/glm-5.3-flash`     | Paid or prepaid  |      30/30 | Passed the same full acceptance contract                                                       | Optional paid preset      |

GLM-4.7 initially completed 26/30. In all four failures, the draft was grounded and cited correctly, but the verifier incorrectly treated product names and technical terms inside Spanish prose as a language mismatch. The shared verification rule now evaluates the language of the prose while allowing names, URLs, job titles, identifiers, and technical terms to retain their original form. The subsequent acceptance run passed 30/30.

Reasoning is disabled through `chat_template_kwargs.enable_thinking` for this bounded factual task. Without that setting, GLM-4.7 consumed its output allowance on reasoning and returned no structured answer. Disabling unnecessary reasoning reduced representative successful requests to 1.3–4.4 seconds, although later probes observed provider-side spikes up to 28.3 seconds. These are small local samples, not latency guarantees.

One measured grounded answer used 7,118 draft input tokens, 91 draft output tokens, 451 verifier input tokens, and 20 verifier output tokens. At Cloudflare's published GLM-4.7 neuron rates, that is approximately 45.7 neurons, or a theoretical 219 similar answered questions per 10,000-neuron daily allocation. The starter uses a conservative 200-question daily limit. The Worker logs only aggregate token counts and the model name—never questions, answers, safety IDs, IP addresses, or visitor identifiers.

The earlier GLM-5.3 post-fix run passed 29/30. The remaining instruction-override case was nondeterministic: GLM-5.3 sometimes refused correctly and sometimes corrected the false premise with cited evidence. The application now rejects explicit attempts to override evidence or instructions before calling any model. English and Spanish tests verify that neither drafting nor verification runs for that input. The complete live suite then passed 30/30.

In the earlier GLM-5.3 evaluation, the model-backed smoke test ranged from 3.5 to 18.7 seconds and included a cold prefix. The deterministic instruction-override rejection completed in 13 milliseconds without invoking the model.

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
