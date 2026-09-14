# Prompt — is the frontend actually ready for decking? (both sides)

Paste everything below the line into your editor / AI assistant. It is self-contained.

This is **not** a work order. It is a list of questions. Answer each one with what the code actually
does — not what it should do — and send the answers back. A "no" is a useful answer; a guess is not.

---

You are auditing the QuoteMy AI frontend (React + Firebase) against a fifth trade the backend now
supports: **decking**, slug `decking`.

The backend is live and verified end to end against the real model and real data. Everything below
is about whether the **frontend** is ready. Go through every question, look at the actual code, and
answer with one of:

- **OK** — and say which file/component makes it so
- **BROKEN** — and say what it does instead
- **NOT SURE** — and say what you would need to check

Do not fix anything yet. Report first.

---

## A. Customer side (the quote chat)

The backend sends the questions, the options, the labels and the brief panel. If your chat renders
what it is given, this trade costs nothing. These questions are only about whether it does.

**A1.** Is the trade picker built from `GET /api/v1/client/trades`, or is the list hardcoded
anywhere in the app? It now returns **five** entries. A hardcoded array is how a live trade stays
invisible.

**A2. ⚠ The field-name trap, and it is subtler than the last trade's.** Does the brief / checklist
panel render from `checklistDisplay` and `checklistPending`, or does any component read field names
directly?

Decking's fields are:

```
suburb · deckHeight · material · areaSqm · attachment · removal
       · balustrade · balustradeLm · stairs · stairFlights · conditions
```

It shares `areaSqm` with tiling and **`material` with fencing — and that is the trap.** Same field
name, completely different closed list of values: `treated_pine`, `merbau`, `spotted_gum`,
`blackbutt`, `jarrah`, `composite`, `pvc`. Anything that maps `material` to a fence-type icon, a
fence-type label table, or a fence image will render a deck as a fence with no error anywhere.
Answer specifically: **is there any per-value lookup keyed on `material` in the app?**

**A3. ⚠ Two questions are conditional.** `balustradeLm` is only asked when a balustrade was chosen;
`stairFlights` only when stairs were. They simply do not appear in `checklistPending` otherwise, so
your screen should need to do nothing — but:

- Is there a hardcoded question count, a "step 4 of 10", or a progress bar built from a fixed
  number of steps anywhere?
- Does a skipped field leave a stranded row in the brief panel?

**A4.** How does a result card print the rate? Show the exact line. It must use the `unit` field
from the response, never a hardcoded `/m` or `/m²`.
`unit` is `"m2"` for decking and tiling, `"m"` for fencing and retaining wall, `"item"` for kitchen.

**A5. ⚠ THE BIG ONE on this side. Does anything recompute or cross-check the total?** A real
decking result:

```jsonc
{ "type": "result", "unit": "m2", "avgRatePerMeter": 625,
  "results": [ { "businessName": "Berwick Decks",
                 "ratePerMeter": 625, "estimatedTotal": 19365,
                 "notes": "incl. GST · In your suburb · 4.9★ (78) · Old deck removed · 12m of balustrade included · Stairs included · Includes $150 site inspection" } ] }
```

625 × 25m² = 15,625, and the total is 19,365. **That is correct.** A decking quote carries three
different quantities: the deck in square metres, the balustrade in linear metres along its edge, and
the stairs by the flight. The balustrade and the stairs are already inside `estimatedTotal`.

So: does any code derive, validate, or display a total from `ratePerMeter × areaSqm`? Any "check
your maths" assertion, any client-side subtotal, any "(approx $X/m²)" caption computed locally? It
will not reconcile on this trade and it is not meant to.

**A6.** What happens when `unit` is `null`? It is null on the one turn that asks which trade the
customer wants. Does the card/badge code handle that, or render "per null"?

**A7.** Is `knownChecklist` echoed back **whole, including `_ui`**, on every turn? A trimmed copy
loses which trade the conversation settled on.

**A8.** `areaSqm` accepts the customer's own wording — "5m x 4m", "270 sq ft" — and the conversion
is done on the **server**. Does your input box pre-parse, strip, or validate the number before
sending? If it forces a bare number, the customer has to do the sum before we will listen.

---

## B. Business side (onboarding and the confirm screen)

This is where the real work is. In order of how much damage a wrong answer does.

**B1. ⚠ THE BIG ONE. The balustrade is priced per LINEAR metre.**

```jsonc
"balustrades": [ { "type": "timber", "price": 220, "unit": "per_metre" },
                 { "type": "glass",  "price": 520, "unit": "per_metre" } ]
```

A balustrade runs along the deck's **edge**, so it is measured in linear metres — never in square
metres of deck. Does the confirm screen give it its own section with its own unit, plainly labelled?
Or is it grouped with the deck rates, or under a column header that says "per m²"?

Take a screenshot of the whole pricing panel, scrolled to the bottom, and include it in your answer.

Get this wrong and a builder reads their own railing price as being charged against the floor area
behind it — on a 40m² deck with 12m of railing, that is more than three times the railing that
exists. The backend **rejects** a balustrade submitted per square metre and tells the business why;
the screen must not undo that.

**B2. `pricing.rates` is grouped by HEIGHT, and a builder may have only some heights.**

```jsonc
"rates": {
  "ground_level": [ { "material": "treated_pine", "pricePerSqm": 280 }, { "material": "merbau", "pricePerSqm": 420 }, … ],
  "elevated":     [ { "material": "treated_pine", "pricePerSqm": 390 }, { "material": "merbau", "pricePerSqm": 540 }, … ]
}
```

