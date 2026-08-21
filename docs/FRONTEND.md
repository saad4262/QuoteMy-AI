# Frontend integration guide

Everything the UI needs to talk to this API. Self-contained — you should not need to read any
backend source to build against it. Every shape below was captured from a running server.

---

## 1. The mental model

A tradesperson writes (or uploads) a description of their business — what they install, what they
charge, where they work. The API reads it, decides whether it is complete enough to publish, and
either **approves** it (returning the structured fields it extracted) or **rejects** it (returning a
list of jobs the business must do). Approved prices are not live until the business **confirms**
them on your screen.

```
      ┌─────────────────────────────────────────────────────────────┐
      │  Trade selector · text box · file picker · [Send for approval]│
      └───────────────────────────┬─────────────────────────────────┘
                                  │  POST /business  (action: submit)
                     ┌────────────┴────────────┐
             approved: true              approved: false
                     │                          │
   ┌─────────────────▼──────────┐   ┌───────────▼───────────────────┐
   │ "Approved" panel           │   │ "Needs updating" panel        │
   │ - the fields we saved      │   │ - what is missing             │
   │ - what we could not use    │   │ - what needs to be clearer    │
   │ [Confirm]  [Contact team]  │   │ [Edit & resend] [Contact team]│
   └────────┬───────────────────┘   └───────────────────────────────┘
            │  POST /business  (action: confirm)
            ▼
       prices live
```

**Status lifecycle**

```
(nothing) ──submit──► verified ──confirm──► confirmed   ← only this is live to customers
              │
              └──────► unverified   (approved, but no figure survived checking)

Re-submitting always clears a previous confirmation: the business confirms the NEW figures.
```

---

## 2. Two routes. That is all.

Base URL: `http://localhost:8787/api/v1`

| Method | Route | |
|---|---|---|
| `GET` | `/health` | is the server up, which model is live |
| `POST` | `/business` | **everything else** — the `action` field in the body picks the job |

There is **no auth today**. `businessUid` is sent in the body and taken at face value. When Firebase
lands it will come from a verified token and the body field will be ignored — so send it now, and
nothing in the UI changes later.

---

## 3. The response envelope — only two shapes exist

```ts
type ApiSuccess<T> = { ok: true;  requestId: string; data: T; meta?: Record<string, unknown> };
type ApiError      = { ok: false; requestId: string; error: { code: string; message: string; details?: unknown } };
```

Rules that matter for the UI:

- **A rejected price list is a SUCCESS.** HTTP `200`, `ok: true`, `data.approved: false`. The
  business did nothing wrong by sending an incomplete description. Do **not** put it in a `catch`
  or render it as an error.
- `ok: false` only ever means a broken request or a broken server.
- `requestId` is also returned as an `x-request-id` header. Show it in your error toast — it is how
  the backend finds what happened.

```ts
async function callApi<T>(body: object): Promise<T> {
  const res = await fetch(`${API_BASE}/business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new ApiError(json.error.code, json.error.message, json.requestId);
  return json.data as T;
}
```

---

## 4. `action: "submit"` — send details for approval

### Request, as JSON

```jsonc
POST /api/v1/business
Content-Type: application/json

{
  "action": "submit",          // optional, this is the default
  "businessUid": "demo-1",     // required in practice; defaults to "test-business"
  "trade": "fencing",          // defaults to "fencing" — the only trade today
  "text": "Treated pine 1.8m — $85 per metre\nAll prices include GST..."
}
```

### Request, with files

Same route, `multipart/form-data`. Text, files, or both — files alone are a complete submission.

```ts
const form = new FormData();
form.append('businessUid', businessUid);
form.append('trade', 'fencing');
form.append('text', typedText);          // may be empty
for (const file of files) form.append('files', file);

