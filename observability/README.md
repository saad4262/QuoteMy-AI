# Observability

Grafana, Prometheus, Loki and Alloy, on your machine, watching the **deployed** backend.

Nothing in `app/` is required for this folder to run, and nothing here can affect a request. The
stack is inert until the app is given a `TELEMETRY_URL` to push to (Phase 1) — before that it sits
there with empty graphs, and the API behaves exactly as it does today.

## Why it is shaped like this

Vercel freezes a function instance the moment it answers. That single fact decides the design:

- **Prometheus cannot scrape the app.** There is no process sitting there to ask, and each request
  may land on a different short-lived instance. So nothing is pulled — everything is pushed.
- **Background work after the response dies.** `app/src/controller.ts` documents this the hard way
  (submissions sat at `pending` because the pipeline was started and not awaited). Telemetry has
  exactly the same failure mode, which is why the app will flush with `waitUntil()` rather than
  hoping.
- **Your laptop has no public address.** So a tunnel gives the stack one door, and the Caddy gate
  checks a secret before anything gets through it.

```
Vercel (Hobby)  ──push──►  tunnel  ──►  gate ──► Alloy ──┬──► Loki        (log lines)
  quote-my-ai              :8080       (secret)          └──► Prometheus  (numbers)
                                                                   │
                                                              Grafana :3000
```

## Running it

The container runtime here is **colima** (open source, no licence question, no GUI). It is a VM, so
it has to be running before docker does anything:

```bash
colima start              # once per reboot;  colima status  to check
```

Then:

```bash
cp .env.example .env      # then put a real secret in it:  openssl rand -hex 32
docker compose up -d
./smoke-test.sh           # proves the pipe is joined up, not just that the containers booted
```

`smoke-test.sh` waits for readiness rather than asking once - Loki holds a 15-second grace period
after boot, and a single impatient check reports a healthy stack as broken.

Grafana: <http://localhost:3000> — `admin` / whatever you put in `.env`.

| | |
|---|---|
| `docker compose down` | stop; data survives in named volumes |
| `docker compose down -v` | stop and wipe every metric and log line |
| `docker compose logs -f alloy` | when a log line does not show up, start here |
| `docker compose restart alloy` | after editing `alloy/config.alloy` |

## What is in here

```
docker-compose.yml     five services, all bound to 127.0.0.1
alloy/config.alloy     the pipe: receive -> parse -> Loki (+ Prometheus, from Phase 1)
loki/                  31 days of log lines, on local disk
prometheus/            30 days of numbers; rules/ holds alerts from Phase 3
caddy/Caddyfile        the gate - one header check, then proxy
grafana/provisioning/  datasources, so nothing has to be clicked
grafana/dashboards/    dashboards as committed JSON (Phase 2)
smoke-test.sh          the acceptance test for all of the above
tunnel.sh              opens the one public door, prints what to paste into Vercel
verify-remote.sh       checks that door from outside, and whether Vercel is coming through it
VERCEL.md              the runbook for pointing the deployed backend at this stack
```

## Versions

Pinned, and verified working together on 2026-09-12:

| | |
|---|---|
| Loki | 3.7.7 |
| Prometheus | 3.14.0 |
| Alloy | 1.19.2 |
| Grafana | 13.2.1 |
| Caddy | 2.11.4 |

Bump one at a time, deliberately, then re-run `smoke-test.sh`. Loki's `schema_config` is the part
that does not survive a major bump untouched.

## Turning it on for an app

Set two variables where the app runs, and nothing else:

```
TELEMETRY_URL=http://localhost:8080          # the gate
TELEMETRY_SECRET=<the same value as .env>
```

Unset, the app ships nothing and logs exactly as it did before any of this existed. There is no
half-on state, and tests never ship at all.

## What is being measured, and where it came from

Every metric below is derived from a log line, and no metric library is imported anywhere in the
app. Most come from lines that already existed; three lines were **added** — `submission`,
`not used` and `chat turn` — because the two busiest paths in the product logged nothing at all
about how they ended. Those are `logger.info` calls and nothing more: no branch, no return value and
no condition was changed to produce any of this.

| Metric (`loki_process_custom_…`) | Labels | From |
|---|---|---|
| `http_requests_total` | `status` | `http.ts` `'request'` |
| `http_duration_ms` | `status` | same line's `ms` |
| `model_calls_total` | `stage` | `ai.ts` `'model call'` |
| `model_cost_usd_total` | `stage` | same line's `costUsd` |
| `model_tokens_in_total` / `_out_total` | `stage` | same line |
| `model_retries_total` | `stage` | same line |
| `model_duration_ms` | `stage` | same line's `ms` |
| `model_schema_violations_total` | `stage` | `ai.ts` `'model output failed validation'` |
| `submissions_total` | `trade` `outcome` `status` | `pipeline.ts` `'submission'` |
| `rates_saved_total` | `trade` `outcome` `status` | same line |
| `submission_cost_usd_total` · `submission_duration_ms` | `trade` … | same line |
| `figures_not_used_total` | `trade` | `pipeline.ts` `'not used'` |
| `vocabulary_drift_total` | `trade` | same line, `Could not file` only |
| `chat_turns_total` | `trade` `type` `tapped` | `client/controller.ts` `'chat turn'` |
| `chat_quotes_shown_total` · `chat_cost_usd_total` · `chat_turn_duration_ms` | `trade` … | same line |

