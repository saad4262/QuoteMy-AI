# Prompt — business side frontend, adding retaining wall

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

---

You are updating the **business-facing** frontend of QuoteMy AI (React + Firebase). The backend now
supports a fourth trade, **retaining wall**, alongside fencing, tiling and kitchen fitting. Your job
is to let a retaining wall builder onboard and confirm their prices.

## What this screen does today

A tradesperson types (or uploads) a description of what they charge. It goes to one endpoint. The
backend either **approves** it and returns the structured figures it extracted, or **rejects** it
with a list of jobs to do. Approved prices are **not live** until the business presses Confirm.

That flow is unchanged. Two things change, and the second one is the real work.

## Change 1 — the trade picker gains an entry

The endpoint is unchanged: `POST /api/v1/business`, with an `action` field.

```jsonc
{ "action": "submit",  "businessUid": "...", "trade": "retaining_wall", "text": "..." }
{ "action": "profile", "businessUid": "...", "trade": "retaining_wall" }
{ "action": "confirm", "businessUid": "...", "trade": "retaining_wall" }
```

**The slug is `retaining_wall`, with an underscore.** Not `retaining-wall`, not `retainingWall`.

`trade` **defaults to `"fencing"` when omitted**, so a retaining wall business that does not send it
will silently read and write the wrong document. Send it on all three actions.

Get the list from `GET /api/v1/client/trades` — do not hardcode it:

```jsonc
{ "ok": true, "data": [ { "trade": "fencing",        "label": "fencing" },
                        { "trade": "tiling",         "label": "tiling" },
                        { "trade": "kitchen",        "label": "kitchen fitting" },
                        { "trade": "retaining_wall", "label": "retaining wall" } ] }
```

File uploads are unchanged and already per-trade:
`businesses/{uid}/services/{trade}/{submissionId}/{filename}`.

## Change 1b — ⚠ `services_provided`, or the business goes live and nobody can see it

**This one is not part of the submit flow, it is easy to miss, and it has already happened once.**

`businesses/{uid}` carries a `services_provided` array. Your app writes it — the backend only ever
reads it, never creates or edits it — and it is the ONLY thing the customer search uses to decide
which businesses to even look at:

```js
where('services_provided', 'array-contains', 'retaining_wall')
```

So a builder can submit a price list, have it approved, press **Confirm — go live**, see "these
prices are already live" on their own screen, and still be invisible to every customer — because
their business document never said they do this trade. The business page and the customer chat then
both tell the truth and contradict each other, which is very hard to debug from either end.

**When a business picks retaining wall, add `retaining_wall` to `services_provided`.**

```jsonc
{ "uid": "...", "businessName": "...",
  "services_provided": ["fencing", "retaining_wall"] }
```

**Write the UNDERSCORE.** Live data currently contains `retaining-wall` with a hyphen — the spelling
the old n8n system used — and that is what caused the failure above. The backend now accepts either
spelling in this one field so nothing is broken today, but write `retaining_wall` for anything new:
it is the value every other part of the system uses, including the Firestore document ids
`schema/{trade}` and `businesses/{uid}/services/{trade}`.

Two more things about this field, from what is actually in the data:

- It is free-form and is **not** validated. It currently holds `decking` and `landscaping`, which
  are not trades this backend serves at all. Extra values are harmless; a missing one is not.
- Removing a trade from it hides that business from customers **without** touching their prices,
  which is the correct way to let a business pause a trade. Deleting their price list is not.

## Change 2 — the confirm screen must render this trade's shape

**No price goes live without the business confirming it on this screen**, so if the screen cannot
show these figures, a retaining wall builder cannot go live.

On approval the response is `data.business`, with the same top-level keys as every other trade:

```
opening · pricing · capabilities · ratesSaved · otherOfferings · notUsed · alsoWorthAdding · labels · source · nextStep
```

`opening`, `notUsed`, `alsoWorthAdding`, `nextStep` and `source` render exactly as they do already.
`labels` is a flat `slug → human words` map and is **per trade** — use it to render every slug you
show, never a slug raw.

What differs is `pricing` and `capabilities`.

```jsonc
"pricing": {
  "gstIncluded": true,
  "supplyModels": ["supply_and_install", "labour_only"],
  "enabledWallTypes": ["timber_sleeper", "concrete_sleeper", "steel_post", "tiered"],
  "rates": { … },            // see below — THE important one
  "drainage": [ … ],
  "removals": [ … ],
  "groundworks": [ … ],
  "siteConditions": [ … ],
  "extras": [ … ],
  "serviceArea": { "baseLocation": "Berwick", "resolved": {…}, "radiusKm": 30, "excludedAreas": [] },
  "minimumCharge": 650,
  "siteInspectionFee": 150,
  "travelFee": 95
},
"capabilities": {
  "businessName": "Berwick Retaining Wall",
  "engineering": { "text": "…", "price": 850, "isFromPrice": true },
  "warranty": { "text": "Ten year workmanship warranty on everything we build." },
  "tags": [], "inclusions": [], "exclusions": []
}
```

`serviceArea`, `minimumCharge`, `gstIncluded`, `warranty`, `tags`, `inclusions` and `exclusions`
render as they do today. Five things are new.

### 2.1 ⚠ `rates` is TWO TABLES, and this is the whole trade

This is the one thing to get right. Every other trade has one rate table. This one has two, keyed by
supply model, and **the same wall appears in both at very different prices**:

```jsonc
"rates": {
  "labour_only": [
    { "wallType": "timber_sleeper",   "heightBand": null, "pricePerMetre": 145 },
    { "wallType": "concrete_sleeper", "heightBand": null, "pricePerMetre": 185 }
  ],
  "supply_and_install": [
    { "wallType": "timber_sleeper",   "heightBand": null, "pricePerMetre": 285 },
    { "wallType": "concrete_sleeper", "heightBand": null, "pricePerMetre": 395 }
  ]
}
```

Render them as **two labelled sections, or two columns side by side** — never as one merged list.
A builder looking at "Timber sleeper $145" and "Timber sleeper $285" in a single column will think
the screen has a bug, and the one thing they are being asked to confirm is exactly this difference:

- `labour_only` — the customer buys the sleepers, posts, concrete and drainage; the builder installs
- `supply_and_install` — the builder supplies everything

Use `labels` for the headings: `labels["labour_only"]` and `labels["supply_and_install"]`.

**A builder may have only one of the two keys**, and that is a complete, publishable price list —
many only install customer-supplied materials. Render whichever keys exist; do not show an empty
section for the other, and do not treat its absence as an error.

`heightBand` is `null` on most rows and that is normal — it means one rate covers every height the
builder works at. When it is a string (`"0.9m"`), show it against that row. Prices are **per linear
metre**, never per square metre.

`enabledWallTypes` is what they can actually be quoted for, computed from the rates that survived —
use it if you want a summary chip row, not as the rate list.

### 2.2 `drainage` — new, and not an upsell

```jsonc
"drainage": [
  { "type": "full_package",      "price": 650, "unit": "per_job" },
  { "type": "ag_pipe",           "price": 55,  "unit": "per_metre" },
  { "type": "drainage_gravel",   "price": 85,  "unit": "per_metre" },
  { "type": "drainage_outlet",   "price": 180, "unit": "per_item" }
]
```

Its own section, not folded into extras. Water behind a wall is what pushes walls over, so this is
part of the job rather than an add-on. Render `type` through `labels` and `unit` through
`labels` too (`per_metre` → "per metre", `per_item` → "each", `per_job` → "per job").

### 2.3 ⚠ `groundworks` — the section with units you have not seen before

```jsonc
"groundworks": [
  { "type": "excavation",   "price": 95,  "unit": "per_hour" },
  { "type": "post_holes",   "price": 75,  "unit": "per_item" },
  { "type": "footings",     "price": 95,  "unit": "per_item" },
  { "type": "site_cleanup", "price": 250, "unit": "per_job" }
]
```

**`per_hour` and `per_day` appear ONLY here** — no other trade has a unit that is not one of the
four in the shared list. They ARE in this trade's `labels` map ("per hour", "per day"), so render
them the same way as every other slug. Do not special-case them, and do not fall back to
title-casing the slug: nothing in this response should ever reach a screen as `per_hour`.

Worth a line of copy on the screen: **none of this enters a customer's quote.** A customer cannot say
how many hours of excavation or how many posts their wall needs, so these are shown to the customer
as what is *not* included and quoted on site. A builder should understand that these figures are
recorded and published, not multiplied into anything.

### 2.4 `siteConditions` — a price OR a percentage, never both

```jsonc
"siteConditions": [
  { "condition": "restricted_access", "price": 450, "percent": null, "unit": "per_job" },
  { "condition": "sloped",            "price": null, "percent": 10,  "unit": null }
]
```

Exactly one of `price` and `percent` is set. Render `$450` or `+10%` accordingly; do not show the
null one, and do not assume `unit` is present when `percent` is.

### 2.5 `capabilities.engineering` — new, and the sensitive one

```jsonc
"engineering": { "text": "We arrange the engineering from $850 and council fees are the customer's.",
                 "price": 850, "isFromPrice": true }
```

Show `text` as the business's own words. When `price` is set and `isFromPrice` is `true`, render it
as **"from $850"** — `isFromPrice` exists so a "from" price is never shown as a firm one.

**Do not add any wording of your own about whether a wall needs engineering or council approval.**
Show only what the business wrote. Whether a particular wall needs approval depends on its height,
soil, load and location, and a sentence the screen invents is one a builder could repeat to a
customer.

All three fields can be `null` — a builder who never mentioned engineering gets an empty section, not
a placeholder claim.

## The rejected path is unchanged

```jsonc
{ "approved": false, "status": "unverified",
  "business": { "opening": "…", "fixes": [ { "kind": "missing", "what": "…", "example": "…" } ] } }
```

Same shape as every other trade. `fixes` is 3–5 items, written to be read by a tradesperson on a
phone after work — render them as a plain list and do not add headings, counts or severity badges.

## Done when

- The picker has a fourth entry and `trade: "retaining_wall"` goes out on submit, profile and confirm.
- Picking the trade adds `retaining_wall` to `services_provided` on the business document — check
  this by running a customer chat afterwards, not by looking at the business screen, which will
  look correct either way.
- The confirm screen shows the two rate tables as two clearly separate things.
- A builder with only `labour_only` rates sees a complete screen, not a broken one.
- `per_hour` and `per_item` render as words.
- The engineering section shows "from $850" and says nothing the business did not say.
- Confirm works end to end — until it is pressed, no customer can be quoted.