const res = await fetch(`${API_BASE}/business`, { method: 'POST', body: form });
// do NOT set Content-Type yourself — the browser adds the multipart boundary
```

| | |
|---|---|
| Accepted | PDF · PNG, JPEG, WEBP, GIF · `.docx` · `.xlsx` · `.txt`, `.md`, `.csv` |
| Limits | 20 MB per file · 40 MB per request · 6 files |
| Rejected | **HEIC** — what an iPhone camera produces. Returns `415` with a message asking for a JPEG |

**Validate on the client before uploading** (size, count, extension) so the user gets an instant
message instead of waiting for a 20 MB upload to fail. The server checks again regardless.

Expect this call to take a while: reading a document plus two model calls. Budget **10–40 seconds**,
show a progress state, and do not set a fetch timeout under 60s.

### Response A — approved

```jsonc
{
  "ok": true,
  "requestId": "e4f54aea-…",
  "data": {
    "approved": true,
    "status": "verified",            // or "unverified" — see the warning below
    "business": {
      "opening": "Your details have been approved. Below is what we have saved from them.",
      "pricing": {
        "gstIncluded": true,                       // true | false | null (null = never stated)
        "enabledMaterials": ["timber_pine", "colorbond"],
        "rates": {                                 // material -> height band -> price per metre
          "timber_pine": { "0.9m": 62, "1.2m": 71, "1.8m": 85 },
          "colorbond":   { "1.2m": 88, "1.8m": 110 }
        },
        "removals":       [{ "removes": "timber", "pricePerMetre": 18 }],
        "gates":          [{ "gateType": "driveway_double", "material": "colorbond",
                             "price": 1480, "isFromPrice": false }],
        "siteConditions": [{ "condition": "sloped", "extraPerMetre": 14 }],
        "serviceArea":    { "baseLocation": "Berwick",
                            "resolved": { "suburb": "Berwick", "state": "VIC", "postcode": "3806",
                                          "lat": -38.0294, "lng": 145.3441, "source": "google" },
                            "radiusKm": 30, "excludedAreas": ["CBD"] },
        "minimumCharge": 850                       // number | null
      },
      "capabilities": {
        "businessName": "Southeast Fencing",       // string | null
        "tags": ["insured", "custom-gates"],
        "extras": [{ "label": "Pool compliance certificate", "price": 290,
                     "unit": "per_item", "isFromPrice": false }],
        "inclusions": ["Site inspection and measure-up"],
        "exclusions": ["Council permits"]
      },
      "ratesSaved": 20,
      "otherOfferings": [
        { "slug": "bamboo-screening", "label": "Bamboo screening",
          "pricePerMetre": 70, "heightM": 1.8, "unit": "per_metre" }
      ],
      "notUsed": ["…anything that could not be stored at all…"],
      "labels": { "timber_pine": "Treated pine", "driveway_double": "Double driveway gate" },
      "source": { "documents": [
        { "label": "pricelist.pdf", "kind": "pdf",  "readBy": "model", "chars": 4210, "unreadable": false },
        { "label": "typed",         "kind": "text", "readBy": "text",  "chars": 380,  "unreadable": false }
      ]},
      "nextStep": "Check the figures. If they are right, confirm them and your profile goes live…"
    },
    "admin": {
      "submissionId": "70855032-…",
      "decision": "approved",
      "coverage": { "rates": 20, "removals": 0, "gates": 0, "siteConditions": 0,
                    "extras": 0, "tags": 0, "unmapped": 1 },
      "sourceText": "the full transcript everything was checked against",
      "textChars": 3300
    }
  },
  "meta": {
    "trade": "fencing", "model": "gpt-5.6-terra", "store": "memory", "schemaVersion": 1,
    "stages": [{ "name": "review", "ms": 4210, "tokensIn": 4102, "tokensOut": 1180,
                 "retries": 0, "costUsd": 0.0223 }],
    "costUsd": 0.0581
  }
}
```

**`data.business` is the business screen. `data.admin` is the internal screen. Never show `admin`
to a tradesperson.** `meta` is telemetry — useful on an admin page, never on theirs.

### Response B — rejected

```jsonc
{
  "ok": true,
  "requestId": "2d08bac3-…",
  "data": {
    "approved": false,
    "status": "unverified",
    "business": {
      "opening": "We have been through the details you sent. A few things need updating before your profile can go live.",
      "fixes": [
        { "kind": "missing", "what": "Say whether your prices include GST.",
          "example": "All prices include GST" },
        { "kind": "missing", "what": "Add the smallest job you will take on and what you charge for it.",
          "example": "Minimum charge $850" },
        { "kind": "unclear", "what": "Give one set price per metre for each fence type and height you do…",
          "example": "Colorbond 1.8m - $110/m (your figure)" }
      ],
      "notUsed": ["We could not read anything from rate-card.png. …"],   // usually empty
      "source": { "documents": [ /* same shape as above */ ] },
      "nextStep": "Update your details and send them through again for approval. If something above does not look right, use the contact button below and one of our team will go through it with you."
    },
    "admin": {
      "submissionId": "41c9e82d-…",
      "decision": "needs_updates",     // "approved" | "needs_updates" | "not_a_price_list"
      "fixCounts": { "missing": 2, "unclear": 1 },
      "sourceText": "…", "textChars": 3290
    }
  },
  "meta": { /* one stage only — extraction never ran */ }
}
```

---

## 5. How to render each panel

### The rejected panel

Group `fixes` by `kind` and give each group its own heading. **This split is the whole point** —
`missing` means the business never said it, so they go and *find a number*; `unclear` means they did
say it but not in a form we can quote from, so they go and *rewrite that line*. Two different jobs.
One heading over both makes the feedback feel vague.

```
{opening}

