# Prompt — business side frontend, adding tiling

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

---

You are updating the **business-facing** frontend of QuoteMy AI (React + Firebase). The backend now
supports a second trade, **tiling**, alongside fencing. Your job is to let a tiling business onboard
and confirm its prices.

## What this screen does today

A tradesperson types (or uploads) a description of what they charge. It goes to one endpoint. The
backend either **approves** it and returns the structured figures it extracted, or **rejects** it
with a list of jobs to do. Approved prices are **not live** until the business presses Confirm.

That flow is unchanged. Two things change.

## Change 1 — a trade picker, and send `trade` on every call

The endpoint is unchanged: `POST /api/v1/business`, with an `action` field.

```jsonc
{ "action": "submit",  "businessUid": "...", "trade": "tiling", "text": "..." }
{ "action": "profile", "businessUid": "...", "trade": "tiling" }
{ "action": "confirm", "businessUid": "...", "trade": "tiling" }
```

`trade` is `"fencing"` or `"tiling"`. **It defaults to `"fencing"` when omitted**, so a tiling
business that does not send it will read and write the wrong document. Send it on all three actions.

Get the list of live trades from `GET /api/v1/client/trades`:

```jsonc
{ "ok": true, "data": [ { "trade": "fencing", "label": "fencing" },
                        { "trade": "tiling",  "label": "tiling"  } ] }
```

Do not hardcode the list — this returns only trades that are actually published.

File uploads are unchanged and already per-trade:
`businesses/{uid}/services/{trade}/{submissionId}/{filename}`.

## Change 2 — the confirm screen must render tiling's shape

This is the real work. **No price goes live without the business confirming it on this screen**, so
if the screen cannot show tiling's figures, a tiler cannot go live.

On approval the response is `data.business`, with these keys (same for both trades):

```
opening · pricing · capabilities · ratesSaved · otherOfferings · notUsed · alsoWorthAdding · labels · source · nextStep
```

`opening`, `notUsed`, `alsoWorthAdding`, `nextStep` and `source` render exactly as they do for
fencing. `labels` is a flat `slug → human words` map, and it is now **per trade** — use it to render
every slug you show.

What differs is `pricing` and `capabilities`.

### Fencing (what you render today)

```jsonc
"pricing": {
  "enabledMaterials": ["colorbond"],
  "rates": { "colorbond": { "1.8m": 110 } },        // material → height → $ per metre
  "removals": [ { "removes": "timber", "pricePerMetre": 18 } ],
  "gates": [ { "gateType": "pedestrian_single", "material": null, "price": 480, "isFromPrice": false } ],
  "siteConditions": [ { "condition": "sloped", "extraPerMetre": null, "extraPercent": 10 } ],
  "serviceArea": { "baseLocation": "Berwick", "radiusKm": 30, "excludedAreas": [], "resolved": {...} },
  "minimumCharge": 850, "gstIncluded": true
},
"capabilities": { "businessName", "specs", "permits", "warranty": { "years", "text" },
                  "tags", "extras", "inclusions", "exclusions" }
```

### Tiling (new)

```jsonc
"pricing": {
  "supplyModels": ["supply_and_install", "labour_only"],
  "enabledJobTypes": ["floor_only", "bathroom"],

  // job → a LIST of rows. tileType null = the price covers any tile.
  // EVERY ROW CARRIES ITS OWN UNIT.
  "rates": {
    "floor_only": [ { "tileType": null,        "price": 65,   "unit": "per_sqm" },
                    { "tileType": "porcelain", "price": 72,   "unit": "per_sqm" } ],
    "bathroom":   [ { "tileType": null,        "price": 4850, "unit": "per_job" } ]
  },

  "tileSupply":     [ { "label": "Urban Grey Porcelain 600x600", "tileType": "porcelain", "pricePerSqm": 45 } ],
  "prep":           [ { "type": "floor_levelling", "price": 650, "unit": "per_job" } ],
  "removals":       [ { "removes": "ceramic", "pricePerSqm": 45 } ],
  "waterproofing":  [ { "area": "bathroom", "price": 950 } ],
  "siteConditions": [ { "condition": "second_storey", "extraPerSqm": null, "extraPercent": 10 } ],
  "serviceArea":    { "baseLocation": "Pakenham", "radiusKm": 25, "excludedAreas": [], "resolved": {...} },
  "minimumCharge": 350, "callOutFee": 95, "travelFee": 75, "gstIncluded": true
},
"capabilities": { "businessName", "warranty": { "text" },
                  "tags", "extras", "inclusions", "exclusions" }
```

**Four things to get right:**

1. **`rates[job]` is an array, not a nested object.** Fencing nests material → height. Tiling keys
   by job and gives you rows.
2. **Read `unit` on every rate row.** `per_sqm` renders as `$65 / m²`. `per_job` renders as a flat
   price — `$4,850 for the job`. Rendering a per-job package as a per-m² rate is the worst error
   available on this screen.
3. **`tileType: null` means "any tile".** Render it as something like *Any tile* — not as a blank.
4. **Tiling has no `specs` and no `permits`, and `warranty` has no `years`** — only `text`. Do not
   render empty sections for them.

`siteConditions` rows carry **either** `extraPerSqm` **or** `extraPercent`, never both; the other is
`null`. Same convention fencing already uses.

### A note on `labels`

Tiling's slugs repeat across groups — `bathroom` is both a job and a wet area, `ceramic` is both a
tile and something being removed. The flat `labels` map resolves those to the factual name
("Bathroom"). If you build a per-trade renderer, that is fine and correct.

## Rejected path — unchanged

`data.approved === false` returns `business.fixes` (`{ kind: "missing" | "unclear", what, example }`)
and `business.alsoWorthAdding`. Identical for both trades; only the wording differs.

## Empty state — unchanged, and already tiling-aware

When nothing usable arrived, `business.whatToSend` comes back with `{ need, helpful, example }`
already written for the trade that was sent. Render it as you do now.

## Acceptance

- A tiler can pick "tiling", submit, be approved, **read every figure on the confirm screen**, and
  press Confirm.
- A fencing business sees exactly what it sees today.
- A `per_job` rate is never displayed with a `/m²` suffix.
