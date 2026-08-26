# Dynamic Schema Migration — Step-by-Step Plan

Goal: a new trade becomes a **Firestore document**, not a code change. Questions, options,
checklist fields, their order and their conditional rules all move out of TypeScript and into
`schema/{trade}`.

This file is written to be executed **one step per session**. Each step is small enough to finish
in one sitting, and each ends with a verification command that must pass before the next begins.

---

## How to run this

```
Read docs/DYNAMIC-SCHEMA-PLAN.md. Find the first step whose checkbox is unticked.
Do ONLY that step. Run its Verify command. If it passes, tick the box and stop.
If it fails, do not proceed — report what broke.
```

Never do two steps in one pass. The whole point of the sequence is that when something breaks you
know exactly which change did it.

---

## Ground rules — these never bend

1. **The AI never writes `core`.** It may propose a new value; that value lands in `extras` with
   its aliases and a `businessCount` of 1. Promotion to `core` needs three independent businesses
   or a human. This is the one rule that protects against silent, permanent vocabulary drift
   (`CLAUDE.md`, `CONTEXT.md` §8).
2. **The model never chooses a question, an option, a customer-facing sentence, or does
   arithmetic.** Schema supplies the content; code decides the flow. If a step seems to need the
   model to decide something, the step is wrong.
3. **Field *types* stay in code.** Schema may say `"type": "enum"`; it may never invent a new type.
   Same for pricing: schema picks from a closed set of pricing models, it never expresses a formula.
4. **Old slugs are never renamed.** Back-compatibility is one-directional: add, never rewrite.
5. **Golden tests stay green.** A step that changes a snapshot is either a bug or a deliberate
   behaviour change that must be called out explicitly in the commit message.

---

## Why the order is what it is

Steps 3–9 build the target shape **while the data is still hardcoded in TypeScript**. Nothing about
the system's behaviour changes; only where the constants live. Only at step 10 does the data
actually move to Firestore.

This means every refactor step is verifiable by "the snapshots did not move", and the one step that
genuinely changes behaviour is isolated and small.

---

# Phase 0 — The safety net

Nothing else starts until this is done. Every later step is verified against it.

### [x] Step 1 — Golden conversation harness — DONE

**Goal.** Capture the current behaviour of the whole chat pipeline as snapshot files, so any later
change that alters it is impossible to miss.

**Why this works here.** `MockAiClient` (`src/ai.ts:395`) is a pure function of its input text, and
`tests/setup.ts` already pins `AI_PROVIDER=mock` and `STORE=memory`. `runFencingChat` takes
`deps.ai` and `deps.repo`. So the entire pipeline is already deterministic.

**Correction found while doing this.** The claim that no scripted fake AI is needed was wrong.
`MockAiClient.turn()` (`src/ai.ts:525`) can only ever fill the ONE field that was last asked, and
hardcodes `offTopic: false`. Conversations 3, 9, 10 and 11 are specifically about what happens when
the model returns something nobody asked for, so the mock cannot produce their input at all. A
`scriptedAi(reply)` helper in `tests/golden/conversations.ts` answers chosen messages and hands
everything else to the ordinary mock. It is keyed by the customer's message, not by call count,
because a tapped option skips the model entirely and a counter would fall out of step.

**Second correction.** The harness must adopt `response.place` as the client's current place each
turn. `mergeAndDecide` resolves `input.place ?? ui.place`, so a request carrying a stale place beats
the one the server settled on — echoing the last *picked* place instead put a customer who had just
moved to a covered suburb back onto the rejected one and reopened the suburb question. Conversation
7 is what caught this.

**Files.** New: `tests/golden/conversations.ts`, `tests/golden/golden.test.ts`.

**Do.**
- Write a `runScript(turns: string[], seed: SeedFn)` helper that drives `runFencingChat` turn after
  turn, feeding each response's `checklist` back as the next turn's `knownChecklist` — exactly as
  `tests/integration/client-chat.test.ts` already does.