## What we still need                 ← fixes where kind === "missing"
1. {what}
   e.g. {example}                     ← show as code/monospace; omit when example is null

## What needs to be clearer           ← fixes where kind === "unclear"
2. {what}
   e.g. {example}

## What to do next
{nextStep}

[ Edit and send again ]   [ Contact our team ]
```

- Number the steps **continuously across both sections** (1, 2, 3 …) so it reads as a list of jobs.
- Omit a section entirely when it has no items.
- There are 3–5 fixes, already grouped by the backend. Do not re-group or truncate them.
- `nextStep` is fixed server-side and describes exactly those two buttons — put it next to them.

### The approved panel

```
{opening}

## Your rates                         ← from pricing.rates
| Type | Height | Per metre |
| Treated pine | 1.8m | $85 |         ← labels[material] for the name, never the raw slug

## Removal and site charges           ← pricing.removals + pricing.siteConditions (omit if both empty)
## Gates                              ← pricing.gates (omit if empty)
## Your details                       ← serviceArea, minimumCharge, gstIncluded, capabilities.extras

## What we could not use              ← notUsed (omit if empty)
- …

## What to do next
{nextStep}

[ Confirm — go live ]   [ Edit and send again ]   [ Contact our team ]
```

Flattening `rates` into table rows:

```ts
const rows = Object.entries(pricing.rates).flatMap(([material, bands]) =>
  Object.entries(bands).map(([height, price]) => ({
    type: labels[material] ?? material,   // "Treated pine"
    height,                               // "1.8m" — already formatted, print as-is
    price,                                // 85
  })),
);
```

### `otherOfferings` — the long tail

Fencing has a closed list of materials (`timber_pine`, `colorbond`, …) because customer search
filters on those strings exactly. Everything else a business sells — bamboo screening, brushwood,
picket, wrought iron — comes back here instead:

```jsonc
"otherOfferings": [
  { "slug": "bamboo-screening", "label": "Bamboo screening",
    "pricePerMetre": 70, "heightM": 1.8, "unit": "per_metre" }
]
```

Show it beside the rates table, using **`label`** — that is the business's own wording. `slug` is
shared across businesses so search can group them; the label is theirs.

These prices passed exactly the same checks as a core rate: the source sentence had to really appear
in what they wrote, and the number had to be plausible. The long tail is looser about *what can be
named*, never about the numbers attached to it.

### `serviceArea.resolved`

`baseLocation` is the business's own words ("Berwick"). `resolved` is that turned into a point, so
the customer side can match by distance:

```jsonc
"resolved": { "suburb": "Berwick", "state": "VIC", "postcode": "3806",
              "lat": -38.0294, "lng": 145.3441, "source": "google" }
