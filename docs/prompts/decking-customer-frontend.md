# Prompt — customer side chat frontend, adding decking

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

---

You are updating the **customer-facing** quote chat of QuoteMy AI (React). The backend now supports
a fifth trade, **decking**, alongside fencing, tiling, kitchen fitting and retaining wall.

**Read this first, because it decides how much work this is: if your chat renders questions, options
and the brief panel from what the server sends, this trade costs you NOTHING.** It appears by
itself, asks its own questions, and quotes.

## Nothing to send, nothing to deploy

`GET /api/v1/client/trades` now returns five:

```jsonc
{ "ok": true, "data": [ { "trade": "fencing",        "label": "fencing" },
                        { "trade": "tiling",         "label": "tiling" },
                        { "trade": "kitchen",        "label": "kitchen fitting" },
                        { "trade": "retaining_wall", "label": "retaining wall" },
                        { "trade": "decking",        "label": "decking" } ] }
```

Read your picker from this. Do not hardcode it — a hardcoded array is how a live trade stays
invisible.

The chat also routes to it from the customer's own words: *"I need a decking quote"*, *"how much for
a new deck"*, *"merbau deck, about 30 square metres"*, *"looking for a deck builder"* all arrive on
this trade with no `trade` sent.

Everything else about the endpoint is unchanged — same `POST /api/v1/client/chat`, same body, same
rule that `knownChecklist` is echoed back **whole, including `_ui`**.

## What a decking conversation asks

Ten questions, and **you do not need to know any of them.** They come down the wire in `options[]`,
`message`, `checklistPending` and `checklistDisplay`. Listed only so your screens make sense:

```
suburb → deckHeight → material → areaSqm → attachment → removal
       → balustrade → balustradeLm → stairs → stairFlights → conditions
```

Two things are worth knowing:

- **`deckHeight` is asked FIRST**, before the board, and it is the only trade here whose opening
  question is not what the thing is made of. Height decides what is UNDER the deck — posts,
  bracing, deeper footings, stairs — so it is half the rate rather than a finish on it.
- **Two questions are conditional.** `balustradeLm` is only asked when a balustrade was chosen, and
  `stairFlights` only when stairs were. Your screen needs to do nothing about this — they simply do
  not appear in `checklistPending` — but do not hardcode a question count or a progress bar out of
  a fixed number of steps.

## ⚠ The one thing that can break

Decking shares **no field name at all** with fencing, kitchen or retaining wall, and only `areaSqm`
with tiling. There is no `material`… actually there is, and that is the trap: `material` here means
the decking BOARD, not a fence type, and its values are a different closed list.

Render the brief panel from the two arrays the server sends on every turn, never from field names:

```jsonc
"checklistDisplay": {
  "suburb":     { "title": "Suburb",   "value": "Berwick, VIC 3806" },
  "deckHeight": { "title": "Height",   "value": "Up high — needs stairs" },
  "material":   { "title": "Decking",  "value": "Merbau" }
},
"checklistPending": [
  { "key": "areaSqm",    "title": "Size" },
  { "key": "attachment", "title": "Attachment" },
  { "key": "removal",    "title": "Old deck" },
  { "key": "balustrade", "title": "Balustrade" },
  { "key": "stairs",     "title": "Stairs" },
  { "key": "conditions", "title": "Site" }
]
```

Only `checklistPending` keeps its order across the wire — an object does not.

## ⚠ `unit` — per square metre, but the quote is not only square metres

```jsonc
{ "type": "result", "unit": "m2", "avgRatePerMeter": 625,
  "results": [ { "businessName": "Berwick Decks",
                 "ratePerMeter": 625, "estimatedTotal": 19815,
                 "notes": "incl. GST · 0.7 km away · 4.7★ (220) · Old deck removed · 12m of balustrade included · Stairs included · Includes $450 design" } ] }
```

**Render the rate as `$${ratePerMeter}` + the word `unit` gives you**, never a hardcoded `/m`.
`unit` is `"m2"` here, `"m"` for fencing and retaining wall, `"item"` for kitchen, and `null` on the
one turn that asks which trade the customer wants. Handle the null.

`ratePerMeter` is the all-in figure **per square metre of deck**. The balustrade and the stairs are
already inside `estimatedTotal` as their own quantities — the balustrade by its linear metres, the
stairs by the flight — so **do not try to derive the total from the rate and the area.** It will not
reconcile, and it is not meant to.

`notes` is a `·`-joined string built by the server — render it as given.

## Two answers the customer may get instead of a quote

Both arrive as an ordinary message. Listed so you recognise them as correct rather than as bugs:

- *"Nobody near you does Spotted gum at well off the ground. The closest they can do is Treated pine
  at…"* — the builder works at that height but does not lay that board. This turn carries real
  alternative offers in `results`.
- *"There are decking businesses around Berwick, VIC 3806, but none of them have confirmed their
  pricing yet."* — registered for the trade, no price list live yet. **Note there is no "try a
  different suburb?" on this one and the suburb is NOT cleared**: their suburb is covered and
  changing it cannot help. Do not add a suburb re-prompt of your own here.

## Done when

- The picker is read from `GET /client/trades` and shows five trades.
- Typing *"I need a merbau deck"* into a shared entry point reaches the right questions.
- Saying "no balustrade" does not leave a stranded "how many metres?" step in your progress UI.
- A result card reads "$625 per m²", not "$625 a metre" — and does not try to recompute the total.