- Capture the **full `ChatResponse` for every turn**, not just the last one.
- Snapshot with `toMatchFileSnapshot()` so diffs are readable in review.
- Write at least these 12 conversations. Each one exists because it covers a guard that a later
  refactor could silently drop:

  | # | Conversation | Guards |
  |---|---|---|
  | 1 | Straight happy path, all tapped options, through to a result | zero-LLM fast path, field order |
  | 2 | Same, but every answer is free text | model path, `mentioned()` |
  | 3 | One sentence naming three things ("30m colorbond in Berwick") | multi-field fill |
  | 4 | "Something else" three times on materials until exhausted | `cursor` paging, `exhausted` |
  | 5 | Recap → "no" → change the height → recap again | `saidNo`, `fixing`, `clearFields` |
  | 6 | Recap → "no" → type "lenght" (typo, matches nothing) | `fixingUnresolved` |
  | 7 | Suburb nobody covers → nearby offered → pick one | `rejectedPlaces`, `nearbyPlaces` |
  | 8 | Gate type "none" → gate quantity must never be asked | `isMissing` conditional |
  | 9 | "none" answered to site conditions must not fill gateType | `isNegative()` |
  | 10 | Off-topic message mid-conversation | `offTopic`, and that it does not derail |
  | 11 | Existing price given → comparison intent → nothing beats it | `intent`, `beating`, `notCheaper` |
  | 12 | Brief nobody can quote → alternatives offered → pick one | `alternatives`, `alt:` prefix |

**Verify.** `npx vitest run` — all green, snapshot files written.

**Done when.** `tests/golden/__snapshots__/` exists and is committed. Running the suite twice in a
row produces no diff.

**Result.** 12 conversations, 12 snapshot files, 175 tests green. Two consecutive full runs produce
an identical checksum, and `CI=true` writes nothing. Every conversation was checked to actually
reach the state it claims — not merely to produce a snapshot:

| # | Verified |
|---|---|
| 1 | result, 20m x $110 = $2,200; `gateQty` never asked; field order exact |
| 2 | free text resolved via word-overlap and `heightKeyFrom`; $5,850 |
| 3 | material + length in one turn; volunteered `removal: "none"` refused |
| 4 | pages 2, 3, then wrap with "That's everything we cover" |
| 5 | height cleared alone, material untouched, finishes at 1.8m |
| 6 | "the blue one" -> which-one prompt; "lenght" reopens length |
| 7 | `noMatchReason: radius`, Berwick rejected, recovers to a Pakenham result |
| 8 | `gateQty` IS asked; 20x110 + 2x600 = $3,400 |
| 9 | `conditions: []` accepted, volunteered `gateType: "none"` refused |
| 10 | apology, nothing recorded, conversation resumes and finishes |
| 11 | `intent: compare_quote`, `noMatchReason: notCheaper`, no results shown |
| 12 | alternatives offered, `alt:colorbond:1.8m` moves both fields |

---

### [x] Step 2 — Prove the harness actually catches regressions — DONE

**Goal.** A safety net you have not tested is not a safety net.

**Do.** Deliberately break one thing at a time, confirm the snapshot fails, then revert:
- Reverse `FIELDS` in `src/client/vocab.ts:36` → conversations 1, 2, 8 must fail
- Change `PAGE_SIZE` to 2 in `src/client/formatResult.ts:20` → conversation 4 must fail
- Remove the `isNegative` check in `src/client/mergeAndDecide.ts:309` → conversation 9 must fail

**Verify.** Each break fails the expected conversation. `git checkout` after each.

**Done when.** All three breaks were caught. Working tree clean.

**Result.** All three caught, but only after the third one exposed a hole in Step 1.

| Break | Predicted | Actually failed |
|---|---|---|
| `FIELDS` reversed | 1, 2, 8 | **all 12** — field order reaches every conversation |
| `PAGE_SIZE` 3 -> 2 | 4 | **all 12** — every question turn renders options |
| `isNegative` removed | 9 | **nothing at first**, then exactly 3 and 9 |

**The hole this found.** Conversations 3 and 9 were passing for the wrong reason. `isNegative` only
ever engages when the word "none" is in what the customer actually wrote — `mentioned()`
(`mergeAndDecide.ts:258`) blocks the volunteered value on its own otherwise, which is precisely what
the comment at `mergeAndDecide.ts:272-280` says. Both conversations used "nothing tricky" / "nothing
to remove", so `mentioned()` refused the value and `isNegative` never ran. The guard looked covered
and was not.

