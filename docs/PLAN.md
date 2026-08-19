# Node.js + Express vs n8n — what actually changes

A decision document, written after building the business-onboarding pipeline in n8n end to end. Every
claim below is grounded in something that came up while building *this* workflow, not in general
argument. `CONTEXT.md` §2 originally specified a Node gateway; this revisits that call with evidence.

---

## The honest headline

**Moving to Node does not make the model read price lists better.** Same model, same prompt, same
output. Anyone promising an accuracy jump from a runtime change is selling you something.

What it changes is narrower and more valuable than that: **it converts things that are currently
prompt-level pleas into code-level guarantees, and it makes accuracy measurable for the first time.**

Right now the workflow contains this instruction:

> "You MUST call your knowledge lookup tools before deciding anything. Call both."

That is a written request to a language model to do something that should be impossible to skip. In
Node, the SOP text is simply in the prompt — there is nothing to ask for and nothing to skip. That
gap, repeated across five or six places, is the real argument.

---

## What does NOT improve

Be clear about this before the rest:

| | Why not |
|---|---|
| The model's reading accuracy | Same model, same prompt. A wrong rate read from ambiguous text stays wrong. |
| Quote verification | Already plain JavaScript. Works identically either way. |
| Review judgement quality | Same model doing the same assessment. |
| The knowledge/SOP content | Still text you write. Node makes it a file instead of a node — neither is smarter. |
| Cost per run | Identical token spend, ~$20/mo at 200 businesses. |

If the goal is "the AI should misread fewer price lists", the lever is the eval harness (below), not
the runtime.

---

## What genuinely gets solved

### 1. Strict `json_schema` — the biggest single gap

`CONTEXT.md` §7.1 is the first non-negotiable in the document: **strict `json_schema`, never
`json_object`.** It is currently **not met**.

Neither n8n path exposes OpenAI's `strict: true`. The workflow enforces the schema by describing it
in the prompt and re-checking the result in a Code node. That works, but it is *detection after
generation* rather than *prevention during generation*.

In Node this is one object:

```ts
response_format: {
  type: "json_schema",
  json_schema: { name: "extraction", strict: true, schema: fencingSchema }
}
```

With `strict: true` the model **physically cannot** emit a key outside the schema or a value outside
an enum. The entire class of vocabulary-drift failures stops existing rather than being caught.

That matters here more than usual, because vocabulary drift is the one failure in this system that is
silent and permanent. In testing, `treatedPinePaling`, `Timber`, `bamboo_screening`, `brushwood`,
`fancy_gate` and `muddy` were all caught by the code gate — but "caught and reported" means the
business gets told a rate could not be saved. With strict schema they are never generated.

### 2. An eval harness — the only real accuracy lever

`CONTEXT.md` §7.8 asks for 15 real messy price lists with hand-written expected output and a
field-by-field scoring script, run on every prompt change, targeting 95% on price fields.

**There is currently no way to run this.** Everything in this build was verified by extracting the
Code-node JavaScript out of the workflow JSON and executing it in `new Function()` with hand-faked
`$json` and `$()` — a workable trick for checking logic, but it cannot test a prompt, and it cannot
score 15 fixtures against expected output.

So today: a prompt change is shipped on the strength of one or two manual chat runs. Nobody can say
whether it improved extraction or quietly broke a case that used to work. `CONTEXT.md` predicted this
exactly — *"without it, each improvement quietly breaks something else and a customer finds out
first."*

In Node this is an afternoon: 15 fixture files, expected JSON beside each, a script that diffs field
by field and prints a score. Then every prompt edit gets a number. **This is where accuracy actually
comes from** — not from the runtime, from being able to iterate against evidence.

### 3. The review step stops being an agent

`CONTEXT.md` §1: *"if a flow's next step is already known, it is a pipeline, not an agent."*

The review step's next step is always known: read both SOPs, then assess. It is an Agent node purely
because that is how n8n attaches tool sub-nodes. That buys nondeterminism nobody wanted — the agent
decides whether to call one tool, both, or neither, and the only defence is the word MUST in the
prompt.

In Node:

```ts
const sops = [generalRules, fencingRules];       // always both, no decision
const result = await review(sops, description);   // one call
```

Same output, minus a class of variance. This is the clearest "predictability" win available.

### 4. Retry-once with the error fed back

`CONTEXT.md` §7.7: validate, retry exactly once with the error attached. **Dropped** from the current
build — n8n workflows are DAGs, so a bounded retry needs a duplicated agent cluster, and you asked
for two agents, not three. A `for` loop with a hard cap of 2 is four lines in Node.

### 5. One vocabulary file, imported by both sides

`CONTEXT.md` §8 calls `shared/vocab.ts` the highest-risk file in the codebase, precisely because both
the business side and the customer side import it.

Today the fencing enums exist in **two copies inside one workflow** (the Output Parser schema and the
mirrored list in `Format Extraction`), and the customer-matching workflows carry their own separate
notions of the same values. Nothing enforces that they agree. The day they diverge, search returns
nothing and no error is raised anywhere.

One import cannot diverge. This is structural, not a discipline problem.

### 6. Prompt and logic changes become reviewable

Every change in this build was applied with a Python patch script, because hand-editing JavaScript
embedded as escaped strings inside JSON is error-prone enough that it should not be done by hand. The
consequence: a prompt diff is unreadable, `git blame` on a rule is useless, and code review of a
model instruction is impractical.

In Node, prompts are `.md` or `.ts` files. A reviewer sees exactly which sentence of the review rules
changed.

### 7. Observability, cost caps, structured logging

`CONTEXT.md` §12 flags this. Currently: no per-request token accounting, no cost ceiling, no
structured logs, no way to answer "which extraction produced this wrong rate, and what did the model
actually return?" three weeks later. All standard in Node, none available in the workflow.

---

## Accuracy: guaranteed vs probabilistic

The useful way to answer *"kitni accuracy barhegi"* is not a percentage — it is which failure classes
stop being possible.

| Failure class | In n8n today | In Node |
|---|---|---|
| Invented enum value / key | Caught after generation, reported to business | **Cannot be generated** (strict schema) |
| Missing required field | Caught, no retry | **Cannot be generated** |
| Wrong JSON type (`"850"` vs `850`) | Caught | **Cannot be generated** |
| Malformed JSON | Caught, no retry | Caught, **retried once with the error** |
| Invented number | Caught by quote verification | Same (unchanged) |
| Number of wrong magnitude | Caught by bounds check | Same (unchanged) |
| Two rates conflated in one sentence | Prompt-dependent | Same, **but now measurable** via eval set |
| Model skips reading the SOPs | Prompt says MUST, unverifiable | **Impossible** — SOPs always in the prompt |
| Prompt regression | Undetectable | Caught by eval score |

Rows 1–3 go from *detected* to *impossible*. Rows 4 and 8 go from *unmet requirement* to *met*. The
model-judgement rows do not change — but they become improvable, which today they are not.

---

## Production readiness

| | n8n now | Node + Express |
|---|---|---|
| Auth on the write path | **None** (see below) | Firebase Admin verifies the ID token, ~5 lines |
| Rate limiting | None | `express-rate-limit` |
| Deploy | Import JSON in the UI | CI/CD, staging, one command |
| Rollback | Re-import an older file, by hand | `git revert` |
| Automated tests | Not possible on prompts | Unit + integration + eval |
| Horizontal scaling | n8n executions, single instance | Stateless behind a load balancer |
| Single point of failure | Yes, for this path | Node is the only hop |
| Timeout / cancellation control | Node-level retry settings only | Per-request, explicit |
| Secrets | n8n credential store (fine) | Env / secret manager (fine) |
| Cost ceiling | None | Enforceable per request and per day |

### The security hole — worth fixing regardless of this decision

`Normalize Input` reads `businessUid` straight from the request body, and `CLAUDE.md` records the
deliberate decision that **n8n does not verify auth**. That means:

> Anyone who learns the webhook URL can POST any `businessUid` and overwrite that business's pricing.

Both Firestore writes are currently disabled, so nothing is live yet. But this must be closed before
the write nodes are enabled in production. There are only two ways to close it:

