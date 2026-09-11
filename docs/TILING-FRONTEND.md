# Adding a second trade — what the frontend has to change

Companion to `docs/FRONTEND.md`, which stays correct for everything not listed here. This file
covers only what changes when the product stops being fencing-only.

Written while the backend was being made per-trade (branch `tiling-multi-trade`, steps A0–A8).
**Everything in section 1 is already live on that branch and safe to build against now.** Section 2
is waiting on the client's tiling SOP and will be filled in once that lands — do not guess it.

---

## 1. Settled — build against this today

### 1.1 The chat endpoint was renamed, and the old one still works

```
POST /api/v1/client/chat            ← use this
POST /api/v1/client/fencing-chat    ← still answers, identically, for ever
```

Same body, same response, same handler. Nothing breaks if you migrate late. There is a test that
both paths answer.

### 1.2 The chat body takes an optional `trade`

```jsonc
{
  "trade": "fencing",        // NEW, optional. Omitted = "fencing", exactly as before.
  "message": "…",
  "sessionId": "…",
  "place": "…",              // JSON text, unchanged
  "knownChecklist": "…"      // JSON text, unchanged
}
```

Send it once per conversation and keep sending it every turn — the server holds no session state
between calls, which is unchanged from today.

The response now echoes `trade` as the trade that actually answered, rather than the literal
`"fencing"` it always was. Read it rather than assuming.

### 1.3 The business payload already had `trade` — it now means something

`POST /api/v1/business` has always accepted `trade`, defaulting to `fencing`. It now selects the
trade's own publish rules, its own extraction, and its own vocabulary. So the onboarding screen
needs a **trade picker**, and whatever it picks must be sent on every call for that business:
`submit`, `profile` and `confirm`.

Storage paths are already per trade and need no change:

```
businesses/{uid}/services/{trade}/…
```

### 1.4 Nothing about the customer's result document changes

`quoteResults/{resultId}` and `firestore.rules` are trade-agnostic already. The listener you have
keeps working.

### 1.5 The checklist panel is already generic — do not hardcode fields

This matters more than anything else here. The questions, their order, their options and their
titles all come from the server per trade, and tiling's are different from fencing's. If your brief
panel has `material`, `heightKey`, `gateType` written into it anywhere, that is the work.

Everything you need is already in each response:

| field | what it is |
|---|---|
| `checklistDisplay` | every answered field, keyed, with its human title and label |
| `checklistAnswered` | in order, what has been answered |
| `checklistPending` | in order, what is still to come, with titles |
| `options[]` | the choices for the current question, `{label, value}` |
| `message` | the question itself, already worded |

Render those. A trade the frontend has never heard of should render correctly with no deploy — that
is the whole design, and it is what makes tiling cheap on your side.

---

## 2. Settled since the SOP arrived

The tiling SOP (`SOPS/Paky Tiles Master Business Knowledge Base.pdf`) answered the three open
questions, and tiling is now live on both sides.

### 2.0 What a tiling conversation asks

Eight questions, the same count as fencing, and **you do not need to know any of them** — they come
down the wire like fencing's do (§1.5). Listed here only so the screens make sense:

```
suburb → jobType → tileType → areaSqm → supply → removal → waterproofing → conditions
```

- **`jobType` leads**, because in this trade the room is the job: a bathroom is floor and wall and
  waterproofing at once, and tilers publish one price for it.
- **`areaSqm` is still asked** after it, because plenty of businesses publish only per-m² rates and
  quote that same bathroom by the metre.
- **`supply`** is "who is buying the tiles" — both models are real and the labour rate is the same
  either way.

### 2.1 Which trades to put on the picker

```
GET /api/v1/client/trades   →  { "ok": true, "data": [ { "trade": "fencing", "label": "fencing" },
                                                       { "trade": "tiling",  "label": "tiling"  } ] }
```

Read this rather than hardcoding a list: it returns what is actually **published**, so a trade the
backend can serve but nobody has onboarded into yet is never offered to a customer who would then
match nobody.

### 2.1a The chat also works out the trade on its own

You do not have to send `trade`, and the chat is no longer fencing-by-default. It decides in this
order:

1. **`trade` in the body** — you said, and you win. Keep sending it if you have a picker.
2. **What this conversation already settled** — held server-side in `_ui`, so it survives a turn
   where you forget.
3. **The customer's own words** — "I need a fence quote" routes to fencing, "my bathroom needs
   tiling" routes to tiling. Most people say it in their opening sentence.
4. **Otherwise it asks**, and this is the one turn where the response looks different:

```jsonc
{ "type": "question",
  "trade": null,                                   // ← null ONLY here: nothing has answered yet
  "message": "Are you looking for Fencing or Tiling services?",
  "options": [ { "label": "Fencing", "value": "fencing" },
               { "label": "Tiling",  "value": "tiling"  } ] }
```

Render it like any other question — the values are what to send back. A message naming both jobs
gets a slightly different sentence ("Sounds like there might be more than one job there…"), same
shape.

**Two things to handle:** `trade` can be `null` on that one turn, and the turn records nothing, so
the `checklist` comes back exactly as you sent it.

### 2.2 The business confirm screen — the real remaining work

Today's screen renders fencing's shape: material × height × $/m, gates as items, removal per metre.
Tiling's verified shape is genuinely different, and now exists:

```jsonc
{
  "supplyModels": ["supply_and_install", "labour_only"],
  "enabledJobTypes": ["floor_only", "bathroom"],
  // keyed by job; a row's tileType is null when the price covers any tile
  "rates": { "floor_only": [ { "tileType": null,        "price": 65,   "unit": "per_sqm" },
                             { "tileType": "porcelain", "price": 72,   "unit": "per_sqm" } ],
             "bathroom":   [ { "tileType": null,        "price": 4850, "unit": "per_job" } ] },
  "tileSupply":    [ { "label": "Urban Grey Porcelain 600x600", "pricePerSqm": 45 } ],
  "prep":          [ { "type": "floor_levelling", "price": 650, "unit": "per_job" } ],
  "removals":      [ { "removes": "ceramic", "pricePerSqm": 45 } ],
  "waterproofing": [ { "area": "bathroom", "price": 950 } ],
  "siteConditions":[ { "condition": "second_storey", "extraPerSqm": null, "extraPercent": 10 } ],
  "minimumCharge": 350, "callOutFee": 95, "travelFee": 75
}
```

**Read `unit` on every rate row.** It is `per_sqm` or `per_job`, and the same table holds both — a
$4,850 bathroom package is one price, not a price per square metre.

Two ways to build it, still to decide together:

- **Per-trade renderers.** Simple, honest, one more component per trade.
- **Server-described sections.** The response describes what to render; one renderer for ever.

**No price goes live without this screen.** A business explicitly confirming its figures is a
non-negotiable (`CLAUDE.md`), so this cannot be skipped for tiling to launch.

### 2.3 `labels` is flat, and for tiling that is lossy

The response's `labels` map is now per trade — a tiler gets tiling's words, which was a bug fixed
while building this. One thing to know: tiling's slugs **repeat across groups**. `bathroom` is both
a job and a wet area; `ceramic` is both a tile and something being taken up. Flattened, the factual
naming wins, so `bathroom` reads "Bathroom".

If you build per-trade renderers, prefer rendering each section from its own group in
`schema/{trade}.labels` rather than from the flat map.

### 2.4 The unit on result cards

Fencing shows `$/m`. Tiling shows `$/m²`. The wire field names stay `ratePerMeter` and
`avgRatePerMeter` — they are what you already read, and renaming them would break the shipped app to
improve a name — but for tiling they carry a **per square metre** figure.

**Settled since — the server now sends `unit`** (`"m" | "m2" | "item"`) on every response. Render
whatever it says and do not map the trade slug yourself. See `docs/KITCHEN-FRONTEND.md` §4.1, which
is where it is documented, because kitchen is what made it worth doing.

---

## 3. What is NOT changing

- The two-panel approved/rejected onboarding flow, and every field in it.
- `pending → verified/unverified → confirmed`, and that `confirmedAt` is only ever set by the
  business confirming on your screen.
- Error envelopes, limits, upload handling, the voice endpoints.
- Anything in `docs/FRONTEND.md` not contradicted above.