Fixed by changing those two messages to "none of that" and "none to remove" — they carry the word,
so `mentioned()` passes and only `isNegative` can stop the value. Neither can be a bare "none",
because that is on screen and would take the tapped path without consulting the model at all.

**The lesson for Steps 3-11.** A green golden test is not proof a guard is protected. When a step's
"Watch for" note names a guard, break it deliberately and confirm the snapshot moves before trusting
that the step preserved it.

---

# Phase 1 — Make the content dynamic

Target shape. This is what `schema/{trade}` will hold by the end of this phase:

```jsonc
{
  "trade": "fencing",
  "schemaVersion": 2,
  "core":   { "materials": [...], "gateTypes": [...], "conditions": [...], "removes": [...] },
  "labels": { "materials": {...}, "gateTypes": {...}, "conditions": {...}, "removes": {...} },
  "extras": { "bamboo_screening": { "label": "Bamboo screening", "aliases": [...], "businessCount": 1 } },

  "fields": [
    { "key": "suburb", "type": "place", "title": "Suburb",
      "question": "Which suburb is the fence going in?" },

    { "key": "material", "type": "enum", "title": "Material",
      "question": "What type of fence are you after?",
      "source": "core.materials", "pageSize": 3 },

    { "key": "heightKey", "type": "measure", "unit": "m", "title": "Height",
      "question": "What height are you after?",
      "source": "core.heights", "options": ["1.2m","1.5m","1.8m","2.1m","0.9m","1.35m","2.4m"] },

    { "key": "lengthMeters", "type": "measure", "unit": "m", "title": "Length",
      "question": "How long is the fence?",
      "options": [10,15,20,25,30,40,50,60,80,100] },

    { "key": "removal", "type": "enum", "title": "Old fence",
      "question": "Is there an old fence to remove?",
      "source": "core.removes",
      "pinned": { "label": "Nothing to remove", "value": "none" } },

    { "key": "conditions", "type": "multiEnum", "title": "Site conditions",
      "question": "Anything tricky about the site?",
      "source": "core.conditions",
      "pinned": { "label": "Nothing tricky", "value": "none" } },

    { "key": "gateType", "type": "enum", "title": "Gate",
      "question": "Do you need any gates?",
      "source": "core.gateTypes",
      "pinned": { "label": "No gates", "value": "none" } },

    { "key": "gateQty", "type": "count", "title": "Gates",
      "question": "How many of those gates?",
      "dependsOn": { "field": "gateType", "notEquals": "none" } },

    { "key": "existingPrice", "type": "money", "asked": false }
  ]
}
```

Two things to notice. `type` values come from a closed set the code understands — the schema selects,
it never invents. And `dependsOn` is the data form of the hardcoded `gateQty` rule that lives in
`isMissing` today.

---

### [x] Step 3 — Create the field spec module (still hardcoded) — DONE

**Goal.** One place that describes every field, built by hand in TypeScript. No behaviour change.

**Files.** New: `src/client/fieldSpec.ts`.

**Do.**
- Define `FieldType = 'place' | 'enum' | 'multiEnum' | 'measure' | 'count' | 'money'`.
- Define `FieldSpec` matching the JSON above.
- Export `FENCING_FIELDS: FieldSpec[]`, hand-written to reproduce **exactly** what is scattered
  across `client/vocab.ts` (`FIELDS`, `LENGTHS`, `QUANTITIES`, `HEIGHT_FALLBACK`),
  `client/formatResult.ts` (`PINNED`, `FIELD_TITLES`, `PAGE_SIZE`) and `messages.ts` (`QUESTIONS`).
- **Nothing imports it yet.** This step only creates the file.

**Verify.** `npx tsc --noEmit && npx vitest run` — green, snapshots unmoved.

**Done when.** The file exists and a unit test asserts `FENCING_FIELDS` field keys, in order, equal
today's `FIELDS` array plus `existingPrice`.

