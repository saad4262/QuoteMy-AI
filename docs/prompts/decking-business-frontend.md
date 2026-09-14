# Prompt — business side frontend, adding decking

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

---

You are updating the **business-facing** frontend of QuoteMy AI (React + Firebase). The backend now
supports a fifth trade, **decking**, alongside fencing, tiling, kitchen fitting and retaining wall.

## What this screen does today

A tradesperson types (or uploads) a description of what they charge. The backend either **approves**
it and returns the structured figures it extracted, or **rejects** it with a list of jobs to do.
Approved prices are **not live** until the business presses Confirm.

That flow is unchanged. Two things change, and the second one is the real work.

## Change 1 — the trade picker gains an entry

`POST /api/v1/business`, unchanged:

```jsonc
{ "action": "submit",  "businessUid": "...", "trade": "decking", "text": "..." }
{ "action": "profile", "businessUid": "...", "trade": "decking" }
{ "action": "confirm", "businessUid": "...", "trade": "decking" }
```

`trade` **defaults to `"fencing"` when omitted**, so a decking business that does not send it will
silently read and write the wrong document. Send it on all three actions. Get the list from
`GET /api/v1/client/trades` — do not hardcode it.

File uploads are unchanged: `businesses/{uid}/services/{trade}/{submissionId}/{filename}`.

## Change 1b — ⚠ `services_provided`, and a warning specific to this trade

`businesses/{uid}` carries a `services_provided` array. Your app writes it — the backend only reads
it — and it is the only thing the customer search uses to decide which businesses to look at:

```js
where('services_provided', 'array-contains', 'decking')
```

A builder can submit, be approved, press **Confirm — go live**, and still be invisible to every
customer if their business document never said they do this trade.

**The warning specific to decking:** `decking` is ALREADY in live `services_provided` arrays, on at
least three businesses, written long before this backend served the trade. Those businesses are now
returned by the customer search and none of them has a price list. That is handled — the customer is
told *"There are decking businesses around your suburb, but none of them have confirmed their pricing
yet"* — but it means **your picker may already show decking as selected for a business that has never
submitted anything.** Check what your onboarding screen does when `services_provided` contains a
trade with no `services/{trade}` document behind it.

Single word, so no spelling trap here — unlike `retaining_wall`, which must carry its underscore.

## Change 2 — the confirm screen must render this trade's shape

On approval the response is `data.business`, with the same top-level keys as every other trade:

```
opening · pricing · capabilities · ratesSaved · otherOfferings · notUsed · alsoWorthAdding · labels · source · nextStep
```

`labels` is a flat `slug → human words` map and is **per trade** — use it to render every slug you
show, never a slug raw.

```jsonc
"pricing": {
  "gstIncluded": true,
  "enabledDeckMaterials": ["treated_pine", "merbau", "spotted_gum", "blackbutt", "composite"],
  "enabledDeckHeights": ["ground_level", "low_level", "elevated", "high_level"],
  "rates": { … },            // see 2.1
  "balustrades": [ … ],      // see 2.2 — THE one to get right
  "stairs": [ … ],           // see 2.3
  "screens": [ … ],
  "removals": [ … ],
  "siteConditions": [ … ],
  "extras": [ … ],
  "serviceArea": { "baseLocation": "Berwick", "resolved": {…}, "radiusKm": 20, "excludedAreas": [] },
  "minimumCharge": 1200, "siteInspectionFee": 150, "designFee": 450, "travelFee": 90
},
"capabilities": {
  "businessName": "Berwick Decks",
  "engineering": { "text": "…", "price": 890, "isFromPrice": true },
  "warranty": { "text": "Ten year workmanship warranty on our own work." },
  "tags": [], "inclusions": [], "exclusions": []
}
```

### 2.1 `rates` is grouped by HEIGHT, and the height is not decoration