`loki_process_custom_` is Alloy's own prefix for a metric produced by a `stage.metrics` block; it
cannot be renamed, so dashboards use it as-is.

**These counters reset when Alloy restarts** — they live in its memory, not on disk. That is fine
for `rate()` and `increase()`, which is how every panel here uses them, and wrong for "how much have
we spent in total, ever". For that, read `chatSpend/{day}` in Firestore, which is the ledger.

## The dashboards

| | Answers |
|---|---|
| **Model & Money** | What is the model costing, at which stage, and is that changing? |
| **Traffic & Errors** | Rate, errors, duration — what the service itself says happened |
| **Customer chat** | Matching time, how the trade was decided, questions and voice turns |
| **Telemetry pipe** | Is this stack alive? A quiet dashboard and a broken pipe look identical from anywhere else |
| **Business onboarding** | What happens to the price lists businesses send, and why figures get dropped |

Firing alerts appear on the Telemetry pipe page as a table, and as a count on Money and Business
onboarding — so a critical alert interrupts whatever you were reading rather than waiting on a page
nobody has open.

They are generated:

```bash
./build-dashboards.py          # rewrites grafana/dashboards/*.json
docker compose restart grafana # ⚠ see below
```

**Grafana 13 loads new dashboard files at startup, not on the rescan.** A new file dropped into
`grafana/dashboards/` stayed invisible here with nothing logged either way; a restart picked all
four up at once. Editing an existing file is picked up on the interval as documented — it is only a
NEW file that needs the restart. `smoke-test.sh` checks all four are loaded, so this cannot go
unnoticed twice.

Experiment in the UI freely (`allowUiUpdates` is on), but put changes worth keeping back into
`build-dashboards.py` — Grafana reloads from disk and will overwrite the rest.

Every query on all four pages was run against Loki and Prometheus before being put on a panel. A
flat line on the chat page means no customer traffic yet, not a broken query.

## Alerts

Six, in `prometheus/rules/quotemy.yml`. Everything there is either *money is leaking*, *the product
is silently wrong*, or *we have gone blind*; anything merely interesting is a dashboard, not an
alert.

**They do not notify anyone yet.** They evaluate and show at <http://localhost:9090/alerts> and in
Grafana, which is useful while you are looking and useless while you are not. Delivery is one
Grafana contact point away (Alerting → Contact points) and is the remaining piece.

### Two things that make counter alerts lie

Both were found by testing rather than reading, and both would have left a stack that looks healthy
and reports nothing.

**1. Alloy deletes an idle metric after five minutes.** `stage.metrics` defaults
`max_idle_duration` to `5m`. At this service's traffic — 78 function invocations in six hours — a
five-minute gap between matching lines is the *normal state*, so every counter was being destroyed
and recreated from zero between bursts. Measured: ten minutes after the last request, every custom
series had vanished from Alloy *and* from Prometheus. The result was not a missing graph but
`rate()` and `increase()` silently returning nothing, dashboards that filled and emptied, and alerts
that could never fire. Every metric now carries `max_idle_duration = "24h"`; a 7-minute idle gap was
then re-tested and the series survived.

**2. `increase()` reads zero for the event that creates the counter.** A counter that does not exist
until the thing you are alerting on happens goes straight to 1, and `increase()` measures *change
within the window* — so it reports 0. Measured: a vocabulary-drift line pushed, counter read 1,
`increase(...[1h])` read 0, alert stayed silent. The first occurrence of a should-never-happen event
is exactly the one that must not be missed, so `VocabularyDrift` and `ApprovedButNothingVerified`
read the counter's **value** instead. They latch until Alloy restarts, which for something that is
supposed to be impossible is the right trade. Re-tested afterwards: the alert went pending, then
firing.

## The one rule that breaks this stack if broken

**A Prometheus label must be a small closed list.** `env`, `level`, `trade`, `stage`, `outcome`,
`reason` — all of them have under ten possible values.

`businessUid`, `sessionId`, `requestId`, `suburb`, a rate, a customer's own words: these go **inside
the log line**, where they are searchable, and **never** into a label. One label with a thousand
values is a thousand streams, and both Loki and Prometheus fall over long before that gets
interesting.

Same rule, said the other way: **Loki answers "what happened in that one request", Prometheus
answers "how often, how fast, how much".** Ask each the question it is built for.

## Phases

| | | |
|---|---|---|
| 0 | Stack up, pipe proven | ✅ done — **no app change at all** |
| 1 | App pushes its existing pino logs; Alloy derives metrics from them | ✅ done — `app/src/telemetry.ts` |
| 2 | Four dashboards, committed as JSON | ✅ done — no app change |
| 3 | The log lines `pipeline.ts` never had, the onboarding dashboard, six alerts | ✅ done — log lines only |
| 4 | Tunnel, and Vercel pointed at it | 🔸 prepared — see **[VERCEL.md](VERCEL.md)**; the last two steps are yours |

Business logic is not touched in any of them.