**Result.** `src/client/fieldSpec.ts` plus `tests/unit/fieldSpec.test.ts` (9 assertions, checking the
spec against the originals in `vocab.ts`/`messages.ts` rather than a second hand-written copy).
184 tests green, golden snapshots unmoved, nothing imports it yet.

**Deviation from the plan, deliberate.** The type list gained `number` alongside `measure`. The plan
proposed inferring the difference from whether the options were strings or numbers, which is
implicit and fragile. They are genuinely different things: a `measure` keys a rate table and must be
normalised to the exact published form ("1800mm" and "6ft" both becoming "1.8m"), while a `number`
is a raw quantity that goes into arithmetic and must not be normalised at all.

`acceptsExtras` was also added, because only `material` recognises a one-business offering that has
no slug in the vocabulary (`mergeAndDecide.ts:24`). Inferring that from the field name is exactly
the kind of hardcoding this migration removes.

---

### [ ] Step 4 — `formatResult` reads titles, pinned and pageSize from the spec

**Goal.** Delete the first three hardcoded constants by reading them from `FieldSpec`.

**Files.** `src/client/formatResult.ts`.

**Do.** Replace uses of `FIELD_TITLES`, `PINNED` and `PAGE_SIZE` with lookups on the spec. Keep the
constants' values identical. Do not touch `buildOptions`' paging logic yet.

**Verify.** `npx vitest run` — **snapshots must not move**. If conversation 4 moves, `pageSize` was
read wrong.

---

### [ ] Step 5 — `sourcesFrom` reads its lists from the spec

**Goal.** The field → option-list mapping becomes data.

**Files.** `src/client/schema.ts` (`sourcesFrom`, `heightsFor`).

**Do.** Drive `sourcesFrom` from `spec.source` (a dotted path into the schema, e.g.
`core.materials`) and `spec.options` (a literal list). `heightsFor` keeps its material-keyed-map
handling; it now reads `spec.source` first and falls back to `spec.options`.

**Verify.** `npx vitest run` — snapshots unmoved.

**Watch for.** `Sources` is currently a fixed 7-key interface with fencing field names. Change it to
`Record<string, (string | number)[]>` in this step; the compiler will find every consumer.

---

### [ ] Step 6 — `validate()` dispatches on type, not on field name

**Goal.** The most important refactor in the phase. This is what lets a trade the code has never
heard of validate its own answers.

**Files.** `src/client/mergeAndDecide.ts`.

**Do.** Replace the `switch (field)` at `mergeAndDecide.ts:34` with `switch (spec.type)`:

| type | implementation (all already exist in `fuzzyMatch.ts`) |
|---|---|
| `place` | always `null` — only the geocoded picker fills it |
| `enum` | `oneOf(value, list, labelFor)`, plus the `none` short-circuit when the field has a `pinned` |
| `multiEnum` | `conditionsFrom(value, list, labelFor)` |
| `measure` | `heightKeyFrom` when `unit` is present and the options are keyed strings, else `positiveNumber` |
| `count` | `Math.round(positiveNumber(value))` |
| `money` | `positiveNumber`, and `null` when not `> 0` |

**Verify.** `npx vitest run` — snapshots unmoved. This step has the highest chance of moving them;
if it does, the type mapping is wrong, not the snapshot.

**Watch for.** The `none` handling currently lives in the `removal` and `gateType` cases and checks
`NOTHING.test(...)`. It must move to "this field has a `pinned` value" rather than "this field is
named removal or gateType".

---

### [ ] Step 7 — `isMissing` reads `dependsOn`

**Goal.** The gate-quantity rule becomes data, so any trade can express "only ask B if A is not X".

**Files.** `src/client/mergeAndDecide.ts` (`isMissing`, ~line 381).

**Do.** Replace the hardcoded `if (field === 'gateQty')` with a generic `dependsOn` evaluation.
Support `notEquals` and `equals`. Keep `suburb`'s special case (it tests `place`, not the checklist
value) — that is not a dependency, it is a different source of truth.

**Verify.** `npx vitest run` — **conversation 8 is the one that matters.** If gate quantity gets
asked when the customer said "no gates", this step is wrong.

---

### [ ] Step 8 — Field order comes from the spec

