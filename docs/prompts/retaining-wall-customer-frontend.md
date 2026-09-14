# Prompt — customer side chat frontend, adding retaining wall

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

---

You are updating the **customer-facing** quote chat of QuoteMy AI (React). The backend now supports
a fourth trade, **retaining wall**, alongside fencing, tiling and kitchen fitting.

**Read this first, because it decides how much work this is: if your chat renders questions, options
and the brief panel from what the server sends, this trade costs you NOTHING.** It appears by
itself, asks its own questions, and quotes. The work only exists if a field name is hardcoded in a
component.

## Nothing to send, nothing to deploy

`GET /api/v1/client/trades` now returns four:

```jsonc
{ "ok": true, "data": [ { "trade": "fencing",        "label": "fencing" },
                        { "trade": "tiling",         "label": "tiling" },
                        { "trade": "kitchen",        "label": "kitchen fitting" },
                        { "trade": "retaining_wall", "label": "retaining wall" } ] }
```

Read your picker from this. Do not hardcode it — the list is what is actually published, and a
hardcoded array is how a live trade stays invisible.

**The slug is `retaining_wall`, with an underscore.** Not `retaining-wall`, not `retainingWall`. It
is a Firestore document id as well as a wire value, so it has to match exactly.

The chat also routes to it from the customer's own words, so a shared entry point needs no picker at
all: *"I need a retaining wall quote"*, *"how much for a sleeper wall"*, *"concrete sleepers along
the back"*, *"a tiered wall for the slope"* all arrive on this trade without `trade` being sent.

Everything else about the endpoint is unchanged — same `POST /api/v1/client/chat`, same body, same
rule that `knownChecklist` is echoed back **whole, including `_ui`**.

## What a retaining wall conversation asks

Seven questions, and **you do not need to know any of them.** They come down the wire in `options[]`,
`message`, `checklistPending` and `checklistDisplay`. Listed only so your screens make sense:

```
suburb → wallType → supply → lengthMeters → heightKey → removal → drainage → conditions
```

Two are worth knowing about because they shape what a customer sees:

- **`supply` is asked SECOND, before either measurement**, and it is the question the price turns
  on. The same wall is about $145 a metre one way and $285 the other, because a builder either
  supplies the sleepers or installs the customer's own. It is NOT a line item added on top — it
  selects a whole different rate table.
- **`heightKey`** is asked of everyone even where it cannot change the price, because it decides
  whether engineering and council approval come into the job.

## ⚠ The one thing that can break

This trade shares exactly ONE field name with fencing — `lengthMeters` — and has nothing in common
with tiling or kitchen at all. There is no `material`, no `areaSqm`, no `jobType`, no `gateType`.

A brief panel that reads field names directly will render a half-empty retaining wall brief. Render
it from the two arrays the server already sends on every turn:

```jsonc
"checklistDisplay": {
  "suburb":   { "title": "Suburb",    "value": "Berwick, VIC 3806" },
  "wallType": { "title": "Wall type", "value": "Concrete sleepers" }
},
"checklistPending": [
  { "key": "supply",       "title": "Who supplies" },
  { "key": "lengthMeters", "title": "Length" },
  { "key": "heightKey",    "title": "Height" },
  { "key": "removal",      "title": "Old wall" },
  { "key": "drainage",     "title": "Drainage" },
  { "key": "conditions",   "title": "Site" }
]
```

`checklistDisplay` is what has been answered; `checklistPending` is what is still to come, in the
order it will be asked, with dependencies already applied. **Draw the panel from both.** Only
`checklistPending` keeps its order across the wire — an object does not.

A question turn looks exactly like every other trade's:

```jsonc
{
  "trade": "retaining_wall",
  "type": "question",
  "message": "Who's buying the materials?",
  "options": [
    { "label": "They supply the materials", "value": "supply_and_install" },
    { "label": "I'm buying the materials",  "value": "labour_only" },
    { "label": "Other",                     "value": "__other__" }
  ],
  "unit": "m"
}
```

## ⚠ `unit` — this trade is priced per LINEAR metre

```jsonc
{ "type": "result", "unit": "m", "avgRatePerMeter": 520,
  "results": [ { "businessName": "Berwick Retaining Wall",
                 "ratePerMeter": 520, "estimatedTotal": 11200,
                 "notes": "incl. GST · In your suburb · 4.8★ (52) · Materials supplied · Old wall removed · Drainage included" } ] }
```

**Render the rate as `$${ratePerMeter}` + the word `unit` gives you**, never a hardcoded `/m²`. The
trade's own name says "wall", which reads like an area, and it is not: a builder sells $395 per
metre of wall, and printing that as $395/m² is out by the height of the wall.

`unit` is `"m"` here, `"m2"` for tiling, `"item"` for kitchen, and `null` on the one turn that asks
which trade the customer wants. Handle the null.

`notes` is a `·`-joined string built by the server — render it as given. The first job badge is
always which supply model the quote is for, because it is most of the price.

## Two sentences the customer may get instead of a quote

Both arrive as an ordinary message and need no special handling — they are listed so you recognise
them as correct rather than as bugs:

- *"The builders near you do that wall, but not with the materials supplied the way you asked. Want
  to change who buys them?"* — the builder does build it, just the other way round. This turn
  carries real alternative offers in `results`.
- *"I found retaining wall builders near you, but none of them have finished setting up their
  pricing yet."* — a business has onboarded but has not pressed Confirm on its own screen. No price
  goes live without a human confirming it. This is the product working, not an error.

## Done when

- The picker is read from `GET /client/trades` and shows four trades.
- Typing *"I need a retaining wall"* into a shared entry point reaches the right questions.
- The brief panel fills in during a retaining wall conversation with no field name hardcoded.
- A result card reads "$520 a metre", not "$520 per m²".
