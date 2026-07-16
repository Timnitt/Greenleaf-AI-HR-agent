# 🌿 GreenLeaf AI HR Agent

An internal AI assistant that answers Tier-1 HR questions for GreenLeaf Logistics (Basel, Switzerland) over **Slack or a built-in web chat** — instantly, accurately, and always with a source citation.

It combines the company handbook (RAG over pgvector), Swiss cantonal holiday data, and deterministic expense rules — so policy decisions come from tested TypeScript code, never from an LLM guess.

## Key Features

- 💬 **Slack bot** (Socket Mode) with threaded conversation memory
- 🌐 **Web chat** — zero-dependency built-in UI, deployable on free tiers (Render + Neon)
- 📚 **Handbook Q&A** via RAG — Gemini embeddings + PostgreSQL pgvector similarity search
- 🧾 **Expense validation** — pure TypeScript rules (35 CHF limit, no alcohol, ScanPro only), zero LLM involvement in the verdict
- 📅 **Basel-Stadt holiday lookups** — OpenHolidays API with local cache and a hard-coded Labour Day guarantee
- 🔒 **Security first** — PII masking, blocked-topic filter, and prompt-injection detection run *before* any LLM call; violations are audit-logged
- 🧭 **Never hallucinates** — low-confidence questions escalate to a human (HR), every answer cites its source

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 · TypeScript 5 (strict, ESM) |
| AI | Vercel AI SDK · Gemini 2.5 Flash · gemini-embedding-001 |
| Database | PostgreSQL 16 + pgvector (Docker) · Drizzle ORM |
| Interface | Slack Bolt (Socket Mode) · built-in web chat (Node http) |
| Testing | Vitest |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then add your GEMINI_API_KEY (+ Slack tokens)

# 3. Start the database (Docker Desktop required)
docker compose up -d

# 4. Ingest the handbook into pgvector
npm run ingest

# 5. Run (Slack mode if tokens are set, otherwise web chat on :3000)
npm run dev

# Or force the web chat regardless of Slack tokens
npm run dev:web
```

## Quality Gates

```bash
npm run typecheck    # strict TypeScript — must pass silently
npm test             # Vitest unit & integration tests
```

## Project Status

Built phase by phase — **all 8 phases complete**:

- [x] Phase 1 — Foundation (Docker, pgvector schema, strict TS config, shared types)
- [x] Phase 2 — Database layer (Drizzle schema + pooled client)
- [x] Phase 3 — Pure logic (expense validator, PII masker) + tests
- [x] Phase 4 — Holiday service (API client, caching, Labour Day override) + tests
- [x] Phase 5 — RAG pipeline (handbook ingestion + vector search)
- [x] Phase 6 — Agent orchestration (Vercel AI SDK tool calling)
- [x] Phase 7 — Entry point & interface selection
- [x] Phase 8 — Slack integration + web chat

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

---

*· Based on GreenLeaf Handbook v2.1*
