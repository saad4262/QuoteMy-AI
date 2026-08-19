# API reference — how to test every route

Eight routes: six normal, two that only exist for prompt tuning. Everything below was captured from
a running server, not written from memory.

```bash
cp .env.example .env
npm run dev            # http://localhost:8787
```

Default settings mean **no API key and no Firebase are needed**: `AI_PROVIDER=mock` (offline reader),
`REQUIRE_AUTH=false` (an `x-debug-uid` header stands in for a Firebase token).

---

## The two response shapes

Every response in this API is one of these two. There is no third.

```jsonc
// success
{
  "ok": true,
  "requestId": "a618cebf-1329-46fe-87de-1b8188ee4ec1",
  "data": { },        // what you asked for
  "meta": { }         // how it was produced: model, cost, timings, coverage
}

// failure
{
  "ok": false,
  "requestId": "45e092b3-fec8-44e8-9511-bacf82354f18",
  "error": { "code": "unprocessable", "message": "Send your pricing details and we will take a look" }
}
```

`requestId` is also returned as an `x-request-id` header and appears in the server log for that
request. When something looks wrong, that id is how you find it.

**A rejected price list is a success, not an error** — `200` with `data.approved: false`. The
business did nothing wrong by sending an incomplete list. Only a broken request or a broken
pipeline produces `ok: false`.

---

## Every request needs identity

| | |
|---|---|
| Now (`REQUIRE_AUTH=false`) | header `x-debug-uid: any-business-id` |
| Later (`REQUIRE_AUTH=true`) | header `Authorization: Bearer <firebase id token>` |

`businessUid` is **never** read from the body. Send it in the body and it is ignored — that is
deliberate, and there is a test for it. Whatever `x-debug-uid` you use is the "business" whose data
you are reading and writing, so use different values to simulate different businesses.

---

## 1. `GET /api/v1/health`

No auth. Is the server up.

```jsonc
{ "ok": true, "requestId": "…", "data": { "status": "ok", "uptime": 327.01 } }
```

## 2. `GET /api/v1/ready`

No auth. Which model and provider are actually live, and how big the prompts are.

```jsonc
{ "ok": true, "requestId": "…",
  "data": { "status": "ok", "provider": "mock", "model": "mock",
            "prompts": { "review": 4656, "extraction": 1934 } } }
```

If `provider` says `mock`, nothing is being sent to OpenAI and nothing is being charged.

## 3. `GET /api/v1/vocab/:trade`

No auth. The closed lists. **The frontend should render its tick-boxes from this endpoint**, never
from a hand-copied list — that is how the two stay in step.

```jsonc
{ "ok": true, "data": {
  "trade": "fencing",
  "materials": ["timber_pine","timber_hardwood","colorbond","aluminium","pool_aluminium","pool_glass","chainmesh","rural_wire"],
  "gateTypes": ["pedestrian_single","driveway_double","driveway_sliding","motor_automation"],
  "conditions": ["sloped","rock","restricted_access","hand_dig"],
  "removes": ["timber","metal","any"],
  "units": ["per_metre","per_item","per_job","per_sqm"],
  "tags": ["custom-gates","steep-blocks","pool-compliant","rural-capable","own-installers","insured","glass-capable","automation"],
  "bounds": { "pricePerMetre": {"min":0,"max":2000}, "price": {"min":0,"max":100000},
              "heightM": {"min":0.3,"max":4}, "radiusKm": {"min":0,"max":500} } } }
```

An unknown trade returns `404 not_found` in the standard error shape.

## 4. `POST /api/v1/business/onboarding` — the main one

**Request**

```jsonc
// headers: Content-Type: application/json, x-debug-uid: demo
{
  "trade": "fencing",     // optional, defaults to "fencing". Only "fencing" is valid today
  "text": "…the business's price list, pasted as they wrote it…"
}
```

`text` must survive the mechanical checks: at least 40 characters, at most 60,000, and it has to
contain at least one digit. Those run **before** any model call, so a junk submission costs nothing.

### Response A — approved

