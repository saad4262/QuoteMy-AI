# QuoteMy AI — API

Business-onboarding API for QuoteMy AI (Express + TypeScript, MVC). A business submits its price
list, the pipeline reviews it, extracts it, verifies every number against what they actually wrote,
stores it, and the business confirms it to go live.

- **Why Node instead of n8n:** [docs/PLAN.md](docs/PLAN.md)
- **The contract being built — routes, ingestion, model calls, errors, security:** [docs/FLOW.md](docs/FLOW.md)
- **The n8n build, kept for reference only:** [n8n/](n8n/)

## Status

| | |
|---|---|
| Pipeline | ✅ review → extract → verify → store → report, running end to end |
| Storage | in-memory. Firestore is a second class in `store.ts` — nothing else changes |
| Auth | `REQUIRE_AUTH=false` + `x-debug-uid` header for now. Firebase token verification lands with Firebase |
| Model | `AI_PROVIDER=mock` (offline, deterministic, free) or `openai` with `gpt-5.6-terra` |
| File uploads | not yet — text only. PDFs/images are the next step ([docs/FLOW.md](docs/FLOW.md) §3) |

## Running

```bash
cp .env.example .env
npm run dev        # http://localhost:8787
npm test           # 44 unit + integration tests, no API key needed
npm run typecheck
```

Postman collection: [docs/postman/quotemy-ai.postman_collection.json](docs/postman/quotemy-ai.postman_collection.json)
— import it, then run the folders top to bottom.

`AI_PROVIDER=mock` is the default: a deterministic rule-based reader that recognises firm
`$N per metre` lines. It exercises every route, every check and every report without an API key and
without spending anything. Every response says `"model": "mock"` so it can never be mistaken for the
real thing. Switch to `AI_PROVIDER=openai` and set `OPENAI_API_KEY` when you want real extraction.

## Routes

| Method | Route | |
|---|---|---|
| `GET` | `/api/v1/health` | liveness |
| `GET` | `/api/v1/ready` | provider, model, store, prompt token sizes |
| `GET` | `/api/v1/vocab/:trade` | the closed enums — render the frontend's tick-boxes from this |
| `POST` | `/api/v1/business/onboarding` | `{ trade, text }` → review → extract → verify → store |
| `GET` | `/api/v1/business/profile/:trade` | what is stored now, plus submission history |
| `POST` | `/api/v1/business/profile/:trade/confirm` | the human confirmation that makes prices live |
| `POST` | `/api/v1/dev/review` `/dev/extract` | single stages, for prompt tuning (`ENABLE_DEV_ROUTES=true`) |

Two response shapes exist and no others:

```jsonc
{ "ok": true,  "requestId": "…", "data": { … }, "meta": { "model", "store", "stages", "costUsd", "coverage" } }
{ "ok": false, "requestId": "…", "error": { "code", "message", "details" } }
```

A rejected price list is a **200 with `approved: false`** — the business did nothing wrong by
submitting an incomplete list. Only a broken request or a broken pipeline is an error.

## Status lifecycle

```
pending ──submit──► verified | unverified ──business confirms──► confirmed  (live)
                          │
                          └── re-submitting always clears a previous confirmation
```

`confirmedAt` is set only by the confirm endpoint. The pipeline never sets it — no price goes live
without a human confirming it.

## Layout

One file per job, no folder nesting. The name tells you what is inside.

```
src/
  server.ts      express app + middleware + start
  routes.ts      the URL table - which route runs which handler
  controller.ts  request in, response out. No business logic
  pipeline.ts    the actual flow: sanitise -> review -> extract -> verify -> store -> report
  verify.ts      quote matching, vocabulary re-check, plausibility bounds (no model involved)
  report.ts      builds the markdown, so the layout never varies between runs
  store.ts       where data lives (in-memory today, Firestore later - same interface)
  ai.ts          the ONLY file that talks to OpenAI, plus the offline mock
  schemas.ts     zod schemas -> strict JSON Schema, validation and types from one definition
  prompts.ts     loads and assembles the prompt files
  prompts/       the system prompts and SOPs, as plain .md you can edit
  vocab.ts       the canonical closed enums - the highest-risk file in the repo
  http.ts        errors, response envelope, auth, rate limit, request id
  config.ts      env validation + logger

SOPS/            the client's source documents, untouched
n8n/             the previous build, reference only
tests/           unit + integration, and the fixtures the eval harness will score
docs/            PLAN.md, FLOW.md, postman/
```

Reading order if you are picking this up cold: `routes.ts` -> `controller.ts` -> `pipeline.ts`.
Those three tell you the whole story; everything else is a helper one of them calls.

## What keeps the output honest

1. **Strict `json_schema`** — the model cannot emit a key outside the schema or a value outside an enum.
2. **Quote verification** — every number must carry the exact sentence it came from, and that sentence must really appear in the business's text. No match → the number is dropped and the business is told.
3. **Plausibility bounds** — testing caught an `$8500/m` rate whose source sentence genuinely existed.
4. **Vocabulary re-check in code** — belt and braces, because vocabulary drift is the one failure here that is silent and permanent.
5. **The report is assembled by code** — the model supplies the words, never the layout.
6. **Every response is built by one function** (`send` in `http.ts`) — the shape cannot vary because there is only one place that makes it.
