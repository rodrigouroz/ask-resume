import type { CanonicalEvidence, CanonicalFact, IsoDate, SectionId } from "./contracts";
import { currentCorpus, validateCorpus } from "./corpusValidation.js";

function source(
  sourceId: string,
  sectionId: SectionId,
  title: string,
  facts: readonly CanonicalFact[],
): CanonicalEvidence {
  return { sourceId, sectionId, title, facts };
}

const assistantCorpus: readonly CanonicalEvidence[] = [
  source("assistant-identity", "about", "Ask Rodrigo · Assistant identity and boundaries", [
    {
      factId: "assistant-identity-name",
      text: "Rodrigo's public assistant is named Alfred.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "assistant-identity-not-rodrigo",
      text: "Alfred is Rodrigo Uroz's professional assistant, not Rodrigo himself.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "assistant-identity-public-only",
      text: "Alfred answers from Rodrigo's approved public corpus and has no access to private repositories or private information.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "assistant-identity-fallback",
      text: "If the public corpus does not support an answer, Alfred directs the visitor to Rodrigo instead of guessing.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("career-overview", "experience", "Professional experience overview", [
    {
      factId: "career-years",
      text: "Rodrigo has built software professionally since 2000, giving him more than 25 years of experience by 2026.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "career-positioning",
      text: "Rodrigo is a software and product engineer who turns ambiguous problems into working products and the systems needed to run them.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "career-end-to-end",
      text: "He moves between product definition, domain modeling, architecture, hands-on implementation, validation, and technical leadership.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "career-scale-and-zero-to-one",
      text: "Rodrigo's experience spans large-scale products, legacy modernization, engineering leadership, and new products built from zero as a hands-on engineer.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "career-millions-scale",
      text: "Rodrigo has worked on products used by millions of people, including systems at Medallia, ClassDojo, and Bumeran.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "career-companies",
      text: "His public career history includes ClassDojo, SCVSoft, Medallia, FutureAdvisor through SCVSoft, VSKO, DLA TV, OpenEnglish through TeraCode, Bumeran, Globant, and Claxson.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "career-roles",
      text: "His roles have ranged from individual contributor and technical lead to engineering manager, Head of Development, and Project Manager.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "career-openness",
      text: "As of August 25, 2026, Rodrigo is open to roles and collaborations that combine product judgment with hands-on engineering, especially around ambiguous requirements, complex domains, or difficult integrations; he is not focused on one industry.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
  ]),
  source("classdojo-current-role", "experience", "ClassDojo · Experience", [
    {
      factId: "classdojo-role-period",
      text: "Rodrigo joined ClassDojo on January 1, 2022 as a Fullstack Software Engineer.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "classdojo-current-employment",
      text: "As of August 25, 2026, ClassDojo is Rodrigo's current employer.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
    {
      factId: "classdojo-cloud",
      text: "His ClassDojo work includes production systems on AWS and Kubernetes.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("classdojo-platform-modernization", "experience", "ClassDojo · Platform modernization", [
    {
      factId: "classdojo-typescript",
      text: "Rodrigo helped migrate ClassDojo's web monorepo to TypeScript incrementally so product work could continue while type coverage and shared contracts improved.",
      reviewedAt: "2026-08-26",
    },
    {
      factId: "classdojo-platform-developer-productivity",
      text: "His platform work included API type utilities, migration tracking, type checking, and CI and deployment workflow improvements.",
      reviewedAt: "2026-08-26",
    },
    {
      factId: "classdojo-platform-reliability",
      text: "He also worked on reliability and observability for real-time product behavior rather than treating modernization as a type-only effort.",
      reviewedAt: "2026-08-26",
    },
  ]),
  source("classdojo-tutor-product", "experience", "ClassDojo · Tutor product", [
    {
      factId: "classdojo-external-product",
      text: "Rodrigo helped integrate an externally developed tutoring product into ClassDojo's architecture and operating environment.",
      reviewedAt: "2026-08-26",
    },
    {
      factId: "classdojo-tutor-fullstack",
      text: "He worked across the Tutor backend, customer-facing web experience, and administrative tools instead of owning only one application layer.",
      reviewedAt: "2026-08-26",
    },
    {
      factId: "classdojo-tutor-scheduling",
      text: "His Tutor work included tutor availability, scheduling, sessions, time-zone behavior, and attendance flows.",
      reviewedAt: "2026-08-26",
    },
    {
      factId: "classdojo-zoom",
      text: "The Tutor integration connected scheduled classes to Zoom.",
      reviewedAt: "2026-08-26",
    },
    {
      factId: "classdojo-tutor-commercial-flows",
      text: "He contributed to subscription, payment, pricing, trial, and product-experiment flows around Tutor.",
      reviewedAt: "2026-08-26",
    },
    {
      factId: "classdojo-tutor-operability",
      text: "He also worked on notifications, analytics events, automated tests, staging support, and operational fixes needed to run Tutor as part of ClassDojo.",
      reviewedAt: "2026-08-26",
    },
  ]),
  source(
    "classdojo-district-solutions",
    "experience",
    "ClassDojo · District communications and insights",
    [
      {
        factId: "classdojo-district-focus",
        text: "Rodrigo's District Solutions work covers communication, announcement, and insight products at both district and school scope.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-audience-modeling",
        text: "He has worked on recipient and audience modeling across ClassDojo accounts, classes, schools, districts, distribution lists, and roster or SIS data.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-multichannel-communications",
        text: "His communications work includes email, SMS, voice, and in-product delivery concerns, including recipient resolution and delivery-state behavior.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-communications-operability",
        text: "He has worked on recipient exports, failure states, queue behavior, monitoring, and operational diagnostics for communication workflows.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-insights-composition",
        text: "For School Insights, Rodrigo worked on composing product-level communication facts from messaging, stories, calendar, school, and rostering domains while keeping ownership boundaries explicit.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-insights-data-semantics",
        text: "He treats true zeroes, unavailable metrics, account status, and roster-source differences as explicit product, API, sorting, and presentation semantics.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-district-end-to-end",
        text: "This work has crossed backend services, frontend experiences, exports, automated tests, performance analysis, staged rollout, and production validation.",
        reviewedAt: "2026-08-26",
      },
    ],
  ),
  source(
    "classdojo-ai-engineering",
    "experience",
    "ClassDojo · AI product and developer workflows",
    [
      {
        factId: "classdojo-llms",
        text: "Rodrigo contributed to ClassDojo's early LLM product features and to later AI-assisted product and developer workflows.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-langfuse",
        text: "His LLM work at ClassDojo has included prompt management, tracing, and evaluation with Langfuse.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-bounded-ai",
        text: "His applied-AI work keeps model behavior behind explicit context, structured contracts, validation, observable traces, and tested failure paths.",
        reviewedAt: "2026-08-26",
      },
      {
        factId: "classdojo-orchestrators",
        text: "Rodrigo evaluates LLMs and orchestration tools as their capabilities change.",
        reviewedAt: "2026-08-25",
      },
      {
        factId: "classdojo-orchestrators-current",
        text: "As of August 25, 2026, Rodrigo uses Conductor in this work.",
        reviewedAt: "2026-08-25",
        expiresAt: "2026-11-25",
      },
      {
        factId: "classdojo-skills-dx",
        text: "Rodrigo works with ClassDojo's in-house agent skills and coding-agent workflows, evaluating tools by whether they improve developer experience and verified delivery.",
        reviewedAt: "2026-08-26",
        expiresAt: "2026-11-26",
      },
    ],
  ),
  source("scvsoft-iot-tech-lead", "experience", "SCVSoft · Experience", [
    {
      factId: "scvsoft-period-role",
      text: "Rodrigo worked at SCVSoft from July through December 2021 as a Tech Lead.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "scvsoft-client",
      text: "Through SCVSoft, he worked for an unnamed B2B IoT client serving hotels and commercial buildings.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "scvsoft-aggregator",
      text: "The service hid provider and device differences behind one interface.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "scvsoft-reverse-engineering",
      text: "Rodrigo reverse-engineered devices whose APIs were incomplete or difficult to interpret.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("medallia-engineering-management", "experience", "Medallia · Experience", [
    {
      factId: "medallia-period-role",
      text: "Rodrigo worked at Medallia from December 2018 through July 2021 as a Senior Engineering Manager.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "medallia-team",
      text: "He managed a frontend team of about ten people across three cities.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "medallia-modernization",
      text: "His team rebuilt seven legacy Angular applications with React and Redux.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "medallia-graphql",
      text: "The modernization moved client integration from REST toward GraphQL.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "medallia-scale",
      text: "Thousands of Medallia customers used the products maintained by his team.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("futureadvisor-lead-engineer", "experience", "FutureAdvisor / SCVSoft · Experience", [
    {
      factId: "futureadvisor-period-role",
      text: "Rodrigo worked on FutureAdvisor through SCVSoft from September 2016 through December 2018 as a Lead Software Engineer.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "futureadvisor-team",
      text: "He led a six-engineer team.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "futureadvisor-stack",
      text: "FutureAdvisor used Rails and PostgreSQL on the backend and React with Redux on the frontend.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "futureadvisor-services",
      text: "His team moved selected workloads out of a monolith into AWS services such as SQS, SNS, Batch, and Lambda.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "futureadvisor-outcome",
      text: "The team cut a daily processing workflow from about three hours to about fifty minutes and reduced its cost by roughly half.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("vsko-education-software", "experience", "Lemonade / VSKO · Experience", [
    {
      factId: "vsko-period-role",
      text: "Rodrigo worked on VSKO through Lemonade from 2013 to 2016 as a Software Engineer.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "vsko-product",
      text: "He built classroom and administration software for Catholic schools in Belgium.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "vsko-stack",
      text: "The product combined Java and Jersey services, Google APIs, SQL databases, Node.js, and AngularJS.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "vsko-english",
      text: "Rodrigo communicated with the Belgian client in English.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("dla-team-and-qa", "experience", "DLA TV · Experience", [
    {
      factId: "dla-period-role",
      text: "Rodrigo worked at DLA TV from 2012 to 2013 as Head of Development.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "dla-qa",
      text: "He established DLA TV's first QA team.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "dla-growth",
      text: "He expanded the development team and took responsibility for hiring, training, and delivery practices.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("openenglish-engagement", "experience", "TeraCode / OpenEnglish · Experience", [
    {
      factId: "openenglish-period",
      text: "Rodrigo worked on OpenEnglish through TeraCode from 2009 to 2012; OpenEnglish was a client, not his employer.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "openenglish-progression",
      text: "He began as an individual contributor, later became Project Manager, and grew TeraCode's OpenEnglish engagement to roughly thirty people.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("bumeran-search", "experience", "Bumeran · Experience", [
    {
      factId: "bumeran-period-role",
      text: "Rodrigo worked at Bumeran from 2007 to 2009 as a Software Engineer.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "bumeran-stack-search",
      text: "He worked on Bumeran's PHP backend and built a Java and Solr search engine for candidate résumés.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("globant-functional-analysis", "experience", "Globant · Experience", [
    {
      factId: "globant-period-role",
      text: "Rodrigo worked at Globant from 2006 to 2007 as a Functional Analyst.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "globant-marketplace",
      text: "He led functional analysis for a marketplace refactor.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("mixplay-streaming", "experience", "Claxson / Mixplay · Experience", [
    {
      factId: "mixplay-period-role",
      text: "Rodrigo worked at Claxson on Mixplay from 2003 to 2006 as a Senior Developer.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "mixplay-platform",
      text: "Rodrigo built the Mixplay streaming platform with PHP, Oracle, and C#, including DRM and content encryption.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("product-engineering-capability", "capabilities", "Product engineering · Capabilities", [
    {
      factId: "product-zero-to-one",
      text: "Rodrigo has repeatedly taken unclear product and domain problems from an initial idea to working software.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "product-operation",
      text: "He can define a product, model its domain, design the architecture, write the software, validate it, and help operate it.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "product-project-examples",
      text: "Rodrigo independently designed and built Coro, Traza, Daturno, Ballast, and Jacara.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "product-ambiguity-method",
      text: "When requirements are ambiguous, Rodrigo first tries to reduce the ambiguity with an appropriate requirements-elicitation technique; sometimes the best way forward is to build a rapid prototype and iterate.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source(
    "systems-boundary-capability",
    "capabilities",
    "Provider-independent systems · Capabilities",
    [
      {
        factId: "systems-provider-independent-models",
        text: "Across IoT, finance, scheduling, conversational systems, and family games, Rodrigo designs domain models that keep providers and device capabilities behind explicit contracts.",
        reviewedAt: "2026-08-25",
      },
      {
        factId: "systems-messy-inputs",
        text: "His projects repeatedly address cases where user language, provider data, and operational rules do not map cleanly to one another.",
        reviewedAt: "2026-08-25",
      },
      {
        factId: "systems-domain-boundary-criterion",
        text: "Rodrigo gives a concept its own domain-model boundary when it is a clear, self-contained, first-class term that appears repeatedly in the requirements.",
        reviewedAt: "2026-08-25",
      },
    ],
  ),
  source("ai-engineering-principles", "capabilities", "AI engineering · Working principles", [
    {
      factId: "ai-deterministic-core",
      text: "Rodrigo keeps product-critical behavior deterministic and uses language models for bounded tasks where ambiguity cannot be removed with rules alone.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ai-replaceable-models",
      text: "He treats models and model infrastructure as replaceable implementation choices rather than as the product's center.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ai-operational-guardrails",
      text: "In AI-assisted systems, Rodrigo designs explicit fallbacks, observable decisions, and privacy boundaries around probabilistic behavior.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("openclaw-contributions", "capabilities", "OpenClaw · Open-source contributions", [
    {
      factId: "openclaw-memory-ranking",
      text: "Rodrigo contributed multiple merged changes to OpenClaw's memory system, implementing MMR re-ranking and temporal decay for hybrid search.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "openclaw-compaction-memory",
      text: "Rodrigo also strengthened OpenClaw's compaction safeguards and post-compaction transcript and memory synchronization.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("leadership-capability", "capabilities", "Leadership · Capabilities", [
    {
      factId: "leadership-build",
      text: "Rodrigo has built new teams and functions, including establishing DLA TV's first QA team.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "leadership-scale",
      text: "He has led a six-engineer team, managed about ten people across three cities, and grown a client engagement to roughly thirty people.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "leadership-people",
      text: "His leadership work includes hiring, training, mentoring, and defining delivery practices.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "leadership-progression",
      text: "He has moved between hands-on engineering, technical leadership, people management, and project leadership.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "leadership-work-serves-life",
      text: "A leadership lesson that changed how Rodrigo manages people is that people work to live; they do not live to work.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("technical-capabilities", "capabilities", "Technical capabilities", [
    {
      factId: "technical-fullstack",
      text: "Rodrigo has built frontend and backend systems with TypeScript, React, Node.js, PHP, Java, C#, and Rails.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "technical-data",
      text: "He has worked with PostgreSQL, MySQL, Oracle, and Cloudflare D1.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "technical-architecture",
      text: "His architecture work includes legacy modernization, selective monolith decomposition, REST and GraphQL APIs, real-time coordination, and event-driven processing.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "technical-cloud",
      text: "He has operated software on AWS and Kubernetes and built independent products with Cloudflare Workers, Durable Objects, and D1.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "technical-ai",
      text: "His LLM work spans product features, evaluation with Langfuse, model and orchestrator selection, realtime and multimodal APIs, coding agents, and custom skills.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "technical-ai-native",
      text: "Rodrigo uses LLMs, coding agents, and custom skills to accelerate work, while keeping product, architecture, and quality decisions his responsibility.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "technical-integrations",
      text: "He has integrated third-party providers, IoT devices, incomplete APIs, and on-chain financial activity.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "technical-validation",
      text: "Rodrigo reduces uncertainty with the smallest credible experiment: a synthetic scenario, benchmark, throwaway probe, or test in the real device and environment where the product will run.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("international-work-profile", "capabilities", "International work profile", [
    {
      factId: "international-location-languages",
      text: "Spanish is Rodrigo's native language, and he works professionally in English.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "international-current-location",
      text: "As of August 25, 2026, Rodrigo is based in Buenos Aires, Argentina.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
    {
      factId: "international-clients",
      text: "Rodrigo has worked with United States clients for at least ten years and with a Belgian client in English.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "international-visa",
      text: "As of August 25, 2026, Rodrigo holds a valid United States B1/B2 visa for permitted business travel; it is not work authorization.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
    {
      factId: "international-flexibility",
      text: "As of August 25, 2026, Rodrigo is willing to discuss business travel, relocation, work authorization, or sponsorship with a prospective company.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
  ]),
  source("coro-product", "projects", "Coro · Independent project", [
    {
      factId: "coro-purpose",
      text: "Coro explores whether relevant conversations can form around people across languages without rooms, channels, topics, or follower graphs.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "coro-routing",
      text: "Coro uses personalized, explainable semantic routing; translation is a separate representation layer rather than part of routing.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "coro-context",
      text: "Coro deterministically backfills the context needed for replies, quotes, and mentions.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "coro-features",
      text: "The product supports progressive identity, real-time conversation, moderation, Web Push, and private history.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "coro-stack",
      text: "Coro uses React and Vite, Hono on Cloudflare Workers, Durable Objects for real-time coordination, D1 for persistence, and model adapters through an AI Gateway.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "coro-architecture",
      text: "Coro separates contracts, domain logic, application code, and simulation infrastructure.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "coro-simulation-lab",
      text: "Its simulation lab runs the production routing logic against synthetic scenarios.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "coro-ownership",
      text: "Rodrigo founded Coro and is its only builder.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "coro-url",
      text: "As of August 25, 2026, Coro is available at https://coro.world.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
  ]),
  source("traza-product", "projects", "Traza · Independent project", [
    {
      factId: "traza-purpose",
      text: "Traza organizes fragmented financial activity into a traceable history of income, expenses, transfers, and investments.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-motivation",
      text: "Rodrigo built Traza because transaction lists do not explain how money moved; the product keeps evidence, uncertainty, and review history visible.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-domain",
      text: "Traza uses a provider-independent canonical financial domain model, with transaction intent, entity, and category represented separately.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-wallbit-sync",
      text: "Traza's Wallbit connector is read-only and preserves synchronization history.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-enrichment",
      text: "Traza runs deterministic, public-data, and model-backed enrichment behind an explicit privacy boundary.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-corrections",
      text: "User corrections remain private; only non-private public knowledge can be reused.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-onchain",
      text: "Traza reconciles on-chain activity, including TRON USDT withdrawals, with provider activity.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-stack",
      text: "Traza uses React, Vite, and TypeScript with a Cloudflare Worker and D1 backend.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-provider-boundary",
      text: "Provider-specific behavior is isolated, and provider payloads and credentials are not exposed to the browser.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-ownership",
      text: "Rodrigo founded Traza and is its only builder.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "traza-url",
      text: "As of August 25, 2026, Traza is available at https://traza.rodrigouroz.com.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
  ]),
  source("daturno-product", "projects", "Daturno · Independent product", [
    {
      factId: "daturno-purpose",
      text: "Daturno is a WhatsApp-first scheduling product for businesses, professionals, and institutions that coordinates appointments and reservations through a conversational assistant and an administration panel.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "daturno-bounded-ai",
      text: "Daturno combines a deterministic engine that owns availability and booking rules with a model that interprets the conversational user interface and extracts structured intent and details.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "daturno-ownership",
      text: "Rodrigo designed and built Daturno end to end and is its only builder.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "daturno-motivation",
      text: "Rodrigo explored product ideas and chose scheduling to address the operational agenda needs of businesses that manage appointments or reservations.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "daturno-operation",
      text: "He took Daturno from product definition and domain modeling to a deployed API, business dashboard, and internal back office with production telemetry and operational observability.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "daturno-maturity",
      text: "As of August 25, 2026, Daturno is publicly available for businesses to register and use, with a 30-day trial and a paid monthly subscription.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
    {
      factId: "daturno-url",
      text: "As of August 25, 2026, Daturno is publicly available at https://daturno.com.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
  ]),
  source("ballast-product", "projects", "Ballast · Independent project", [
    {
      factId: "ballast-purpose",
      text: "Ballast is a broker-independent tool for exploring investment plans from explicit assumptions.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-motivation",
      text: "Rodrigo built Ballast to keep a portfolio model's assumptions, allocations, uncertainty, and trade-offs visible instead of presenting a black-box recommendation.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-experience",
      text: "A user chooses a strategy, investment amount, target, and assumptions, then compares outcome ranges, drawdowns, and required monthly contributions.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-simulation",
      text: "Ballast runs Monte Carlo simulations locally in the browser.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-optimizer",
      text: "A genetic optimizer searches for alternative plans; exact simulation then verifies the candidates.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-financial-model",
      text: "Ballast's optimization model includes tax-lot reconciliation and explicit fee and tax rules.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-data-normalization",
      text: "Ballast normalizes provider data before it reaches the optimization model.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-validation",
      text: "Its Validation Lab uses versioned datasets, point-in-time cuts, leakage-free validation, and auditable diagnostics.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-stack",
      text: "Ballast uses React, Vite, TypeScript, Hono on Cloudflare Workers, and D1.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-boundaries",
      text: "Ballast does not predict markets, execute trades, or present itself as financial advice.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-ownership",
      text: "Rodrigo founded Ballast and is its only builder.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "ballast-url",
      text: "As of August 25, 2026, Ballast is publicly available at https://ballast.rodrigouroz.com.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
  ]),
  source("jacara-product", "projects", "Jacara · Independent project", [
    {
      factId: "jacara-purpose",
      text: "Jacara is the user-facing name of a physical-first family game system guided in the browser by Nara; Tiny Adventures was an earlier internal name.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-motivation",
      text: "Rodrigo built Jacara around shared family play rather than isolated time on separate screens.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-phone-role",
      text: "The phone gives instructions and senses selected actions, but the play happens among people and their surroundings.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-audience-mechanics",
      text: "The indoor experience is designed for two to six players ages five and older, with object hunts, rhythm, laughter, voice echo, drawing, and visual-memory activities.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-narrative",
      text: "Jacara's stories include player decisions and fail-forward outcomes.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-pipeline",
      text: "A compiler turns versioned YAML game content into the runtime's canonical abstract syntax tree.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-capabilities",
      text: "Jacara separates game mechanics from browser capabilities and enables a capability only after focused probes and physical tests support it.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-audio",
      text: "Jacara pre-generates and validates its narration audio.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-audio-storage",
      text: "Narration files are content-addressed, while real-time model audio is reserved for mechanics that explicitly require it.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-privacy",
      text: "Jacara bounds camera and microphone access to the mechanics that need them and degrades conservatively when a capability is unavailable.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-media-retention",
      text: "Jacara does not retain player photos or audio by default.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-stack",
      text: "Jacara uses React, Vite, TypeScript, OpenCV.js, Cloudflare Workers, and OpenAI adapters.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-validation",
      text: "Jacara's acceptance work includes real-iPhone checks and physical family playtests; a successful browser build is not sufficient.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-ownership",
      text: "Rodrigo designed Jacara and is its only builder.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "jacara-url",
      text: "As of August 25, 2026, Jacara is available at https://jacara.rodrigouroz.com.",
      reviewedAt: "2026-08-25",
      expiresAt: "2026-11-25",
    },
  ]),
  source("utn-education-and-teaching", "education", "UTN · Education and teaching", [
    {
      factId: "utn-degree",
      text: "Rodrigo earned his Systems Engineering degree from Universidad Tecnológica Nacional (UTN) in March 2009.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "utn-teaching-period",
      text: "Rodrigo taught at UTN from 2003 through 2021.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "utn-systems-analysis",
      text: "For most of those eighteen years, he taught Systems Analysis as an Adjunct Professor.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "utn-systems-analysis-content",
      text: "His Systems Analysis course covered software lifecycles, planning, requirements elicitation, UML, and data modeling.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "utn-teaching-engineering-connection",
      text: "His teaching experience complements his engineering work with a long practice of explaining requirements, domain models, and system design.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "utn-operative-systems",
      text: "He was a Teaching Assistant in Sistemas Operativos (Operating Systems) only during the first two or three years of his teaching career.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "utn-operative-wording",
      text: "The original course name is Sistemas Operativos; its idiomatic English translation is Operating Systems.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("itba-eoi-coursework", "education", "ITBA–EOI · Education", [
    {
      factId: "itba-coursework",
      text: "Rodrigo completed the coursework for a graduate program in Strategic and Technological Management at ITBA–EOI.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "itba-no-degree",
      text: "He did not submit the thesis and therefore did not earn the graduate degree.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("silver-mentoring", "capabilities", "Silver.dev · Mentoring", [
    {
      factId: "silver-role-topics",
      text: "Through Silver.dev, Rodrigo mentors candidates in full-stack live coding and system design.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("historical-independent-projects", "projects", "Earlier independent projects", [
    {
      factId: "historical-ask-holidays",
      text: "Ask Holidays was a Next.js application that used Wit.ai for natural-language holiday queries.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "historical-housing",
      text: "Rodrigo built a Python housing scraper that detected new listings and sent Telegram notifications.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "historical-pami",
      text: "Rodrigo built a pharmacy system for PAMI with Java, JSF, Hibernate, and MySQL.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "historical-cutting",
      text: "Rodrigo built a fabric-cutting optimizer in Python and PyGTK using simulated annealing and other heuristics.",
      reviewedAt: "2026-08-25",
    },
    {
      factId: "historical-vworker",
      text: "Rodrigo spent roughly three years completing freelance projects through Rent a Coder and VWorker, using PHP, Java, Visual Basic, and C.",
      reviewedAt: "2026-08-25",
    },
  ]),
  source("personal-background", "about", "Beyond work", [
    {
      factId: "personal-interests",
      text: "Outside work, Rodrigo enjoys playing piano, reading, chess, and video games.",
      reviewedAt: "2026-08-25",
    },
  ]),
];

validateCorpus(assistantCorpus);

export function getCurrentAssistantCorpus(today: IsoDate) {
  return currentCorpus(assistantCorpus, today);
}
