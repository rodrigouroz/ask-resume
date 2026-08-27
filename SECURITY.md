# Security policy

## Reporting a vulnerability

Please do not open a public issue for a vulnerability or disclose visitor data, credentials, prompts, or exploit details publicly.

Until a dedicated security address is configured, contact the repository owner privately and include only the minimum information needed to reproduce the issue safely.

## Scope

Security reports may cover the public application, corpus boundary, model prompt-injection defenses, citation validation, abuse controls, or accidental disclosure of non-public corpus data.

The application must never require access to the profile owner's private repositories at runtime. Secrets and private source material do not belong in this repository. The active `profile/` is ignored by Git, but ignore rules are not encryption and do not remove data from earlier commits.
