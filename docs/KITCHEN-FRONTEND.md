# Adding kitchen — what the frontend has to change

Companion to `docs/FRONTEND.md` and `docs/TILING-FRONTEND.md`, both of which stay correct.
This file covers only what changes when kitchen becomes the third trade.

**The backend is done and deployed-ready** — branch `kitchen-trade`, 557 tests, typecheck and build
clean. Everything below is live on that branch and safe to build against now.

**Read `docs/TILING-FRONTEND.md` §1 first.** Every generic rule there — the renamed chat endpoint,
the optional `trade` in the body, the generic checklist panel, per-trade storage paths — already
covers kitchen and is not repeated here.

---

## 0. The one-line summary

| | Customer side | Business side |
|---|---|---|
| **Work needed** | **None.** Kitchen appears by itself | **A trade picker entry, and a confirm-screen renderer** |
| **Why** | `GET /client/trades` reads what is published | `POST /business` takes `trade`, and nothing lists the trades a business may pick |

There is one thing to check on BOTH sides: **§4, the result card unit.** Kitchen makes an existing
naming problem visibly wrong rather than subtly wrong.

---

## 1. Customer side — nothing to do

`GET /api/v1/client/trades` now returns three:

```jsonc
{ "ok": true, "data": [ { "trade": "fencing", "label": "fencing" },
                        { "trade": "tiling",  "label": "tiling"  },
                        { "trade": "kitchen", "label": "kitchen fitting" } ] }
```

This list is read from what is **published in Firestore**, not from a hardcoded array. The server
seeds `schema/kitchen` on boot, so kitchen appears on the picker **the first time the new backend
starts** — with no frontend deploy.

The chat routes to it on the customer's own words too (`"I need a new kitchen"`, `"replacing our
kitchen cabinets"`, `"flat pack kitchen install"`), exactly as described in TILING-FRONTEND §2.1a.

### 1.1 What a kitchen conversation asks

Seven questions, and — as with tiling — **you do not need to know any of them.** They come down the
wire in `options[]`, `message`, `checklistPending` and `checklistDisplay`. Listed only so the screens
make sense:

```
suburb → jobType → kitchenSize → supply → benchtop → removal → extras
```

- **`kitchenSize`** (small / standard / large) is the one that finds the price. There is no quantity
  question anywhere in this trade — see §2.1.
- **`supply`** is "who is buying the cabinets", kitchen's version of tiling's tile-supply split. It
  is the single biggest swing in the quote: a cabinetry package is ~$8,950.
- **`benchtop` and `removal` are not blocking.** A business with no benchtop price still quotes; the
  customer is told it is not included.

### 1.2 ⚠ If your brief panel has any field name hardcoded, this is where it breaks

TILING-FRONTEND §1.5 said this and it is worth saying again, because kitchen has **no field in
common with fencing at all** — no `material`, no `heightKey`, no `lengthMeters`, and no quantity
field of any kind. A panel that reads those names renders an empty kitchen brief.

---

## 2. Business side — the real work

### 2.1 Kitchen breaks the assumption fencing and tiling share

Fencing sells linear metres, tiling sells square metres. **A kitchen fitter sells neither.** The
installation is ONE PRICE for the whole job, keyed by size:

```
Small $1,950     Standard $2,850     Large $4,250     Base cabinet $180 each
```

So there is no rate × quantity anywhere on this screen. A rate row's `unit` is `per_job` or
`per_item` and never `per_metre` or `per_sqm`.

### 2.2 The trade picker

`POST /api/v1/business` accepts `trade: "kitchen"` today. Add it to the onboarding picker, and send
it on **every** call for that business — `submit`, `profile` and `confirm` — exactly as for tiling.

There is deliberately **no endpoint listing the trades a business may pick**. `/client/trades`
returns only what is *published*, which is the wrong list here: a business must be able to onboard
into a trade nobody has onboarded into yet, otherwise no trade ever gets its first business. So this
one list is hardcoded on your side. Three values: `fencing`, `tiling`, `kitchen`.

### 2.3 The confirm screen — kitchen's verified shape

Real, from `tests/golden/__snapshots__/business-05-*.md`, which is Beky Kitchens' own price list:

```jsonc
{
  "gstIncluded": true,
  "supplyModels": ["supply_and_install", "labour_only"],
  "enabledKitchenSizes": ["small", "standard", "large"],

  // Keyed by job type. "general" holds rates whose line named no job type - which is most of them.
  "rates": {
    "general": [
      { "size": "small",    "label": null,                       "price": 1950, "unit": "per_job"  },
      { "size": "standard", "label": null,                       "price": 2850, "unit": "per_job"  },
      { "size": "large",    "label": null,                       "price": 4250, "unit": "per_job"  },
      { "size": null,       "label": "Base cabinet installation", "price": 180,  "unit": "per_item" },
      { "size": null,       "label": "Wall cabinet installation", "price": 165,  "unit": "per_item" },
      { "size": null,       "label": "Tall cabinet installation", "price": 280,  "unit": "per_item" },
      { "size": null,       "label": "Drawer unit installation",  "price": 190,  "unit": "per_item" }
    ]
  },

  "cabinetSupply": [ { "label": "Standard Custom Kitchen Cabinet Package", "price": 8950, "unit": "per_job" } ],
  "benchtops":     [ { "material": "laminate", "price": 850 }, { "material": "stone", "price": 1250 } ],
  "removals":      [ { "removes": "full_demolition", "price": 1650 }, { "removes": "cabinets_only", "price": 950 } ],
  "prep":          [ { "type": "wall_prep", "price": 350, "unit": "per_job" } ],
  "extras":        [ { "type": "island", "label": "Standard island installation", "price": 650, "unit": "per_item" } ],

  "minimumCharge": 450, "siteMeasureFee": 120, "travelFee": 85,
  "serviceArea": { "baseLocation": "Pakenham", "radiusKm": 30, "resolved": { … } }
}
```

**Four things this screen must get right:**

1. **`size` and `label` are both nullable, and each null means something.** `size: null` with a
   `label` is a per-cabinet price. `size` named with `label: null` is a whole-kitchen price. Render
   them as two groups, not one table.

2. **`label` is the business's own wording and MUST be shown on per-item rows.** "Base $180, wall
   $165, tall $280, drawer $190" are four different cabinets. This exact case cost three real prices
   in testing when they were not told apart.

3. **`siteMeasureFee` is kitchen's own field.** Fencing has `callOutFee`; kitchen has
   `siteMeasureFee` (what they charge to come and measure). Do not map one onto the other.

4. **`cabinetSupply` is the labour/material split**, kitchen's equivalent of tiling's `tileSupply`.
   It only applies when `supplyModels` contains `supply_and_install`.

### 2.4 What a kitchen business is asked to send

`WHAT_TO_SEND` comes back in the rejected-path response and is already kitchen's own — render it as
you do for the other two, no change. It asks for nine things; the blocking rules are K1–K9 in
`app/src/prompts/sop/kitchen/rules.md`.

### 2.5 Confirm is still non-negotiable

`pending → verified → confirmed`, and `confirmedAt` is only ever set by the business pressing
**Confirm — go live** on your screen. A kitchen business that submits and never confirms is invisible
to every customer, with no error anywhere — this has already happened once in testing and looked
exactly like a matching bug.

---

## 3. Voice — nothing to do

The Retell flow carries no trade content. The only change kitchen needed was `boosted_keywords` in
`retell/agent.json`, which is already committed. See `retell/README.md`.

---

## 4. ⚠ The result card unit — kitchen makes this visible

TILING-FRONTEND §2.4 flagged this and it is now worth acting on.

The wire fields are still called `ratePerMeter` and `avgRatePerMeter`. They are **not** per metre:

| Trade | What the field actually holds |
|---|---|
| fencing | a price per linear metre |
| tiling | a price per **square** metre |
| **kitchen** | **the whole job price** |

A real kitchen result:

```jsonc
{ "ratePerMeter": 15470, "estimatedTotal": 15470 }
```

So a card that prints `${ratePerMeter}/m` shows **"$15,470 per metre"** for a kitchen. For tiling the
same bug is a wrong unit; for kitchen it is a nonsense number.

Two options, same as before, and the first is now clearly worth doing:

- **The server adds a `unit` field** (`"m" | "m2" | "item"`) and you render whatever it says —
  **recommended**. `PricingSpec.unit` already carries exactly this value per trade; it simply is not
  on the wire yet. Ask for it and it is a small change.
- The frontend maps trade → unit itself.

**Until one of those lands, do not print a hardcoded "per metre" on any screen that can show
kitchen.** For kitchen, prefer `estimatedTotal` and the `notes` string, which are already correct:

```
"incl. GST · 12.6 km away · 4.7★ (64) · Cabinetry supplied · Old kitchen removed ·
 Benchtop installed · 1 extra included · Includes $120 site measure"
```

---

## 5. What is NOT changing

- The two-panel approved/rejected onboarding flow, and every field in it.
- `quoteResults/{resultId}`, `firestore.rules`, storage paths — all trade-agnostic already.
- Error envelopes, limits, upload handling, the voice endpoints.
- Anything in `docs/FRONTEND.md` or `docs/TILING-FRONTEND.md` not contradicted above.