```

It is `null` when the location could not be resolved — never a guessed coordinate, because an
invented one would put a business in front of customers it cannot reach and nothing would report it.
Show `baseLocation` to the business either way; `resolved` is for matching, not for display.

### `labels` — use it, do not keep your own copy

`business.labels` maps every slug to its human name (`timber_pine` → `Treated pine`). It is sent
with the response on purpose. If the UI hardcodes its own list, it goes stale the first time a value
is added on the backend — and nothing errors, the screen just starts showing `bamboo_screening` to a
customer. Always `labels[slug] ?? slug`.

### `source.documents` — show it when files were sent

```
We read: pricelist.pdf (4,210 characters) · your typed notes
```

`readBy: "text"` means the figures came straight out of the file's bytes — exact. `readBy: "model"`
means a model read them off a document, so they are worth a glance. `unreadable: true` means we got
nothing from that file; say so plainly and suggest a clearer photo.

### Three outcomes, not two

`admin.decision` tells you which situation you are in, and `business.opening` / `nextStep` already
carry the right words for it. You do not need to write copy per case — but the panel should look
different for the third one:

| `admin.decision` | What happened | Panel |
|---|---|---|
| `approved` | it passed | the approved screen |
| `needs_updates` | a real attempt, but something is missing or unclear | the fix list |
| `not_a_price_list` | gibberish, a greeting, a question, the wrong trade | no fixes at all — render `whatToSend` as an empty state, see below |

### `not_a_price_list` carries a checklist, not a fix list

When there was nothing to assess, `fixes` is **empty** and `business.whatToSend` is present instead:

```jsonc
"business": {
  "opening": "This page is for your pricing, and we could not find any in what you sent. Here is what we need before your profile can go live.",
  "fixes": [],
  "whatToSend": {
    "need": [
      "Each fence type you install, and your price per metre at every height you do it at",
      "Whether those prices include GST",
      "The suburb or postcode you work out from, and how far you travel",
      "The smallest job you will take on, and what you charge for it"
    ],
    "helpful": [
      "Gate prices, per gate",
      "What you charge to pull down and take away an old fence",
      "Any extra for sloped blocks, rock, or tight access",
      "Anything not included in your prices - permits, painting, stump removal"
    ],
    "example": "TREATED PINE\n1.8m high - $85 per metre\n…"
  },
  "notUsed": [],
  "source": { "…": "…" },
  "nextStep": "Type it in, or attach your price list as a PDF or a photo — whichever is easier. …"
}
```

Render it as the empty-state it is, not as a rejection:

```
{opening}

## What we need                ← whatToSend.need, as a checklist
## Also helpful                ← whatToSend.helpful, smaller / collapsed
## For example                 ← whatToSend.example, in a monospace block

{nextStep}
[ Edit and send again ]  [ Contact our team ]
```

`whatToSend` comes from the same SOP rules the review stage judges against, so nobody is asked for
one thing and marked against another. It is **only present** on `not_a_price_list` — a
`needs_updates` response has specific fixes instead, which are more useful than a generic list.

Some of these are caught in code with no model call at all (a mashed keyboard), and some by the
model (a customer enquiry, the wrong trade). The response is identical either way, so the UI needs
one branch, not two.

### `notUsed` on both paths

`business.notUsed` is present on approved **and** rejected responses. It names anything we could not
use — including **a file we read nothing from**:

```
We could not read anything from rate-card.png. If it has pricing in it, send a clearer photo or
type those figures in.
```

**Always render it when it is non-empty.** A business who attached a photo and is told nothing about
it will assume it was used.

### ⚠️ `approved: true` with `status: "unverified"`

This means the review passed but **no figure survived checking** — every number failed to match the
business's own words, or fell outside plausible bounds. `ratesSaved` will be `0`. Do **not** show a
green "approved" screen: use `opening`/`nextStep`, which already carry the right wording for this
case, and hide the Confirm button. The backend also refuses to confirm this state.

```ts
const outcome =
  !data.approved                     ? 'rejected'
  : data.status === 'unverified'     ? 'nothing-usable'
  :                                    'approved';