**Goal.** Delete `FIELDS` and `ALL_FIELDS` from `client/vocab.ts`.

**Files.** `src/client/vocab.ts`, `src/client/mergeAndDecide.ts`.

**Do.** `missing`/`nextField` iterate the spec array in order. `ALL_FIELDS` becomes "every spec
entry"; the asked/not-asked distinction becomes `spec.asked !== false` (that is what makes
`existingPrice` merged but never asked).

**Verify.** `npx vitest run` — snapshots unmoved. Conversations 1, 2 and 8 cover order.

---

### [ ] Step 9 — Widen the types

**Goal.** `Checklist` stops being a fencing-shaped interface.

**Files.** `src/client/schemas.ts`, and everything the compiler then complains about.

**Do.**
- `ChecklistField` → `string`
- `Checklist` → `Record<string, unknown> & { _ui?: UiState }`
- `ChecklistDisplay` → `Record<string, ChecklistDisplayEntry>`
- Keep `UiState` exactly as it is. Do not trim it, do not restructure it.

**Verify.** `npx tsc --noEmit` will produce a long list — work through it. Then `npx vitest run`,
snapshots unmoved.

**Watch for.** This is the widest-blast-radius step in the plan and it is where type safety is
genuinely reduced. Compensate by making the spec lookup the only way to reach a field: a helper
`fieldSpec(schema, key)` that throws on an unknown key means a typo still fails loudly.

---

### [ ] Step 10 — Move the spec into Firestore

**Goal.** The actual dynamic switch. Everything before this was preparation.

**Files.** `src/client/schema.ts`, `src/firestore.store.ts`, `src/store.ts`.

**Do.**
- Add `fields?: FieldSpec[]` to `StoredTradeSchema`.
- `loadTradeSchema` reads `stored.fields` and falls back to `FENCING_FIELDS` when absent — the same
  fallback pattern `fallbackSchema` already uses for `core`/`labels`/`questions`, and for the same
  reason: a Firestore outage must degrade, never break.
- `syncTradeSchema` seeds `fields` **only when the document has none**, exactly like `core`:
  `if (!snap.exists || !snap.get('fields')) seed.fields = FENCING_FIELDS;`
- Bump `SCHEMA_VERSION` to 2.
- Validate the loaded spec: unknown `type`, unknown `source` path, duplicate `key`, or a
  `dependsOn` pointing at a field that does not exist → log a warning and fall back to the compiled
  spec. **A bad document must never reach a customer.**

**Verify.** `npx vitest run` — snapshots unmoved (memory store returns no `fields`, so the fallback
runs and behaviour is identical). Then a manual check against real Firestore:

```
1. Boot with STORE=firestore, confirm schema/fencing now has a fields array
2. In the Firestore console, change one question's wording
3. Wait 5 minutes (or restart), start a chat, confirm the new wording appears
4. No deploy happened
```

**Done when.** Step 3 of that manual check passes. **This is the milestone the whole phase exists
for.**

---

### [ ] Step 11 — Extend the drift warning to cover fields

**Goal.** `warnOnSchemaDrift` (`firestore.store.ts:364`) already catches a published `core` value
that code cannot quote. Give `fields` the same protection.

**Do.** Warn when a published field references a `source` that is empty, when a `type` is unknown,
and when a field present in the compiled spec is missing from the published one.

**Verify.** Unit test with a deliberately broken spec; assert the warning and the fallback.

---

# Phase 2 — Voice, and the three things that block launch

Do not start this phase until Phase 1's step 10 manual check has passed. Voice built on the
hardcoded engine would have to be written twice.

### [ ] Step 12 — Parallelise the matcher

**Files.** `src/client/matcher.ts:92-97`.

**Do.** Replace the serial `for...of` + `await` with batched `Promise.all` (25 at a time — an
unbounded `Promise.all` over hundreds of businesses exhausts Vercel's 1,024 shared file
descriptors).

Preserve exactly:
- Every `dropped.*` bucket, including that `errored` counts both a throw **and** a missing/no-pricing
  extract
- `covered` receiving entries for businesses later dropped for radius or exclusion — that array is
  what offers nearby suburbs when nobody covers the customer
