# GreenLeaf AI HR Agent

An internal AI assistant that answers Tier-1 HR questions for GreenLeaf Logistics (Basel, Switzerland) over Slack or a built-in web chat - with every answer backed by a cited source.

**Live demo:** deployed on Render's free tier with a Neon Postgres database. First load may take up to a minute while the free instance wakes up.

## The Problem

At a mid-sized logistics company, the HR team spends a surprising amount of its week answering the same handful of questions: "Can I expense this client lunch?", "Is May 1st a holiday in Basel?", "How many vacation days do I get?". The answers already exist in the employee handbook - people just don't read it, or can't find the right section.

A plain chatbot isn't a safe fix. Off-the-shelf LLM assistants have three failure modes that matter in an HR context:

1. **They hallucinate policy.** An invented expense limit or vacation rule is worse than no answer at all.
2. **They leak personal data.** Employees paste names, phone numbers, IBANs and AHV numbers into chat without thinking. That data should never reach a third-party model unmasked.
3. **They mishandle sensitive topics.** Questions about harassment or whistleblowing need a confidential human channel, not a generated reply.

This project is an attempt to solve the repetitive-question problem without inheriting those three risks.

## The Solution

The agent splits every question into one of three lanes, and only one of them involves the LLM generating an answer:

- **Deterministic rules** - expense validation (35 CHF limit, no alcohol, external client required, ScanPro submission only) is pure TypeScript. The LLM extracts the parameters from the question; the verdict comes from tested code, never from a model guess.
- **External data** - public holiday lookups hit the OpenHolidays API for Basel-Stadt, with a local cache and a hard-coded Labour Day override sourced from the handbook.
- **Retrieval-augmented answers** - handbook questions run a pgvector similarity search over embedded handbook sections. If the best match falls below a confidence threshold, the agent refuses to answer and escalates to a named HR contact instead of improvising.

Before any of that happens, a security gate runs on the raw input: Swiss-format PII (names, phone numbers, emails, IBANs, addresses, AHV numbers) is masked, prompt-injection attempts and off-topic requests are blocked, and violations are written to an audit log. Harassment, bullying and whistleblowing keywords short-circuit the pipeline entirely and return the confidential ombudsman contact - the LLM never touches those conversations.

Every response carries its source: a handbook section, the holiday API, or the rule engine.

## How It Works

```
User (Slack thread or web chat)
        |
        v
Security gate ............ PII masking, injection detection,
        |                  blocked-topic filter, audit logging
        v
Sensitive-topic check .... harassment/whistleblowing -> ombudsman
        |                  (no LLM involved)
        v
Orchestrator ............. Gemini 2.5 Flash via Vercel AI SDK,
        |                  max 3 tool steps
        +-- validateExpense  (pure TypeScript rules)
        +-- lookupHoliday    (OpenHolidays API + cache)
        +-- queryHandbook    (pgvector search + confidence gate)
        |
        v
Response with source citation, or escalation to HR
```

Conversations are threaded: session history is stored in Postgres (PII-masked before insert) and replayed on follow-up questions, so "and what about drinks?" works in context.

## Tech Stack

| Layer     | Technology                                               |
| --------- | -------------------------------------------------------- |
| Runtime   | Node.js 22 - TypeScript 5 (strict, ESM)                  |
| AI        | Vercel AI SDK - Gemini 2.5 Flash - gemini-embedding-001  |
| Database  | PostgreSQL 16 + pgvector - Drizzle ORM                   |
| Interface | Slack Bolt (Socket Mode) - built-in web chat (Node http) |
| Testing   | Vitest                                                   |
| Hosting   | Render (app) + Neon (database), both free tier           |

## Getting Started

Requirements: Node.js 22+, a Gemini API key, and either Docker Desktop (local Postgres) or a Neon account (cloud Postgres).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # add your GEMINI_API_KEY and DATABASE_URL

# 3. Database
docker compose up -d        # local option - runs Postgres with pgvector
                            # cloud option - run scripts/init.sql in Neon's SQL editor

# 4. Ingest the handbook into pgvector
npm run ingest

# 5. Run
npm run dev                 # Slack mode if tokens are set, otherwise web chat on :3000
npm run dev:web             # force the web chat regardless of Slack tokens
```

The app picks its interface automatically: web mode when `--web` is passed or a `PORT` variable is present (i.e. on a hosting platform), Slack mode when both Slack tokens are configured, web chat as the local default.

### Deploying for free

1. Create a Neon project, run `scripts/init.sql` in its SQL editor, and copy the connection string.
2. Run `npm run ingest` once locally with `DATABASE_URL` pointed at Neon.
3. Create a Render web service from this repo - build command `npm install && npm run build`, start command `npm start` - and set `GEMINI_API_KEY`, `DATABASE_URL` and `NODE_VERSION=22` as environment variables.

Render sets `PORT`, so the app boots straight into web-chat mode. Pushes to `main` redeploy automatically.

## Quality Gates

```bash
npm run typecheck    # strict TypeScript - must pass silently
npm test             # 22 Vitest tests covering expense rules,
                     # holiday logic and PII masking
```

The pieces that make policy decisions - the expense validator, the holiday service, the PII masker - are pure functions with no LLM in the loop, which is what makes them testable in the first place.

## Project Structure

```
├── data/            # cleaned handbook + holiday cache
├── logic/           # LLM system prompt
├── scripts/         # DB init SQL + ingestion script
├── src/
│   ├── agent/       # orchestrator, tools, expenses, holidays, RAG, sessions
│   ├── db/          # Drizzle schema + client
│   ├── interface/   # Slack bot + web chat
│   └── security/    # PII masking, blocked topics, injection detection
└── tests/           # Vitest suites
```

## Project Status

**v1.0 - complete and deployed.** All eight build phases (foundation, database layer, pure logic, holiday service, RAG pipeline, agent orchestration, entry point, Slack + web interfaces) are finished, tested and running in production on the free-tier stack described above.

## Roadmap

Planned improvements, roughly in order:

- **Admin handbook updates** - re-ingest the handbook from the UI or a webhook instead of running the ingestion script manually
- **Multilingual support** - German and French answers for a realistic Swiss workforce
- **Semantic injection detection** - replace the keyword blocklist with an embedding-based classifier
- **Evaluation harness** - a golden-question test set that scores answer accuracy and escalation behaviour on every change

- **Usage analytics** - a small dashboard over the session and audit tables showing top question categories and escalation rate

---

*Based on GreenLeaf Handbook v2.1*