```

---

## 6. `action: "profile"` — read back what is stored

```jsonc
// request
{ "action": "profile", "businessUid": "demo-1", "trade": "fencing" }

// response
{ "ok": true, "data": {
    "pricing": { /* same as business.pricing, plus: */
      "trade": "fencing", "status": "verified", "schemaVersion": 1,
      "updatedAt": "2026-08-19T06:42:15.526Z", "confirmedAt": null },
    "capabilities": { /* same as business.capabilities, plus: */
      "trade": "fencing", "unmapped": ["…"], "schemaVersion": 1, "updatedAt": "…" },
    "submissions": [
      { "id": "fd4ec6b6-…", "uid": "demo-1", "trade": "fencing", "approved": true,
        "status": "verified", "ratesSaved": 20, "createdAt": "2026-08-19T06:42:15.526Z" }
    ]
  },
  "meta": { "trade": "fencing", "live": false } }
```

- `404 not_found` when this business has never had an approved submission — that is the empty state,
  not an error. Show the "send your details" screen.
- `meta.live` is the one flag for "customers can see this": `true` only after confirming.
- `submissions` holds **every attempt**, rejections included, newest first. The profile itself only
  ever holds approved data — a rejected resubmission never overwrites figures that were approved.
- **`profile` does not return `labels`.** Cache them from the last `submit` response, or render
  slugs through a `labels` map you fetched earlier.

## 7. `action: "confirm"` — make the prices live

```jsonc
// request  (no text needed)
{ "action": "confirm", "businessUid": "demo-1", "trade": "fencing" }

// response
{ "ok": true,
  "data": { "pricing": { "status": "confirmed", "confirmedAt": "2026-08-19T06:27:18.824Z", "…": "…" },
            "alreadyConfirmed": false },
  "meta": { "trade": "fencing", "live": true } }
```

- Safe to call twice — the second returns `alreadyConfirmed: true`, not an error.
- `400 bad_request` if `status` is `unverified` — nothing worth publishing. Hide the button in that
  state rather than letting the user hit the error.
- Confirming is the **only** thing that makes prices live. Say that on the button.

---

## 8. Errors

```jsonc
{ "ok": false, "requestId": "45e092b3-…",
  "error": { "code": "unprocessable", "message": "Send your pricing details and we will take a look" } }