```jsonc
{
  "ok": true,
  "requestId": "…",
  "data": {
    "approved": true,
    "status": "verified",              // "unverified" if nothing survived verification
    "report": "markdown — show this to the business",
    "reportWordCount": 148,
    "pricing": {
      "gstIncluded": true,
      "enabledMaterials": ["timber_pine", "colorbond"],
      "rates": { "timber_pine": { "1.5m": 79, "1.8m": 85 }, "colorbond": { "1.8m": 110 } },
      "removals": [], "gates": [], "siteConditions": [],
      "serviceArea": { "baseLocation": "Berwick", "radiusKm": 30, "excludedAreas": [] },
      "minimumCharge": 850
    },
    "capabilities": { "businessName": "Southeast Fencing", "tags": [], "extras": [], "inclusions": [], "exclusions": [] },
    "couldNotUnderstand": ["…anything we could not store, in plain English…"],
    "ratesSaved": 3
  },
  "meta": {
    "trade": "fencing", "model": "mock", "store": "memory", "schemaVersion": 1,
    "stages": [
      { "name": "review",     "ms": 1, "tokensIn": 4751, "tokensOut": 0, "retries": 0, "costUsd": 0 },
      { "name": "extraction", "ms": 1, "tokensIn": 2029, "tokensOut": 0, "retries": 0, "costUsd": 0 }
    ],
    "costUsd": 0,
    "coverage": { "rates": 3, "removals": 0, "gates": 0, "siteConditions": 0, "extras": 0, "tags": 0, "unmapped": 1 }
  }
}
```

Things worth looking at while testing:

- **`rates` is a nested map, and the height keys are built by code** — `"1.8m"` comes from the number
  `1.8`, never from the model's text, so it cannot drift into `"1.8"` or `"1800mm"`.
- **`ratesSaved` vs how many rates are in your text.** A gap means something was dropped — and the
  reason is in `couldNotUnderstand`, in plain English.
- **`status` can be `unverified` even when `approved` is true.** That is the case where the review
  passed but no number survived quote-matching or bounds. It is deliberate: an empty price list must
  not be labelled as checked.
- **`meta.stages`** shows what each model call cost and how long it took. `retries: 1` means the
  first reply failed schema validation and was asked for again with the error attached.
- **`meta.coverage`** is computed in code, not by the model: what actually landed.

### Response B — not approved

```jsonc
{
  "ok": true,
  "data": {
    "approved": false,
    "status": "unverified",
    "report": "markdown — show this to the business",
    "opening": "Thanks for sending your pricing through — there is good detail here, but …",
    "fixes": [
      { "what": "Give a firm price per metre for each fence type and height you do — …",
        "example": "Colorbond 1.8m - $110/m (your figure)" },
      { "what": "Say whether your prices include GST.", "example": null }
    ],
    "fixList": ["Give a firm price per metre …", "Say whether your prices include GST."],
    "reportWordCount": 136
  },
  "meta": { "…one stage only — extraction never ran…" }
}
```

Render `report` as markdown. Use `fixes` if you would rather build the bullets into your own UI.
`fixList` is just the `what` strings for a compact view.

**Nothing is stored on the reject path.** An incomplete resubmission must not overwrite figures the
business already had approved.

## 5. `GET /api/v1/business/profile/:trade`

What is stored right now for this business, plus its submission history.

```jsonc
{ "ok": true,
  "data": {
    "pricing": { "…", "trade": "fencing", "status": "verified", "schemaVersion": 1,
                 "updatedAt": "2026-08-19T06:42:15.526Z", "confirmedAt": null },
    "capabilities": { "…", "unmapped": [ … ] },
    "submissions": [
      { "id": "fd4ec6b6…", "uid": "demo", "trade": "fencing", "approved": true,
        "status": "verified", "ratesSaved": 3, "createdAt": "2026-08-19T06:42:15.526Z" },
      { "id": "ce918c8b…", "approved": false, "status": "unverified", "ratesSaved": 0, "…": "…" }
    ]
  },
  "meta": { "trade": "fencing", "live": false } }
```

`404` if this business has never had an approved submission for this trade. Note the rejected
submission **is** in the history — history records every attempt; the profile records only what was
approved.

## 6. `POST /api/v1/business/profile/:trade/confirm`

No body. This is the business saying "yes, these figures are right", and it is **the only thing that
makes prices live**. The pipeline never sets `confirmedAt`.

```jsonc
{ "ok": true,
  "data": { "pricing": { "status": "confirmed", "confirmedAt": "2026-08-19T06:27:18.824Z", "…": "…" },
            "alreadyConfirmed": false },
  "meta": { "trade": "fencing", "live": true } }
```

- Calling it twice is safe — the second call returns `alreadyConfirmed: true`.
- Confirming `unverified` pricing returns `400 bad_request`: there is nothing worth publishing.
- **Submitting a new price list clears the confirmation.** The business confirms the new figures;
  approval of the old ones is not inherited.

