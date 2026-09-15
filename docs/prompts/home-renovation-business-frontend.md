# Prompt — business side frontend, adding home renovation

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

---

You are updating the **business-facing** frontend of QuoteMy AI (React + Firebase). The backend now
supports a sixth trade, **home renovation**, alongside fencing, tiling, kitchen fitting, retaining
wall and decking.

## What this screen does today

A tradesperson types (or uploads) a description of what they charge. The backend either **approves**
it and returns the structured figures it extracted, or **rejects** it with a list of jobs to do.
Approved prices are **not live** until the business presses Confirm.

That flow is unchanged. Two things change, and the second one is the real work.

## Change 1 — the trade picker gains an entry

`POST /api/v1/business`, unchanged:

```jsonc
{ "action": "submit",  "businessUid": "...", "trade": "home_renovation", "text": "..." }
{ "action": "profile", "businessUid": "...", "trade": "home_renovation" }
{ "action": "confirm", "businessUid": "...", "trade": "home_renovation" }
```

`trade` **defaults to `"fencing"` when omitted**, so a renovation business that does not send it will
silently read and write the wrong document. Send it on all three actions. Get the list from
`GET /api/v1/client/trades` — do not hardcode it.

File uploads are unchanged: `businesses/{uid}/services/{trade}/{submissionId}/{filename}`.

## Change 1b — ⚠ `services_provided`, and the spelling trap

`businesses/{uid}` carries a `services_provided` array. Your app writes it — the backend only reads
it — and it is the only thing the customer search uses to decide which businesses to look at:

```js
where('services_provided', 'array-contains', 'home_renovation')
```

A renovator can submit, be approved, press **Confirm — go live**, and still be invisible to every
customer if their business document never said they do this trade.

**⚠ THIS IS A TWO-WORD TRADE, AND THE LAST TWO-WORD TRADE CAUSED A LIVE OUTAGE.** `retaining_wall`
was written by the frontend as `retaining-wall`, and a business whose prices were approved,
confirmed and live was invisible to every customer — with the business page and the chat each
correctly reporting the opposite thing, so nothing looked broken from either side.

The backend accepts **`home_renovation` and `home-renovation`** and nothing else. It does not
lower-case, strip spaces, or guess. So these are all invisible:

```
"renovation"          ✗    "renovations"      ✗
"home renovation"     ✗    "Home Renovation"  ✗
"home_renovation"     ✓    "home-renovation"  ✓
```

Write the underscore form. Before you ship, query your own Firestore for what is actually in there —
`services_provided` is your field and only you can see what previous versions of the app wrote.

## Change 2 — the confirm screen, and what is different about this trade

This is the real work. Every other trade's confirm screen shows one rate table. A renovator's
response carries **four kinds of priced work**, and three of them are not rates.

```jsonc
"pricing": {
  "enabledRooms": ["bathroom", "ensuite", "kitchen", "laundry", "bedroom", "living_room", …],

  // 1. THE RATES — keyed by room. Note there is no unit on any of them, and that is correct.
  "rates": {
    "bathroom": [
      { "jobType": "full_renovation", "supply": null, "price": 6850, "unit": "per_job" },
      { "jobType": "demolition_only", "supply": null, "price": 1450, "unit": "per_job" }
    ],
    "kitchen":  [ { "jobType": "full_renovation", "supply": null, "price": 4850, "unit": "per_job" } ]
  },

  "supplyModels": ["labour_only", "supply_and_install"],
  "materialPackages": [{ "label": "Kitchen cabinetry package", "price": 8950, "unit": "per_job" }],
  "removals": [{ "removes": "bathroom_strip", "price": 1450 }],
  "extras":   [{ "type": "waterproofing", "label": "Bathroom waterproofing", "price": 950, … }],

  // 2, 3, 4 — REAL WORK THAT IS NEVER QUOTED TO A CUSTOMER. Show all of it.
  "surfaces": [{ "label": "Standard wall plastering", "pricePerSqm": 65 }],
  "perItem":  [{ "label": "Internal door installation", "price": 280 }],
  "hourly":   [{ "label": "General carpentry", "price": 95, "unit": "per_hour" }],

  "minimumCharge": 450, "siteInspectionFee": 150, "consultationFee": 180, "travelFee": 95
}
```

**A price with no unit is not a bug.** Do not render "per job" or "per room" next to a room price,
and do not show a warning icon. A flat price for the room IS this trade's unit, and a renovator
shown their own correct list decorated with warnings will assume the system misread it.

**Show `surfaces`, `perItem` and `hourly` as their own sections, and label them honestly.** They are
captured in full and shown to the business, but a customer is never quoted from them — the chat
asks for no floor area, no door count and no hours, so multiplying by any of those would invent a
number. Something like *"Shown on your profile, quoted on site"* under each heading is enough. Do
not hide them: a renovator who cannot find their carpentry rate will assume it was lost.

**`supply: null` on a rate means the price covers either model.** Most renovators say once, at the
top of their list, that prices are labour and materials are separate — that is a null on every row,
not a gap. Render it as the business's own blanket statement, not as "unknown".

**The strip-out appears twice on purpose.** "Bathroom demolition $1,450" is one line on their list,
stored as both a `demolition_only` rate and a `removals` row, because a customer renovating the room
wants it added and one who only wants it gutted wants it as the whole job. Showing it in both places
is correct; the backend refuses to charge it twice.

## Change 3 — labels

Never render a slug. `GET /api/v1/client/trades` returns this trade's label map; use it.
`full_renovation` is "Full renovation", `labour_only` is "Installation only", `open_plan` is
"Open plan". On the BUSINESS side the factual wording wins — a renovator checking a price list
should read "Bathroom", never "Yes, strip it out", which is what the same slug means to a customer.

## What to test

1. A renovation business submits, is approved, confirms — then appears in a customer search.
   That last step is the one `services_provided` breaks.
2. The confirm screen shows all four kinds of priced work, and the room prices carry no unit and no
   warning.
3. A business that selected home renovation but never submitted does not appear as "live".