```

| `code` | HTTP | What it means | What the UI should do |
|---|---|---|---|
| `unprocessable` | 422 | Nothing readable arrived — empty, under 40 chars, no digit anywhere, an unbroken 100+ character blob, or a file we got nothing out of | Show `message` under the text box |
| `unsupported_file_type` | 415 | Not a format we read. HEIC has its own message | Show `message` on the file row |
| `payload_too_large` | 413 | File over 20 MB, request over 40 MB, more than 6 files, or a transcript over 60,000 chars | Show `message`; prevent this client-side |
| `bad_request` | 400 | Body failed validation, or confirming unverified pricing. `error.details` names the field | Generic message; a real one means a frontend bug |
| `not_found` | 404 | No profile yet, or an action that is switched off | Empty state, not an error |
| `rate_limited` | 429 | More than 40 submissions an hour from one address | "Too many submissions, try again shortly" |
| `cost_limit` | 429 | The submission would cost more than the per-request ceiling | Ask them to send a shorter description |
| `upstream_timeout` | 504 | The model did not answer in time | "That took too long — try again" + retry button |
| `upstream_unavailable` | 502 | Provider error after one retry | "Our reader is having trouble — try again shortly" |
| `schema_violation` | 502 | The model's output failed validation twice | Generic message; this is a backend problem, log the `requestId` |
| `internal_error` | 500 | Anything unclassified | Generic message + `requestId` |

`message` on `422`, `415` and `413` is written for the tradesperson — safe to display as-is. The
5xx messages are not; show your own copy and keep the `requestId`.

---

## 9. The closed vocabulary

Every value below is a **fixed list**. The backend can never return anything outside it — anything a
business said that has no home here comes back as prose in `notUsed` instead. Safe to switch on;
still use `labels[slug] ?? slug` for display.

| Field | Values |
|---|---|
| `material` (keys of `rates`, and `gates[].material`) | `timber_pine` `timber_hardwood` `colorbond` `aluminium` `pool_aluminium` `pool_glass` `chainmesh` `rural_wire` |
| `gateType` | `pedestrian_single` `driveway_double` `driveway_sliding` `motor_automation` |
| `condition` | `sloped` `rock` `restricted_access` `hand_dig` |
| `removes` | `timber` `metal` `any` |
| `unit` | `per_metre` `per_item` `per_job` `per_sqm` |
| `tags` | `custom-gates` `steep-blocks` `pool-compliant` `rural-capable` `own-installers` `insured` `glass-capable` `automation` |
| `trade` | `fencing` |
| `status` | `pending` `unverified` `verified` `confirmed` |
| `fixes[].kind` | `missing` `unclear` |

Height bands (`"1.8m"`, `"1.35m"`) are built by the backend from a number, so they are always
`<number>m` and never `"1800mm"` or `"1.8"`. Print them as they arrive.

`isFromPrice: true` on a gate or extra means the business quoted it as "from $X" — render it as
`from $1,450`.

---

## 10. TypeScript types

```ts
export type Material =
  | 'timber_pine' | 'timber_hardwood' | 'colorbond' | 'aluminium'
  | 'pool_aluminium' | 'pool_glass' | 'chainmesh' | 'rural_wire';
export type GateType = 'pedestrian_single' | 'driveway_double' | 'driveway_sliding' | 'motor_automation';
export type Condition = 'sloped' | 'rock' | 'restricted_access' | 'hand_dig';
export type Removes = 'timber' | 'metal' | 'any';
export type Unit = 'per_metre' | 'per_item' | 'per_job' | 'per_sqm';
export type Trade = 'fencing';
export type PricingStatus = 'pending' | 'unverified' | 'verified' | 'confirmed';

export interface Pricing {
  gstIncluded: boolean | null;
  enabledMaterials: Material[];
  rates: Record<string, Record<string, number>>;   // material -> "1.8m" -> price
  removals: { removes: Removes; pricePerMetre: number }[];
  gates: { gateType: GateType; material: Material | null; price: number; isFromPrice: boolean }[];
  siteConditions: { condition: Condition; extraPerMetre: number }[];
  serviceArea: { baseLocation: string | null; radiusKm: number | null; excludedAreas: string[] };
  minimumCharge: number | null;
}

export interface Capabilities {
  businessName: string | null;
  tags: string[];
  extras: { label: string; price: number | null; unit: Unit | null; isFromPrice: boolean }[];
  inclusions: string[];
  exclusions: string[];
}

export interface SourceDocument {
  label: string;
  kind: 'text' | 'pdf' | 'image' | 'document' | 'spreadsheet';
  readBy: 'text' | 'model';
  chars: number;
  unreadable: boolean;
}

export interface Fix {
  kind: 'missing' | 'unclear';
  what: string;
  example: string | null;
}