## 7–8. `POST /api/v1/dev/review` and `/api/v1/dev/extract`

Only mounted when `ENABLE_DEV_ROUTES=true`. Same body as onboarding. Nothing is stored. They exist
because you cannot improve a prompt you can only run end to end.

- `/dev/review` → `data.review` — the raw approve/reject decision, before any report is built.
- `/dev/extract` → `data.raw` (exactly what the model returned) **next to** `data.verified` (what
  survived quote-matching, vocabulary and bounds). Comparing the two is how you see what the checks
  are actually catching:

```jsonc
{ "data": {
    "raw":      { "rates": [ { "material": "timber_pine", "heightM": 1.8, "pricePerMetre": 85,
                               "sourceQuote": "1.8m high - $85 per metre" } ], "…": "…" },
    "verified": { "status": "verified", "pricing": { "rates": { "timber_pine": { "1.8m": 85 } } }, "…": "…" } } }
```

---

## Error codes

| code | HTTP | when |
|---|---|---|
| `bad_request` | 400 | body failed validation, or confirming unverified pricing. `error.details` names the field |
| `unauthorized` | 401 | no `x-debug-uid` (or no bearer token once auth is on) |
| `not_found` | 404 | unknown trade, or no profile for this business yet |
| `unprocessable` | 422 | text empty, under 40 characters, or containing no digit |
| `payload_too_large` | 413 | text over 60,000 characters |
| `rate_limited` | 429 | more than 20 submissions in an hour from one business |
| `cost_limit` | 429 | the submission would cost more than `MAX_COST_PER_REQUEST_USD` |
| `upstream_timeout` | 504 | the model did not answer in time |
| `upstream_unavailable` | 502 | OpenAI error after one retry |
| `schema_violation` | 502 | the model's output failed validation twice — the prompt is wrong, not the model |
| `not_implemented` | 501 | `REQUIRE_AUTH=true` while Firebase is not connected yet |
| `internal_error` | 500 | anything unclassified |

---

## Testing it in Postman

1. **Import** `docs/postman/quotemy-ai.postman_collection.json`.
2. Check the collection variables: `baseUrl = http://localhost:8787/api/v1`, `businessUid = postman-biz-1`.
   Every request already sends `x-debug-uid: {{businessUid}}`.
3. Run the folders top to bottom.

| Folder | What you should see |
|---|---|
| **0. Health** | `health` and `ready` return `ok: true`; `ready` says `provider: mock`. `vocab` lists the enums |
| **1. Submit** | the good list → `approved: true`, `status: verified`, rates in `data.pricing.rates`. The vague list → `approved: false` with 3–5 grouped fixes |
| **2. Read back and confirm** | `profile` shows `confirmedAt: null` and `meta.live: false`; after `confirm`, `status: confirmed` and `live: true` |
| **3. Input handling** | four requests that must fail cleanly — 422, 422, 422, 400 — each with a readable `error.message`. The injection request must come back as a normal review, with the injected line treated as data |
| **4. Single stages** | `/dev/review` and `/dev/extract`, for looking at one stage at a time |

**Things worth trying by hand**, because they are the parts that matter:

- Change `businessUid` to `postman-biz-2` and call `profile` — it should be `404`. Two businesses
  never see each other's data.
- Add `"businessUid": "someone-else"` to the onboarding body. It is ignored; the data lands under
  your header's uid. That was the n8n security hole.
- Take the good price list and change one rate to `$8500 per metre`. It gets **dropped** by the
  bounds check even though the sentence is genuinely in your text, and `couldNotUnderstand` says so.
- Change a rate's number but leave the rest of the sentence alone, then look at `ratesSaved` — this
  is quote verification doing its job.
- Submit, confirm, then submit again → `confirmedAt` is back to `null`.
- Restart the server and call `profile` → `404`. Storage is in-memory today; this is expected, and
  it is what Firestore replaces.

## Two limits to keep in mind while testing

1. **`AI_PROVIDER=mock` is a rule-based reader, not intelligence.** It recognises firm
   `$N per metre` lines, GST, minimum charge and a travel radius — and ignores gates, removals and
   surcharges, which it reports honestly in `couldNotUnderstand`. It exists to prove the plumbing,
   not the extraction quality. For real behaviour, set `AI_PROVIDER=openai` and an `OPENAI_API_KEY`.
2. **Text only.** PDFs, images and Word documents are the next piece of work (`docs/FLOW.md` §3).