Up to four keys — `ground_level`, `low_level`, `elevated`, `high_level`. Two questions:

- Does the screen render a section or column per height that exists, and **no empty section for the
  ones that do not**? A builder who lays merbau on the ground but not a storey up has a complete,
  publishable price list.
- The same board appears under several heights at different prices. Does the screen present that as
  correct rather than as a duplicate? The posts, bracing and deeper footings under an elevated deck
  are what the difference pays for.

**B3. `stairs` — read the `grade`, not the `unit`.**

```jsonc
"stairs": [
  { "grade": "timber",   "label": "Standard timber stair flight up to 5 steps", "price": 950,  "unit": "per_item" },
  { "grade": "hardwood", "label": "Hardwood stair flight up to 5 steps",        "price": 1350, "unit": "per_item" },
  { "grade": null,       "label": "Each additional step above five",            "price": 140,  "unit": "per_item" }
]
```

A row with a `grade` is a **flight**. A row with `grade: null` is a **per-step add-on**. The `unit`
does not tell them apart — the live model returns `per_item` for both. Does the screen group and
label them by `grade`? "$140" sitting beside "$950" with no distinction reads as a contradiction.

**B4.** Are these sections rendered at all? `pricing.screens`, `pricing.removals`,
`pricing.siteConditions`, `pricing.extras`, `capabilities.engineering`.

**B5. `per_hour` and `per_day`.** `siteConditions` on this trade is charged by the hour — rock
excavation, tree roots. Both slugs ARE in this trade's `labels` map. Is every slug rendered through
`labels`, or does anything fall back to title-casing the raw slug? Check specifically:
`ground_level`, `high_level`, `treated_pine`, `spotted_gum`, `timber_batten`, `timber_deck`,
`per_hour`, `per_day`. None of them should ever reach a screen raw.

**B6.** `pricing.siteConditions` rows carry either `price` or `percent` — exactly one, never both.
Does the screen render `$450` or `+10%` correctly and skip the null one?

**B7. `capabilities.engineering` carries `{ text, price, isFromPrice }`.** When `isFromPrice` is
true, does the screen render **"from $890"** rather than "$890"?

And: does the screen add ANY wording of its own about whether a deck needs a building permit or
engineering? It must not. Show only what the business wrote. Whether a permit is required depends on
the deck's height, its position, how close it is to a boundary and whether it is attached to the
house — and a sentence the screen invents is one a builder could repeat to a customer. All three
fields can be null; a builder who never mentioned it gets an empty section, not a placeholder claim.

**B8. ⚠ THE ONE SPECIFIC TO THIS TRADE — `decking` is ALREADY in live `services_provided` arrays.**

At least three businesses carry `decking` on their `businesses/{uid}` document, written by the
frontend long before the backend served the trade. None of them has ever published decking pricing.

The backend only ever READS that array; the customer search is:

```js
where('services_provided', 'array-contains', 'decking')
```

So those businesses are now returned by the customer search with no price list behind them. The
backend handles it — the customer is told *"There are decking businesses around your suburb, but
none of them have confirmed their pricing yet"* — but answer these:

- What does your onboarding screen do when `services_provided` contains a trade with **no
  `services/{trade}` document behind it**? Does the picker show decking as already selected? Does
  the dashboard show an empty or broken pricing card?
- Where in the code is `services_provided` written, and what exact string does it write?

Single word, so no spelling trap here — unlike `retaining_wall`, which must carry its underscore.
That one already cost a confirmed business its visibility to every customer.

**B9.** Does `trade: "decking"` go out on **all three** actions — `submit`, `profile` and `confirm`?
It defaults to `"fencing"` when omitted, so a missing one reads and writes the wrong document
silently.

**B10.** If the confirm screen is re-opened later (not straight after a submission), what does it
render from? The `submit` response carries `labels`; the `profile` response returns
`{ pricing, capabilities, submissions }` and carries **no labels at all** — true for every trade,
not just this one. If your screen renders slugs from a `profile` read, where do its labels come
from?

**B11.** `pricing.enabledDeckMaterials` and `pricing.enabledDeckHeights` — note the names. They are
**not** `enabledMaterials`, which is fencing's. Does anything in the confirm screen read
`enabledMaterials` generically across trades? On decking it will be undefined.

---

## C. Answers that are correct, not bugs

Listed so you recognise them while testing:

- *"Nobody near you does Spotted gum at well off the ground — a storey or so. The closest they can do
  is Treated pine at well off the ground — a storey or so, $14,250 from Berwick Decks. Want one of
  these instead?"* — the builder works at that height but does not lay that board. This turn carries
  real alternative offers in `results`.
- *"There are decking businesses around Berwick, VIC 3806, but none of them have confirmed their
  pricing yet."* — registered for the trade, no price list live yet. **There is deliberately no "try
  a different suburb?" on this one, and the suburb is NOT cleared** — their suburb is covered and
  changing it cannot help. Does your UI add a suburb re-prompt or reset of its own here? It should
  not.

---

## D. One cross-trade question

**D1.** Is there a `switch` or `if` on the trade slug anywhere — routing, icons, headings, analytics
events, a confirm-screen renderer? List every one you find and say what its default branch does.
Five trades now exist; a `switch` whose default is fencing is how a deck gets rendered as a fence
with nothing in the console.

---

## How to answer

One line per question: `A1 — OK, TradePicker.tsx reads /client/trades`. Then, at the end, list only
the BROKEN ones in the order you would fix them. Include the B1 screenshot.