1. **A Node layer that verifies the Firebase ID token** before anything else runs. (This is what
   `CONTEXT.md` §3 assigned to Node in the first place.)
2. **Verify the token inside n8n** — a Code node calling Google's certs and checking the JWT
   signature by hand. Doable, but writing your own token verification is exactly the kind of code
   that should not be hand-rolled.

This single item is the strongest practical argument for the Node layer. It is not an accuracy
question, it is a "someone can rewrite a stranger's prices" question.

---

## What n8n should keep

Moving the AI pipeline out does not mean deleting n8n, and `CONTEXT.md` §10 already says so:

- **Async jobs** — gap emails, notifications, reminders, scheduled re-extraction, admin backfills.
- **Third-party integrations** — Slack, CRM, Twilio. Genuinely faster to wire visually.
- **Cron.**
- **The customer-side chat router and subagents** — until they are ported, they keep working.

Node triggers these by webhook. This is `CONTEXT.md` §13 step 5, unchanged.

One real thing that gets *worse*: the SOP/knowledge text currently lives in `toolCode` nodes, so you
can edit fencing rules in the n8n UI with no deploy. In Node it becomes a file, or a Firestore
document you fetch. If "edit the rules without a developer" matters, keep the knowledge in Firestore
and have Node read it — same convenience, and it was the original design.

---

## Recommended shape

```
React ──► Node + Express ──► OpenAI (strict json_schema)
            │                    │
            │                    └── one call per stage, deterministic pipeline
            │
            ├──► Firebase Admin  (auth verify, Firestore read/write)
            ├──► shared/vocab.ts (imported by business + customer side)
            └──► n8n webhook     (async jobs, emails, integrations)
```

Migration order, following `CONTEXT.md` §13 — each step ships with the current flow still running:

1. **Express skeleton + auth + Firestore writes. No AI.** Closes the security hole immediately, which
   is the urgent part. The existing n8n workflow keeps handling AI.
2. **Port the two stages.** The Code-node JavaScript transfers almost verbatim — quote verification,
   enum validation, bounds checks and both report builders are already plain functions with no n8n
   API surface. Add strict `json_schema` and retry-once here.
3. **Extract `shared/vocab.ts`.** Single source for the enums; import it on both sides.
4. **Build the eval harness + 15 fixtures.** `tests/fixtures/description-GOOD-southeast-fencing.txt` and
   `description-BAD-daves-fencing.txt` are two of them already. Get a baseline number before touching
   any prompt again.
5. **Leave async jobs in n8n.** Node calls them by webhook.

---

## Effort

| | |
|---|---|
| Express + auth + Firestore, no AI | 1–2 days |
| Port both stages (logic transfers nearly as-is) | 1–2 days |
| `shared/vocab.ts` + wire both sides | 0.5 day |
| Eval harness + 13 more fixtures | 2–3 days (`CONTEXT.md` budgets ~2 for the fixtures alone) |
| Deploy, logging, cost caps | 1 day |
| **Total to parity + the things n8n cannot do** | **~6–9 days** |

Parity alone is 2–4 days. The eval harness is the expensive item and also the only one that moves
accuracy, so it should not be the part that gets cut.

---

## Recommendation

**Yes, move the business AI to Node — but stage it, and do it for the right reasons.**

Not because n8n is bad at this. The workflow works, the accuracy guards are real and tested, and it
was the right call for proving the pipeline quickly. Move because four specific things are currently
either unmet or impossible, and all four are things `CONTEXT.md` already asked for:

1. **No auth on the write path.** Urgent, independent of everything else on this page.
2. **Strict `json_schema`** — non-negotiable #1, currently not met.
3. **No eval harness** — so accuracy is unmeasurable, and prompt changes are unfalsifiable.
4. **One vocabulary file** — currently duplicated, with silent-failure consequences.

Do step 1 soon whatever else you decide. Steps 2–4 can follow at whatever pace suits, with n8n still
serving traffic throughout.

And keep expectations calibrated: after all of this, the model still reads a messy price list exactly
as well as it does today. What changes is that you will know how well that is, and be able to improve
it on purpose instead of by feel.
