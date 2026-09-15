# Prompt — customer side chat frontend, adding home renovation

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

---

You are updating the **customer-facing** quote chat of QuoteMy AI (React). The backend now supports
a sixth trade, **home renovation**, alongside fencing, tiling, kitchen fitting, retaining wall and
decking.

**Read this first, because it decides how much work this is: if your chat renders questions, options
and the brief panel from what the server sends, this trade costs you NOTHING.** It appears by
itself, asks its own questions, and quotes.

## Nothing to send, nothing to deploy

`GET /api/v1/client/trades` now returns six:

```jsonc
{ "ok": true, "data": [ { "trade": "fencing",         "label": "fencing" },
                        { "trade": "tiling",          "label": "tiling" },
                        { "trade": "kitchen",         "label": "kitchen fitting" },
                        { "trade": "retaining_wall",  "label": "retaining wall" },
                        { "trade": "decking",         "label": "decking" },
                        { "trade": "home_renovation", "label": "home renovation" } ] }
```

Read your picker from this. Do not hardcode it — a hardcoded array is how a live trade stays
invisible.

The chat also routes to it from the customer's own words: *"I need a renovation quote"*, *"can you
renovate my whole house"*, *"bedroom renovation in Berwick"*, *"we want to remodel the living room"*
all arrive on this trade with no `trade` sent.

## ⚠ One routing change that affects trades you already have

This is the only thing in this document that is not purely additive, and it is worth knowing about
even though you do not have to do anything.

**A room that is being RENOVATED now goes to the renovator, not to the tiler or the kitchen fitter.**

| the customer says | used to reach | now reaches |
|---|---|---|
| "I want a bathroom renovation" | tiling | **home renovation** |
| "renovate my bathroom" | tiling | **home renovation** |
| "kitchen renovation quote" | kitchen fitting | **home renovation** |
| "retile the bathroom" | tiling | tiling — *unchanged* |
| "the ensuite needs waterproofing" | tiling | tiling — *unchanged* |
| "I need a new kitchen" | kitchen fitting | kitchen fitting — *unchanged* |

The rule is that the word *renovate / renovation / remodel / reno* wins over the room. A renovation
includes the tiling, and a tiler cannot do the rest of it. Nothing in your app decides this and
nothing needs changing — but if you have screenshots, test scripts or a demo that opens with
*"bathroom renovation"*, it will now land on a different trade and ask different questions.

Everything else about the endpoint is unchanged — same `POST /api/v1/client/chat`, same body, same
rule that `knownChecklist` is echoed back **whole, including `_ui`**.

## What a renovation conversation asks

Seven questions, and **you do not need to know any of them.** They come down the wire in `options[]`,
`message`, `checklistPending` and `checklistDisplay`. Listed only so your screens make sense:

```
suburb → room → jobType → supply → removal → extras → conditions
```

Two things about that list are worth noticing:

- **There is no quantity.** No length, no area, no count. A renovator prices the ROOM, so the chat
  never asks "how big is it". If your brief panel reserves a slot for a measurement, it will be
  empty on this trade — the same as kitchen fitting.
- **`removal` is conditional.** When the customer picks "just strip it out" as the job, the
  strip-out question is never asked, because the strip-out IS the job. Your panel should not show a
  gap waiting to be filled.

## The quote, and the thing that will look wrong but is right

```jsonc
{ "unit": "item",
  "results": [ { "businessName": "Berwick Home Renovations",
                 "estimatedTotal": 8450,
                 "ratePerMeter": 8450,
                 "badges": ["incl. GST", "In your suburb", "4.8★ (64)",
                            "You supply the materials", "Old one stripped out",
                            "Floor tiling measured on site, not in this price",
                            "Carpentry charged by the hour on site, not in this price",
                            "Includes $150 site inspection"] } ] }
```

**`unit` is `"item"`, so print the total and never a "/m".** `ratePerMeter` carries the whole job
price on this trade because there is no unit to divide by — a card rendering `${ratePerMeter}/m`
would read "$8,450 per metre" for a bathroom. Kitchen fitting has the same shape; if you already
handle `unit: "item"` there, you are done.

**Two badges will appear that no other trade produces, and they are load-bearing:**

> *"Floor tiling measured on site, not in this price"*
> *"Carpentry charged by the hour on site, not in this price"*

A renovator sells work by the square metre and by the hour as well as by the room. Those prices are
real and published — and the chat never asks for a floor area or for a number of hours, so they
cannot be totalled without inventing a number. The badge is how the customer is told. **Render
badges in full and do not truncate this list**: a customer who asked for tiling, sees no mention of
it, and assumes it is in the $8,450 has been misled by the UI rather than by the quote.

## Labels

Never render a slug. The label map comes down with the trade. On the CUSTOMER side the conversational
wording wins — `labour_only` is *"I'm supplying the materials"*, `open_plan` is *"Knocking rooms
together — open plan"*, `demolition_only` is *"Just strip it out"*.

## What to test

1. The picker shows six trades, read from the endpoint.
2. *"I want to renovate my bathroom in Berwick"* reaches home renovation and asks about the room.
3. A completed quote prints a total with no "/m" anywhere on the card.
4. Every badge is visible, including the two "not in this price" ones.
5. Picking "just strip it out" never shows a pending strip-out question.
