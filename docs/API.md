# API reference

**Two routes.** Everything the business side does goes to one of them, and the `action` field picks
the job — so the frontend has one URL to map, not five.

```bash
cp .env.example .env
npm run dev            # http://localhost:8787
```

No auth, no API key, no Firebase. `AI_PROVIDER=mock` is a deterministic offline reader.

---

## The two response shapes

```jsonc
// success
{ "ok": true,  "requestId": "a618cebf…", "data": { … }, "meta": { … } }

// failure
{ "ok": false, "requestId": "45e092b3…", "error": { "code": "unprocessable", "message": "…" } }
```

`requestId` also comes back as an `x-request-id` header and appears in the server log for that
request — that is how you find what happened.

**A rejected price list is a success**, `200` with `data.approved: false`. The business did nothing
wrong by sending an incomplete list. Only a broken request or a broken pipeline is `ok: false`.

---

## `GET /api/v1/health`

```jsonc
{ "ok": true, "data": {
  "status": "ok", "uptime": 78.2,
  "provider": "mock", "model": "mock",          // "mock" = nothing sent to OpenAI, nothing charged
  "prompts": { "review": 4656, "extraction": 1934 } } }
```

## `POST /api/v1/business`

One body, five actions:

```jsonc
{
  "action": "submit",             // submit | profile | confirm | review | extract. Default: submit
  "businessUid": "demo-1",        // who this is. Default: "test-business"
  "trade": "fencing",             // default: "fencing" (the only trade today)
  "text": "…their price list…"    // submit / review / extract only
}
```

`text` must clear the mechanical checks — at least 40 characters, at most 60,000, and at least one
digit. Those run **before** any model call, so junk costs nothing.

> `businessUid` is taken at face value because there is no auth yet. When Firebase is wired up it
> will come from the verified token instead, and the body field will be ignored.

---

### `action: "submit"` — the main one

This is the button on the frontend: trade, a text box, and Send for approval.

#### The response has two blocks

```jsonc
"data": {
  "approved": false,
  "status": "unverified",
  "business": { … },   // what the tradesperson's screen shows
  "admin":    { … }    // the decision and how it was reached
}
```

**There is no markdown anywhere.** Both screens render the same structured fields their own way -
the business screen and the admin screen are different views of one answer, not one page of prose
that has to serve both.

`meta` sits outside both: request telemetry (which model, what it cost, how long each stage took).

#### Approved

```jsonc
{ "ok": true, "data": {
    "approved": true,
    "status": "verified",              // "unverified" if nothing survived verification
    "business": {
      "opening": "Your details have been approved. Below is what we have saved from them.",
      "pricing": {
        "gstIncluded": true,
        "enabledMaterials": ["timber_pine", "colorbond"],
        "rates": { "timber_pine": { "1.5m": 79, "1.8m": 85 }, "colorbond": { "1.8m": 110 } },
        "removals": [], "gates": [], "siteConditions": [],
        "serviceArea": { "baseLocation": "Berwick", "radiusKm": 30, "excludedAreas": [] },
        "minimumCharge": 850
      },
      "capabilities": { "businessName": "…", "tags": [], "extras": [], "inclusions": [], "exclusions": [] },
      "ratesSaved": 20,
      "notUsed": ["…anything we could not keep, in plain English…"],
      "labels": { "timber_pine": "Treated pine", "driveway_double": "Double driveway gate", "…": "…" },
      "nextStep": "Check the figures. If they are right, confirm them and your profile goes live …"
    },
    "admin": {
      "submissionId": "cdba23c1…",
      "decision": "approved",
      "coverage": { "rates": 20, "removals": 0, "gates": 0, "siteConditions": 0, "extras": 0, "tags": 0, "unmapped": 1 },
      "textChars": 3300
    }
  },
  "meta": { "trade": "fencing", "model": "gpt-5.6-terra", "store": "memory", "schemaVersion": 1,
            "stages": [ { "name": "review", "ms": 4210, "tokensIn": 4102, "tokensOut": 1180,
                          "retries": 0, "costUsd": 0.0223 }, { "name": "extraction", "…": "…" } ],
            "costUsd": 0.0581 } }
```

The approved screen is: `opening`, their fields from `pricing` / `capabilities`, `notUsed`, and
`nextStep` beside the Confirm and Contact buttons.

**`labels` is the slug → human-label map** (`timber_pine` → `Treated pine`). It is sent with the
answer so the frontend never keeps its own copy — a second copy drifts from `vocab.ts` the first
time a value is added, and nothing anywhere reports the mismatch; the screen just starts showing a
raw slug.

#### Rejected

```jsonc
{ "ok": true, "data": {
    "approved": false,
    "status": "unverified",
    "business": {
      "opening": "We have been through the details you sent. A few things need updating before your profile can go live.",
      "fixes": [ { "kind": "missing", "what": "Say whether your prices include GST.",
                   "example": "All prices include GST" },
                 { "kind": "unclear", "what": "Give one set price per metre for each type and height…",
                   "example": "Colorbond 1.8m - $110/m (your figure)" } ],
      "nextStep": "Update your details and send them through again for approval. If something above does not look right, use the contact button below …"
    },
    "admin": {
      "submissionId": "41c9e82d…",
      "decision": "rejected",
      "fixCounts": { "missing": 2, "unclear": 1 },
      "textChars": 3290
    }
  },
  "meta": { "…one stage only — extraction never ran…" } }
```