export type SubmitResult =
  | {
      approved: true;
      status: 'verified' | 'unverified';
      business: {
        opening: string;
        pricing: Pricing;
        capabilities: Capabilities;
        ratesSaved: number;
        notUsed: string[];
        labels: Record<string, string>;
        source: { documents: SourceDocument[] };
        nextStep: string;
      };
      admin: { submissionId: string; decision: 'approved'; coverage: Record<string, number>;
               sourceText: string; textChars: number };
    }
  | {
      approved: false;
      status: 'unverified';
      business: {
        opening: string;
        fixes: Fix[];                       // empty when decision is "not_a_price_list"
        whatToSend?: {                      // present ONLY when decision is "not_a_price_list"
          need: string[];
          helpful: string[];
          example: string;
        };
        notUsed: string[];
        source: { documents: SourceDocument[] };
        nextStep: string;
      };
      admin: { submissionId: string; decision: 'needs_updates' | 'not_a_price_list';
               fixCounts: { missing: number; unclear: number };
               sourceText: string; textChars: number };
    };

export interface ProfileResult {
  pricing: Pricing & { trade: Trade; status: PricingStatus; schemaVersion: number;
                       updatedAt: string; confirmedAt: string | null };
  capabilities: Capabilities & { trade: Trade; unmapped: string[]; schemaVersion: number; updatedAt: string };
  submissions: { id: string; uid: string; trade: Trade; approved: boolean;
                 status: PricingStatus; ratesSaved: number; createdAt: string }[];
}

export interface ConfirmResult {
  pricing: ProfileResult['pricing'];
  alreadyConfirmed: boolean;
}
```

---

## 11. Rules the UI must not break

1. **Never render `data.admin` or `meta` on the business screen.** Those are for the internal view.
2. **Never hardcode a label list.** Use `business.labels`.
3. **Never treat `approved: false` as an error.** It is an ordinary 200.
4. **Never show a green approved screen when `status === "unverified"`.**
5. **Never invent or edit a price on the client.** Everything shown must come from the response —
   these figures were checked against the business's own words on the server, and anything the UI
   adds has had no such check.
6. **Confirm is the only thing that makes prices live.** Do not imply a submission is live before it.
7. **Send `businessUid` on every call.** Two businesses are kept entirely separate by it.
8. **Always show `notUsed` when it is non-empty** — it is where an unreadable attachment is named.

## 12. Running the backend locally

```bash
cp .env.example .env
npm run dev          # http://localhost:8787
```

Defaults need no API key: `AI_PROVIDER=mock` is a deterministic offline reader that recognises firm
`$N per metre` lines, GST, a minimum charge and a travel radius, and honestly reports the rest in
`notUsed`. It **cannot read real PDFs or photos** — those come back `unreadable`. It exists so the
whole UI flow can be built and tested for free; set `AI_PROVIDER=openai` and `OPENAI_API_KEY` for
real behaviour.

Storage is in memory unless `STORE=firestore`. A `profile` call after a memory-store restart returns `404`.

`GET /health` reports which provider is live:

```jsonc
{ "ok": true, "data": { "status": "ok", "uptime": 1092.6, "provider": "mock", "model": "mock",
                        "store": "memory",
                        "prompts": { "review": 5235, "extraction": 1934, "transcribe": 597 } } }
```

---

## 13. Firestore save path (`action: "process"`)

This is how the live product works. The business screen does **not** wait for the model — the
answer arrives as a document.

```
businesses/{uid}/services/{trade}
  ├─ (root doc)                { trade, lastSubmittedAt }
  ├─ description/raw           ← you write
  ├─ description/lastaireview  ← the service writes; you listen
  ├─ jsondata/extracted        ← the service writes; customer search reads it
  └─ submissions/{id}          ← the service appends; admin history
