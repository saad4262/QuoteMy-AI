# Prompt — is the frontend actually ready for retaining wall? (both sides)

Paste everything below the line into your editor / AI assistant. It is self-contained.

This is **not** a work order. It is a list of questions. Answer each one with what the code actually
does — not what it should do — and send the answers back. A "no" is a useful answer; a guess is not.

---

You are auditing the QuoteMy AI frontend (React + Firebase) against a fourth trade the backend now
supports: **retaining wall**, slug `retaining_wall`.

The backend is live and verified end to end. Everything below is about whether the **frontend** is
ready. Go through every question, look at the actual code, and answer with one of:

- **OK** — and say which file/component makes it so
- **BROKEN** — and say what it does instead
- **NOT SURE** — and say what you would need to check

Do not fix anything yet. Report first.

---

## A. Customer side (the quote chat)

The backend sends the questions, the options, the labels and the brief panel. If your chat renders
what it is given, this trade costs nothing. These questions are only about whether it does.

**A1.** Is the trade picker built from `GET /api/v1/client/trades`, or is the list hardcoded
anywhere in the app? It now returns four entries. A hardcoded array is how a live trade stays
invisible.

**A2.** Does the brief / checklist panel render from `checklistDisplay` and `checklistPending`, or
does any component read field names directly (`material`, `heightKey`, `areaSqm`, `jobType`,
`gateType`)?
This trade shares exactly ONE field name with fencing — `lengthMeters` — and nothing at all with
tiling or kitchen. Its fields are: `suburb`, `wallType`, `supply`, `lengthMeters`, `heightKey`,
`removal`, `drainage`, `conditions`. A panel keyed on fencing's names renders a half-empty brief.

**A3.** How does a result card print the rate? Show the exact line. It must use the `unit` field
from the response, not a hardcoded `/m` or `/m²`.
`unit` is `"m"` for fencing and retaining wall, `"m2"` for tiling, `"item"` for kitchen. A retaining
wall is sold per LINEAR metre — the trade's name says "wall", which reads like an area and is not.
Printing $395/m² for a $395/m rate is wrong by the height of the wall.

**A4.** What happens when `unit` is `null`? It is null on the one turn that asks which trade the
customer wants. Does the card/badge code handle that, or does it render "per null"?

**A5.** Is `knownChecklist` echoed back **whole, including `_ui`**, on every turn? A trimmed copy
loses which trade the conversation settled on.

**A6.** Does anything in the app assume a trade slug has no underscore — a route, a CSS class, an
analytics event, a `localStorage` key, a `switch` on the trade? `retaining_wall` is the first
two-word trade in the product.

---

## B. Business side (onboarding and the confirm screen)

This is where the real work is. These questions are in order of how much damage a wrong answer does.

**B1. ⚠ THE BIG ONE.** On the confirm screen, `pricing.rates` is an object with **up to two keys**,
and the same wall appears under both at different prices:

```jsonc
"rates": {
  "labour_only":        [ { "wallType": "timber_sleeper", "heightBand": null, "pricePerMetre": 145 }, … ],
  "supply_and_install": [ { "wallType": "timber_sleeper", "heightBand": null, "pricePerMetre": 285 }, … ]
}
```

Does the screen render **both**, as two clearly separate sections or columns?
Take a screenshot of the whole panel, scrolled to the bottom, and include it in your answer.
If only one table shows, or if the two are merged into one list, say so — a builder seeing
"Timber sleeper $145" and "Timber sleeper $285" in one column will think the screen is broken, and
that difference is the single thing they are being asked to confirm.

**B2.** What does the screen do when `rates` has only ONE key? Many builders only install
customer-supplied materials, and that is a complete, publishable price list. Does it render fine, or
does it show an empty second section / throw?

**B3.** Are these four sections rendered at all? They exist on no other trade:
`pricing.drainage`, `pricing.groundworks`, `pricing.siteConditions`, `capabilities.engineering`.

**B4.** Is every slug rendered through the `labels` map that comes with the response, or does any
of it fall back to title-casing the raw slug? Check specifically that these show as words, not as
slugs: `supply_and_install`, `full_package`, `concrete_sleeper_wall`, `per_hour`, `per_day`.
All of them are in `labels`. Nothing here should ever reach a screen as `per_hour`.

**B5.** `capabilities.engineering` carries `{ text, price, isFromPrice }`. When `isFromPrice` is
true, does the screen render **"from $850"** rather than "$850"?
And: does the screen add ANY wording of its own about whether a wall needs engineering or council
approval? It must not. Show only what the business wrote. Whether a particular wall needs approval
depends on its height, soil, load and location, and a sentence the screen invents is one a builder
could repeat to a customer.

**B6.** `pricing.siteConditions` rows carry either `price` or `percent` — exactly one, never both.
Does the screen render `$450` or `+10%` correctly and skip the null one?

**B7. ⚠ THE ONE THAT ALREADY BROKE.** When a business picks a trade, does your app add it to
`services_provided` on the `businesses/{uid}` document — and with which spelling?

The backend only ever READS that array. The customer search is:

```js
where('services_provided', 'array-contains', 'retaining_wall')
```

Live data currently contains `retaining-wall` with a HYPHEN, and because of it a builder whose
prices were approved, confirmed, and showing "these prices are already live" on their own screen was
invisible to every customer. The backend now accepts either spelling so nothing is broken today, but
**write `retaining_wall` with an underscore** for anything new.

Answer with: where in the code this array is written, and what exact string it writes.

**B8.** Does `trade: "retaining_wall"` go out on **all three** actions — `submit`, `profile` and
`confirm`? It defaults to `"fencing"` when omitted, so a missing one reads and writes the wrong
document silently.

**B9.** If the confirm screen is re-opened later (not straight after a submission), what does it
render from? The `submit` response carries `labels`; the `profile` response returns
`{ pricing, capabilities, submissions }` and carries **no labels at all** — that is true for every
trade, not just this one. If your screen renders slugs from a `profile` read, where do its labels
come from?

---

## C. Two answers the customer may get instead of a quote

Not bugs. Listed so you recognise them as correct if you see them while testing:

- *"The builders near you do that wall, but not with the materials supplied the way you asked. Want
  to change who buys them?"* — the builder does build it, just the other way round. This turn
  carries real alternative offers in `results`.
- *"I found retaining wall builders near you, but none of them have finished setting up their
  pricing yet."* — approved but not confirmed. No price goes live without a human pressing Confirm.

---

## How to answer

One line per question: `A1 — OK, TradePicker.tsx reads /client/trades`. Then, at the end, list only
the BROKEN ones in the order you would fix them. Include the B1 screenshot.