Render it as: `opening`, then the fixes grouped by `kind` under two headings — "What we still need"
for `missing`, "What needs to be clearer" for `unclear` — then `nextStep` beside the two buttons.

**Why `kind` exists.** `missing` means they never said it, so they go and find the number. `unclear`
means they said it but not in a form we can quote from, so they go and rewrite the line. Two
different jobs; one heading over both is what makes feedback feel vague.

**Only the fixes are written by the model.** Its whole output is `{ approved, fixes[] }`. `opening`
and `nextStep` are fixed text in `src/messages.ts` — identical every time, because they name what
the buttons underneath actually do.

---

### `action: "profile"` — what is stored right now

```jsonc
{ "ok": true, "data": {
    "pricing": { "…", "trade": "fencing", "status": "verified", "schemaVersion": 1,
                 "updatedAt": "2026-08-19T06:42:15.526Z", "confirmedAt": null },
    "capabilities": { "…", "unmapped": [ … ] },
    "submissions": [ { "id": "fd4ec6b6…", "approved": true, "status": "verified",
                       "ratesSaved": 20, "createdAt": "…" },
                     { "id": "ce918c8b…", "approved": false, "status": "unverified", "ratesSaved": 0, "…": "…" } ]
  },
  "meta": { "trade": "fencing", "live": false } }
```

`404` if this business has never had an approved submission. Rejected attempts still appear in
`submissions` — history records every attempt, the profile records only what was approved.

### `action: "confirm"` — makes the prices live

No `text` needed. This is the business saying "yes, these figures are right", and it is **the only
thing that makes prices live** — the pipeline never sets `confirmedAt`.

```jsonc
{ "ok": true, "data": { "pricing": { "status": "confirmed", "confirmedAt": "…" }, "alreadyConfirmed": false },
  "meta": { "trade": "fencing", "live": true } }
```

- Calling it twice is safe: `alreadyConfirmed: true`.
- Confirming `unverified` pricing → `400`.
- **Submitting a new price list clears the confirmation.** The business confirms the new figures.

### `action: "review"` / `"extract"` — one stage at a time

`ENABLE_DEV_ROUTES=true` only, nothing is stored. These exist because you cannot improve a prompt
you can only run end to end.

- `review` → `data.review`, the raw approve/reject decision before any report is built.
- `extract` → `data.raw` (exactly what the model returned) next to `data.verified` (what survived
  quote-matching, vocabulary and bounds). The difference between them is what the checks caught.

---

## Error codes

| code | HTTP | when |
|---|---|---|
| `bad_request` | 400 | body failed validation, or confirming unverified pricing. `error.details` names the field |
| `not_found` | 404 | no profile for this business yet, or an action that is switched off |
| `unprocessable` | 422 | text empty, under 40 characters, or containing no digit |
| `payload_too_large` | 413 | text over 60,000 characters |
| `rate_limited` | 429 | more than 40 submissions in an hour from one address |
| `cost_limit` | 429 | the submission would cost more than `MAX_COST_PER_REQUEST_USD` |
| `upstream_timeout` | 504 | the model did not answer in time |
| `upstream_unavailable` | 502 | OpenAI error after one retry |
| `schema_violation` | 502 | the model's output failed validation twice — the prompt is wrong, not the model |
| `internal_error` | 500 | anything unclassified |

---

## Testing in Postman

1. Import `docs/postman/quotemy-ai.postman_collection.json`.
2. Variables: `baseUrl = http://localhost:8787/api/v1`, `businessUid = postman-biz-1`.
3. Run the folders top to bottom.

| Folder | What you should see |
|---|---|
| **Health** | `ok: true`, `provider: mock` |
| **1. Send for approval** | good list → `approved: true` with a rates table in `data.report`. Vague list → `approved: false` with the missing / unclear sections |
| **2. Read back and confirm** | `profile` shows `confirmedAt: null`, `meta.live: false`; after `confirm`, `status: confirmed`, `live: true` |
| **3. Input handling** | 422, 422, 422, 400 — each with a readable message. The injection request comes back as a normal review, the injected line treated as data |
| **4. One stage at a time** | `review` and `extract` on their own |

Worth trying by hand — these are the parts that matter:

- Change `businessUid` and call `profile`: `404`. Two businesses never see each other's data.
- Change one rate to `$8500 per metre`. It is **dropped** by the bounds check even though that
  sentence is genuinely in your text, and `couldNotUnderstand` says why.
- Change a rate's number but leave the rest of the line alone, then check `ratesSaved` — that is
  quote verification working.
- Submit → confirm → submit again: `confirmedAt` is back to `null`.
- Restart the server, then `profile`: `404`. Storage is in-memory today; Firestore replaces that.

## Two limits while testing

1. **`AI_PROVIDER=mock` is a rule-based reader, not intelligence.** It reads firm `$N per metre`
   lines, GST, minimum charge and a travel radius, and says so honestly in `couldNotUnderstand` about
   the rest. It proves the plumbing, not extraction quality. For real behaviour set
   `AI_PROVIDER=openai` and an `OPENAI_API_KEY`.
2. **Text only.** PDFs, images and Word files are the next piece of work (`docs/FLOW.md` §3).