```

### On Save

1. Upload files to Storage at `businesses/{uid}/services/{trade}/{submissionId}/{filename}`. Keep
   both `path` and `url` on each file — the service reads by `path`.
2. Write `description/raw`:

```jsonc
{
  "submissionId": "uuid",            // NEW value every Save. This is the work ticket.
  "uid": "…", "trade": "fencing",
  "text": "…",                       // may be empty when only files were attached
  "files": [{ "name", "path", "url", "contentType", "size" }],
  "status": "pending",               // pending | accepted | rejected | failed
  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}
```

3. Merge `description/lastaireview` with `{ displayState: "pending", updatedAt }` — **merge, do not
   overwrite**. The previous review body stays where it is, which is what lets the service tell a
   resubmit from a first attempt.
4. Create `jsondata/extracted` as `{ data: null, updatedAt: null }` if it does not exist.
5. `POST /api/v1/business` `{ "action": "process", "businessUid", "trade" }`. The response is
   `{ accepted: true, submissionId }` — **not the review**. Fire and forget: if this call fails, the
   Save still succeeded and the sweeper picks the document up within two minutes.
6. `onSnapshot` on `description/lastaireview`.

### Reading the answer

**Show the panel only when `displayState === "ready"`.** While it is `"pending"`, show "we are
reading your details" and leave the old review body hidden — it belongs to the previous submission.

Also ignore a `ready` document whose `submissionId` is not the one you just wrote; that is the
previous review still in place.

The document carries the same `data` object `action: "submit"` returns, so the panels in section 5
work unchanged:

```jsonc
{
  "displayState": "ready",
  "submissionId": "…",
  "approved": true,
  "status": "verified",
  "business": { "opening", "fixes", "whatToSend", "notUsed", "source", "nextStep",
                "pricing", "capabilities", "ratesSaved", "labels" },
  "admin":    { "decision", "submissionId", "coverage", "sourceText", "textChars" },
  "model": "gpt-5.6-terra", "costUsd": 0.046,
  "updatedAt": <serverTimestamp>
}
```

### `raw.status` — four values, not three

| value | meaning | panel |
|---|---|---|
| `pending` | waiting on us | "reading your details" |
| `accepted` | the review approved it | approved panel |
| `rejected` | changes needed, **or** the submission was unreadable | fix list / checklist |
| `failed` | we could not process it after several tries — **our** fault, not theirs | failure panel |

`failed` matters. Without it a broken submission would sit on "Approval pending" forever and the
business would never learn why. `lastaireview` comes back with `decision: "failed"` and an opening
that says so plainly: *"Something went wrong on our end reading your details. Nothing you sent has
been lost — send it through again, or use the contact button and we will sort it out."*

The service also writes its own `aiWorkStatus`, `aiAttempts`, `aiSubmissionId` fields on that
document. They are its bookkeeping for retries — ignore them, and never write them.

### Confirm still gates going live

Approval is the machine's judgement; going live is the business's decision. On approval the service
writes `jsondata/extracted` with `status: "verified"` — present, but **not** visible to customers.
`{ "action": "confirm", … }` sets `status: "confirmed"`, and customer search filters on that.

Show Confirm only when `decision === "approved"` and `status !== "unverified"`.

### Resubmitting

The service reads the previous `lastaireview` and passes what was asked for last time into the
review as *context* — so the wording can acknowledge progress ("the GST line is sorted, the minimum
charge is the last thing we need"). It is not a shortcut: every submission is judged from scratch
against the rules, because a rewrite very often fixes the old problems and breaks something new.

This is exactly why step 3 says merge rather than overwrite.

### Do not

- Write `lastaireview.business` / `admin`, or `jsondata/extracted.data`, from the client. The rules
  in `firestore.rules` refuse it — a business that could write those could approve its own prices.
- Send text or files in the `process` body. The service reads Firestore.
- Wait on the `process` response for the review.
- Forget `displayState`. Without `"ready"` the panel never opens.

`action: "submit"` still accepts text and files in the HTTP body and returns the review in the
response. That path is unchanged and is how Postman and the tests run with no Firebase credentials.