- Deterministic ordering: build results in candidate index order, then sort by distance as today

**Verify.** `npx vitest run` — conversations 1, 7 and 12 cover matching. Snapshots unmoved.

**Also.** Add a `Date.now()` pair around the `matchBusinesses` call in `client/controller.ts:98` and
log it with `state.needsMatcher`, so the improvement is measurable.

---

### [ ] Step 13 — Shared spend cap

**Goal.** On serverless, `spend.ts` and both limiters in `limits.ts` are per-instance, so the
ceiling does not actually exist. Voice doubles the traffic against it.

**Files.** `src/client/spend.ts`.

**Do.** Firestore doc with an atomic increment. Keep the in-process counter as a fast path in front
of it, so the common case costs nothing.

**Verify.** Unit test that two independent "instances" share one ceiling.

---

### [ ] Step 14 — Server-generated session ids, and `saveChatResult`

**Goal.** Write the final result somewhere the frontend can listen to — without leaking it.

**Security decision, settled.** `sessionId` is generated **server-side** with
`crypto.randomUUID()`. Today it is any client-supplied string of length ≥ 1
(`client/schemas.ts:14`), so `quoteResults/{sessionId}` with a readable rule would let anyone who
guesses or learns an id read a stranger's quote — business names, real prices, their suburb, and
the quote they already held.

**Do.**
- New endpoint returning a fresh session id; `chatBody.sessionId` accepts only a UUID.
- `quoteResults/{sessionId}` — top level, not under `businesses/{uid}`, because this document
  belongs to a customer session and no business owns it.
- Write only on `type === 'result'`. Include `results`, `comparison`, `alternatives`, `checklist`,
  `noMatchReason`, `displayState`, `updatedAt`.
- Note `type === 'result'` also covers failures (`priceAndRank.ts:176` `fail()`), so the frontend
  must handle a result document with an empty `results` array and a `noMatchReason`.
- Add the `firestore.rules` block. Today the file covers only `businesses/{uid}/services/**`, so
  this path is deny-by-default and the frontend cannot read it until the rule exists.

**Verify.** Integration test: complete a conversation, assert the document exists with the expected
shape. Assert nothing is written on a question or confirmation turn.

---

### [ ] Step 15 — Voice adapter: session store and `matchSpokenToOption`

**Files.** New: `src/client/voice/sessions.ts`, `src/client/voice/matchSpoken.ts`.

**Do.**
- Session store in **Firestore from day one** — `voiceSessions/{sessionId}` → `{ checklist, place,
  updatedAt }`, 30-minute TTL. In-memory would lose every in-flight call on a serverless cold start,
  and the failure would look random.
- Store `_ui` **whole**. Never trim it. `place` gone means the suburb question reopens;
  `rejectedPlaces` gone means an uncovered suburb loops forever; `lastValues` gone kills the
  zero-LLM fast path.
- `matchSpokenToOption(spoken, lastValues)` must return a value that is **exactly** an element of
  `lastValues`, or `null`. A near-miss silently records an answer the customer never gave, which is
  far worse than asking again. Handle spoken letters ("A", "option B", "the second one") and spoken
  labels. Drop `__other__` — it is a UI sentinel with no meaning in speech.

**Verify.** Unit tests for `matchSpokenToOption`, including the cases where it must return `null`.

---

### [ ] Step 16 — `toSpeech` and the voice route

**Files.** New: `src/client/voice/toSpeech.ts`, `src/client/voice/route.ts`.

**Do.** `POST /api/v1/voice/turn` → `{ speakText, isDone }`. The route is thin: look up session,
`matchSpokenToOption(...) ?? spokenText`, call `runFencingChat`, store the response's checklist
whole, `saveChatResult` on result, return speech.

`toSpeech` rules:
- No options → just `response.message`
- With options → message, then `"Option A, <label>. Option B, <label>."`, then an invitation to
  answer freely. Drop `__other__`.
- `expects === 'suburb'` → **do not read a suburb list or try to capture one by voice.** Say to pick
  it on screen and wait. `isMissing('suburb')` tests the geocoded `place` object
  (`mergeAndDecide.ts:382`); a spoken suburb string will never satisfy it and will loop forever.