```jsonc
"rates": {
  "ground_level": [ { "material": "treated_pine", "pricePerSqm": 280 }, { "material": "merbau", "pricePerSqm": 420 }, … ],
  "elevated":     [ { "material": "treated_pine", "pricePerSqm": 390 }, { "material": "merbau", "pricePerSqm": 540 }, … ]
}
```

Render it as a section or a column per height, with the boards inside. Up to four keys —
`ground_level`, `low_level`, `elevated`, `high_level` — and **a builder may have only some.** A
builder who lays merbau on the ground but not a storey up has a complete, publishable price list;
render whichever keys exist and do not show an empty section for the rest.

The same board appears at several heights at different prices, and that is correct rather than a
duplicate: the posts, bracing and deeper footings under an elevated deck are what the difference
pays for. Use `labels` for the height headings.

### 2.2 ⚠ THE BIG ONE — the balustrade is per LINEAR metre

```jsonc
"balustrades": [ { "type": "timber", "price": 220, "unit": "per_metre" }, { "type": "glass", "price": 520, "unit": "per_metre" } ]
```

A balustrade runs along the deck's **edge**, so it is priced per linear metre — never per square
metre of deck. If your screen labels this column "per m²" or groups it with the deck rates, a
builder will read their own railing price as being charged against the floor area behind it, which
on a 40m² deck is several times the railing that exists.

Give it its own section with its own unit, plainly labelled. The backend refuses a balustrade
submitted per square metre and tells the business why — your screen should not undo that.

### 2.3 `stairs` — read the `grade`, not the unit

```jsonc
"stairs": [
  { "grade": "timber",   "label": "Standard timber stair flight up to 5 steps", "price": 950,  "unit": "per_item" },
  { "grade": "hardwood", "label": "Hardwood stair flight up to 5 steps",        "price": 1350, "unit": "per_item" },
  { "grade": null,       "label": "Each additional step above five",            "price": 140,  "unit": "per_item" }
]
```

**A row with a `grade` is a flight. A row with `grade: null` is a per-step add-on.** The `unit` does
not tell them apart — the model reads both as `per_item` — so group and label them by `grade`.
Showing "$140" beside "$950" without that distinction reads as a contradiction.

### 2.4 `screens`, `removals`, `siteConditions`, `extras`

Straightforward lists, each row carrying `price` and `unit`. Two notes:

- **`per_hour` and `per_day` appear in `siteConditions`** (rock and tree roots are charged by the
  hour) and in no other trade's shared unit list. They ARE in this trade's `labels` as "per hour"
  and "per day" — render them the same way as every other slug, and never let `per_hour` reach a
  screen raw.
- `siteConditions` rows carry either `price` or `percent` — exactly one. Render `$450` or `+10%` and
  skip the null one.

### 2.5 `capabilities.engineering` — the sensitive one

When `isFromPrice` is true, render **"from $890"** rather than "$890".

**Do not add any wording of your own about whether a deck needs a permit or engineering.** Show only
what the business wrote. Whether a permit is required depends on the deck's height, its position and
the site, and a sentence the screen invents is one a builder could repeat to a customer. All three
fields can be null — a builder who never mentioned it gets an empty section, not a placeholder claim.

## The rejected path is unchanged

Same shape as every other trade: `fixes` is 3–6 items, written to be read by a tradesperson on a
phone after work. Render them as a plain list; do not add headings, counts or severity badges.

Two rejections this trade produces that are worth recognising as correct:

- *"Your balustrade is priced by the square metre — it runs along the deck edge, so we need it per
  linear metre."*
- *"Please do not say decks generally do not need a permit — it depends on the height, the boundary
  and the site."*

## Done when

- The picker has a fifth entry and `trade: "decking"` goes out on submit, profile and confirm.
- The confirm screen shows the rate table grouped by height, and a builder with only two heights
  sees a complete screen rather than two empty sections.
- The balustrade section is unmistakably per linear metre.
- The stairs section groups flights apart from the per-step add-on, by `grade`.
- `per_hour` renders as "per hour".
- The engineering section shows "from $890" and says nothing the business did not say.