- `type === 'result'` → narrate conversationally, not as a data dump
- Numbers in spoken form: "one point eight metres", not "1.8m"

**Verify.** Drive a full conversation through the voice route with Postman — no Retell needed. Then
a test asserting **zero** model calls on a spoken-option turn, by injecting a counting `AiClient`
through `deps.ai` (do not assert on log lines — that is brittle).

---

### [ ] Step 17 — Retell agent, frontend, `VOICE.md`

**Do.** The Retell conversation flow JSON, the `create-call` token endpoint (the Retell API key
stays server-side), the mic wiring, and setup docs.

**Note.** The React frontend is **not in this repo** — it lives elsewhere. This step produces the
backend endpoint plus a contract document for the frontend developer, unless that repo is opened
here too.

**Verify.** One real test call. Confirm whether Retell's `static_text` node interpolates
`{{speak_text}}`; if not, use a prompt node saying "Say exactly this, word for word". Confirm the
agent never speaks anything the backend did not send.

---

# Phase 3 — Multi-trade

### [ ] Step 18 — Extras promotion ladder

**Goal.** The rule from the top of this file, made real.

**Files.** `src/firestore.store.ts` (`mergeTradeExtras`), plus a small admin path.

**Do.**
- Before creating a new extras slug, fuzzy-match the incoming label against every existing slug
  **and** its aliases. A match means increment and add the alias, never create.
- Promotion to `core` at `businessCount >= 3`, or by an explicit admin action. Promotion adds to
  `core` and adds the label to `labels` — it never renames or removes anything.
- Log every promotion. This is the one place vocabulary can grow, so it should be visible.

**Verify.** Unit tests: same offering phrased three different ways lands on one slug with three
aliases and `businessCount: 3`, then promotes.

---

### [ ] Step 19 — Closed set of pricing models

**Goal.** The part the "everything dynamic" idea most underestimates. Fencing sells by the metre;
tiling and decking by m²; a retaining wall by m² of face. That is a **formula** difference, not a
vocabulary one, and `VerifiedPricing` (`src/verify.ts:31`) is fencing-shaped in the type system.

**Do.** Implement `linear`, `area` and `perItem` in code. Schema selects one and names the fields it
reads:

```jsonc
{
  "pricingModel": "linear",
  "quantityField": "lengthMeters",
  "rateKeys": ["material", "heightKey"],
  "modifiers": ["removal", "siteConditions"],
  "fixedItems": ["gates"],
  "minimumCharge": true
}
```

A trade that fits one of the three is a document. A trade that fits none is a new model in code —
which will be rare, and is the correct place for that decision to live. **The model never writes a
formula** (`CLAUDE.md` non-negotiable #4).

**Verify.** Golden conversations 1, 11 and 12 must not move — fencing goes through `linear` and must
produce byte-identical quotes.

---

### [ ] Step 20 — Trade detection

**Do.** Drop the hardcoded `TRADES` as the source of truth: list `schema/*` from Firestore. When the
customer has not named a trade, ask, offering what is actually published. Keep `TRADES` in
`vocab.ts` as the compiled fallback for a Firestore outage, exactly as `fallbackSchema` does today.

**Verify.** A second trade document makes the chat offer two trades with no deploy.

---

### [ ] Step 21 — Second trade, end to end

**Goal.** The proof the whole plan was for.

**Do.** Add a trade **entirely as Firestore documents** — schema with its own `fields`, its own
`core`, its own `pricingModel`. Write zero TypeScript.

**Verify.** A full conversation in the new trade produces a correct quote. If any code change was
needed, note exactly what and why — that is the honest remaining boundary.

---

## Per-step commit convention

One step, one commit. Message states the step number, and explicitly whether snapshots moved:

```
Step 6: dispatch validate() on field type rather than field name

Golden snapshots unmoved — behaviour identical.
```

If snapshots did move, say which conversations and why, in the message. A moved snapshot with no
explanation is the thing this whole plan is designed to prevent.

## If a step fails

Do not patch forward. `git checkout` the step, re-read the "Watch for" note, and try again. The
steps are sized so that starting one over costs an hour, not a day.
