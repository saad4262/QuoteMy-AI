# Prompt — is the frontend correct across ALL FIVE trades? (customer + business)

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

This is **not** a work order. It is a list of questions. Answer each with what the code actually
does — not what it should do — and send the answers back. A "no" is a useful answer; a guess is not.

---

You are auditing the QuoteMy AI frontend (React + Firebase). The backend now serves **five trades**,
all live and verified end to end:

| slug | wire label |
|---|---|
| `fencing` | fencing |
| `tiling` | tiling |
| `kitchen` | kitchen fitting |
| `retaining_wall` | retaining wall |
| `decking` | decking |

Go through every question, look at the actual code, and answer with one of:

- **OK** — and say which file/component makes it so
- **BROKEN** — and say what it does instead
- **NOT SURE** — and say what you would need to check

Do not fix anything yet. Report first.

---

## Part 0 — the five trades on one page

Read this before answering anything. Almost every bug in this audit is a component that was written
when there was one trade and still assumes it.

**Customer side — the questions each trade asks, in order:**

| trade | fields | measured in | `unit` |
|---|---|---|---|
| fencing | `suburb · material · heightKey · lengthMeters · removal · conditions · gateType · gateQty` | linear metres | `"m"` |
| tiling | `suburb · jobType · tileType · areaSqm · supply · removal · waterproofing · conditions` | square metres | `"m2"` |
| kitchen | `suburb · jobType · kitchenSize · supply · benchtop · removal · extras` | **nothing** | `"item"` |
| retaining wall | `suburb · wallType · supply · lengthMeters · heightKey · removal · drainage · conditions` | linear metres | `"m"` |
| decking | `suburb · deckHeight · material · areaSqm · attachment · removal · balustrade · balustradeLm · stairs · stairFlights · conditions` | square metres | `"m2"` |

Only `suburb` and `removal` exist on all five. `material` exists on **two** — fencing and decking —
and means a completely different closed list on each.

**Business side — what `pricing.rates` looks like, which is different on every trade:**

| trade | `rates` shape | the array/map key |
|---|---|---|
| fencing | nested map | `rates[material][heightKey] = number` |
| tiling | map of arrays | keyed by **job type** |
| kitchen | map of arrays | keyed by **job type**, plus a `general` bucket for a rate that named none |
| retaining wall | map of arrays | keyed by **supply model** — up to 2 keys, same wall under both at different prices |
| decking | map of arrays | keyed by **deck height** — up to 4 keys, same board under several at different prices |

**How to tell which trade a pricing document is, if you ever need to:**

| trade | the key that only it has |
|---|---|
| fencing | `enabledMaterials` |
| tiling | `enabledJobTypes` |
| kitchen | `enabledKitchenSizes` |
| retaining wall | `enabledWallTypes` |
| decking | `enabledDeckMaterials` |

Note `enabledMaterials` is **fencing's alone** — decking's is `enabledDeckMaterials`. Anything
reading `enabledMaterials` generically across trades is reading undefined on four of the five.

---

## Part A — customer side (the quote chat)

The backend sends the questions, the options, the labels, the brief panel and the result cards. If
your chat renders what it is given, all five trades cost you nothing and any new one is free. These
questions are only about whether it does.

**A1.** Is the trade picker built from `GET /api/v1/client/trades`, or is the list hardcoded
anywhere in the app? It returns five entries today. A hardcoded array is how a live trade stays
invisible. Answer with the exact line that builds the picker.

**A2. ⚠ The single most important question in this audit.** Does the brief / checklist panel render
from `checklistDisplay` and `checklistPending` — or does any component read field names directly?

```jsonc
"checklistDisplay": {                                  // answered, title + value ready to print
  "suburb":     { "title": "Suburb", "value": "Berwick, VIC 3806" },
  "deckHeight": { "title": "Height", "value": "Up high — needs stairs" }
},
"checklistPending": [                                  // still to come, IN ORDER
  { "key": "material", "title": "Decking" },
  { "key": "areaSqm",  "title": "Size" }
]
```

Search the whole app for these strings and list every hit: `material`, `heightKey`, `areaSqm`,
`jobType`, `gateType`, `tileType`, `kitchenSize`, `wallType`, `deckHeight`, `lengthMeters`,
`balustrade`, `supply`. Each hit is a component that works on some trades and not others.

Only `checklistPending` keeps its order across the wire — an object does not.

**A3. ⚠ `material` is the same field name on two trades with different values.** On fencing it is a
fence type; on decking it is a board — `treated_pine`, `merbau`, `spotted_gum`, `blackbutt`,
`jarrah`, `composite`, `pvc`. Is there any per-value lookup keyed on `material` — an icon map, an
image, a colour swatch, a label table? If yes, it will render a deck as a fence with no error
anywhere. This is the one collision that cannot be caught by a type or a crash.

**A4. `unit` — never hardcode it.** Show the exact line that prints a rate on a result card. It must
be `$${ratePerMeter}` + the word `unit` gives you. `unit` is `"m"` (fencing, retaining wall), `"m2"`
(tiling, decking), `"item"` (kitchen), and **`null`** on the one turn that asks which trade the
customer wants.

- Does it handle the null, or render "per null"?
- Does printing `"m2"` produce "m²" and not the literal "m2"?
- A retaining wall is sold per LINEAR metre — the trade's name says "wall", which reads like an
  area. Printing $395/m² for a $395/m rate is wrong by the height of the wall.

**A5. ⚠ Kitchen has NO measurement at all.** No length, no area — the quote is per job, `unit` is
`"item"`, and there is no quantity field in the checklist. Does any screen assume a quantity exists:
a "how many metres?" input, a `qty × rate` line, a progress bar step for a measurement, a total
recomputed from a quantity?

**A6. ⚠ Do not recompute or cross-check any total.** A real decking result:

```jsonc
{ "unit": "m2", "avgRatePerMeter": 625,
  "results": [ { "ratePerMeter": 625, "estimatedTotal": 19365, "notes": "incl. GST · In your suburb · …" } ] }
```

625 × 25m² = 15,625, and the total is 19,365 — **and that is correct.** A decking quote carries
three quantities: the deck in square metres, the balustrade in linear metres along its edge, and the
stairs by the flight. Retaining wall and fencing add fixed items the same way.

Does any code derive, validate or display a total from `rate × quantity`? Any client-side subtotal,
any "(approx $X/m²)" caption, any "this doesn't add up" assertion? It will not reconcile.

**A7. Conditional questions.** Some fields are only asked when an earlier answer opened them:

| trade | field | only asked when |
|---|---|---|
| fencing | `gateQty` | a gate type was chosen |
| decking | `balustradeLm` | a balustrade was chosen |
| decking | `stairFlights` | stairs were chosen |

They simply do not appear in `checklistPending` otherwise, so your screen should need to do nothing.
But: is there a hardcoded question count, a "step 4 of 9", or a progress bar built from a fixed
number of steps? And does a skipped field leave a stranded row in the brief panel?

**A8.** Is `knownChecklist` echoed back **whole, including `_ui`**, on every turn? A trimmed copy
loses which trade the conversation settled on, and the chat re-asks.

**A9. Measurements are converted on the SERVER.** "5m x 4m", "270 sq ft", "about 20 metres" are all
accepted and turned into a number in code, then read back to the customer for confirmation. Does
your input box pre-parse, strip units, or refuse anything that is not a bare number? If it does, the
customer has to do the sum before we will listen.

**A10. Routing without a picker.** The chat finds the trade from the customer's own words, so a
single shared entry point needs no picker: *"I need a fence quote"*, *"retile the bathroom"*, *"new
kitchen benchtop"*, *"how much for a sleeper wall"*, *"merbau deck, about 30 square metres"* all
arrive on the right trade with no `trade` sent. If your app always sends a `trade`, say so — it is
not wrong, but it means the picker is the only way in and A1 matters more.

**A11. `retaining_wall` is the only two-word slug.** Does anything assume a trade slug has no
underscore — a route, a CSS class, an analytics event, a `localStorage` key, a URL segment? Not
`retaining-wall`, not `retainingWall`. It is a Firestore document id as well as a wire value.

---

## Part B — business side (onboarding and the confirm screen)

This is where the real work is, because each trade's price list genuinely has a different shape.
Approved prices are **not live** until the business presses Confirm.

### B — the generic ones, true for all five

**B1.** Does `trade` go out on **all three** actions — `submit`, `profile` and `confirm`?

```jsonc
{ "action": "submit",  "businessUid": "...", "trade": "decking", "text": "..." }
{ "action": "profile", "businessUid": "...", "trade": "decking" }
{ "action": "confirm", "businessUid": "...", "trade": "decking" }
```

It **defaults to `"fencing"` when omitted**, so a missing one reads and writes the wrong document
silently. Check all three call sites, not just submit.

**B2. ⚠ Every slug on screen must come from the `labels` map in the response.** It is a flat
`slug → human words` map and it is **per trade** — a tiler handed fencing's map sees `porcelain`
raw while `timber_pine` renders beautifully, on a screen no fencing word belongs on.

Does anything fall back to title-casing a raw slug? Check these actually render as words:
`supply_and_install`, `labour_only`, `timber_pine`, `kitchen_splashback`, `concrete_sleeper_wall`,
`ground_level`, `spotted_gum`, `timber_batten`, `per_hour`, `per_day`, `per_metre`, `per_sqm`.
Nothing should ever reach a screen as `per_hour`.

**B3.** If the confirm screen is re-opened later (not straight after a submission), what does it
render from? The `submit` response carries `labels`; the `profile` response returns
`{ pricing, capabilities, submissions }` and carries **no labels at all** — that is true for every
trade. If your screen renders slugs from a `profile` read, where do its labels come from?

**B4.** Does the screen handle a price list with **only some** of its sections filled? Every optional
block can be null or empty and the submission is still complete and publishable. Does it render
cleanly, or show empty headings / throw?

**B5. `siteConditions` rows carry either `price`/`extraPerSqm` or `percent` — exactly one, never
both.** Does the screen render `$450` or `+10%` correctly and skip the null one?

**B6. "from" prices.** Optional extras are allowed to be `isFromPrice: true`. When it is, does the
screen render **"from $890"** rather than "$890"? Core rates are never "from" prices; extras often
are, and the difference is a real commitment a builder is making.

**B7. ⚠ Does the screen add ANY wording of its own about compliance, permits, engineering or
approvals?** It must not — show only what the business wrote. Whether a particular job needs
engineering or council approval depends on height, soil, load, boundary and site, and a sentence the
screen invents is one a tradesperson could repeat to a customer. All these fields can be null; a
business that never mentioned it gets an empty section, not a placeholder claim.

**B8. The rejected path.** On rejection the response carries `fixes` — 3 to 6 items, written to be
read by a tradesperson on a phone after work. Render them as a plain list. Does your screen add
headings, counts, severity badges or "3 errors found"? It should not; the wording is deliberate.

### B — the per-trade shapes

**B9. Fencing.** `rates` is a **nested map**, not an array:
`rates["timber_pine"]["1.8m"] = 145`. Height keys are strings built in code (`"1.8m"`), never
free text. Does the screen iterate both levels?

**B10. Tiling and kitchen.** Both carry `supplyModels` — which of the two models the business works
under — and `rates` keyed by **job type**. Kitchen also has a **`general`** bucket for a rate that
named no job type, which is the common case rather than the exception: most fitters publish one
installation price covering new, replacement and install-only alike. Does the screen render the
`general` bucket, or drop it because it is not a real job type?

**B11. ⚠ Retaining wall — `rates` has up to TWO keys and the same wall appears under both:**

```jsonc
"rates": {
  "labour_only":        [ { "wallType": "timber_sleeper", "heightBand": null, "pricePerMetre": 145 }, … ],
  "supply_and_install": [ { "wallType": "timber_sleeper", "heightBand": null, "pricePerMetre": 285 }, … ]
}
```

Does the screen render **both**, as two clearly separate sections? A builder seeing "Timber sleeper
$145" and "Timber sleeper $285" in one merged column will think the screen is broken — and that
difference is the single thing they are being asked to confirm. And what does it do when there is
only ONE key? Many builders only install customer-supplied materials, and that is a complete price
list.

**B12. ⚠ Decking — three separate things, and the first is the one that does real damage:**

- **`balustrades` are per LINEAR metre**, along the deck's edge, never per square metre of deck.
  Own section, own unit, plainly labelled. On a 40m² deck with 12m of railing, charging it against
  the floor area is more than three times the railing that exists. The backend rejects a balustrade
  submitted per m² — the screen must not undo that.
- **`rates` are grouped by HEIGHT** — up to four keys, and a builder may have only some. The same
  board at several heights at different prices is correct, not a duplicate: the posts, bracing and
  deeper footings under an elevated deck are what the difference pays for.
- **`stairs` — read the `grade`, not the `unit`.** A row with a `grade` is a flight; `grade: null`
  is a per-step add-on. The `unit` does not tell them apart — the model returns `per_item` for both.
  "$140" beside "$950" with no distinction reads as a contradiction.

**B13.** Take a screenshot of the **full pricing panel, scrolled to the bottom**, for each of the
five trades, and include all five in your answer. This is the fastest way to find a missing section.

---

## Part C — ⚠ `services_provided`, the one that already broke in production

`businesses/{uid}` carries a `services_provided` array. **Your app writes it — the backend only
reads it** — and it is the only thing the customer search uses to decide which businesses to look at:

```js
where('services_provided', 'array-contains', 'retaining_wall')
```

A tradesperson can submit, be approved, press **Confirm — go live**, see "your prices are live" on
their own screen, and still be invisible to every customer if this array never said they do that
trade.

**C1.** Where in the code is `services_provided` written, and what **exact strings** does it write
for all five trades? Paste the line.

**C2.** Live data contains `retaining-wall` with a **hyphen**, and because of it a confirmed
business with approved prices was invisible to every customer. The backend now accepts either
spelling so nothing is broken today, but anything new must write `retaining_wall` **with an
underscore**. Which does your code write?

**C3.** `decking` is **already** in live `services_provided` arrays on at least three businesses,
written long before the backend served the trade — and none of them has any pricing. The customer is
correctly told *"There are decking businesses around your suburb, but none of them have confirmed
their pricing yet."* But what does **your** onboarding screen do when `services_provided` contains a
trade with no `services/{trade}` document behind it? Does the picker show it as already selected?
Does the dashboard show an empty or broken pricing card?

**C4.** When a business adds a second trade, is the array **appended to** or **overwritten**? A
fencer who adds decking must not stop being a fencer.

---

## Part D — the hunt

**D1.** List every `switch` or `if` on the trade slug in the app — routing, icons, headings, page
titles, analytics events, the confirm-screen renderer, anything. For each, say what its **default
branch** does. A `switch` whose default is fencing is how a deck gets rendered as a fence with
nothing in the console.

**D2.** List every hardcoded trade array, trade-name string, or trade-keyed object literal.

**D3.** Are there five entries everywhere there should be five? Picker, icons, labels, routes,
onboarding steps, dashboard tabs.

---

## Part E — five conversations and five submissions

Run these by hand and say what actually appeared. This catches what reading code does not.

**Customer side** — one quote per trade, all the way to a result card:

1. *"I need a colorbond fence, about 20 metres, in Berwick"*
2. *"retile my bathroom, about 12 square metres"*
3. *"new kitchen, medium size"* ← no measurement is asked; confirm that is what happens
4. *"how much for a sleeper wall, 15 metres"*
5. *"merbau deck, about 25 square metres, with a balustrade"* ← then say **no** to the balustrade in
   a second run and confirm "how many metres?" is never asked

For each, report: did the right trade start, did the brief panel fill in, and what exactly did the
result card print for the rate (with its unit)?

**Business side** — submit a price list per trade, then open the confirm screen. Report any section
that is missing, any slug that appeared raw, and any unit that looked wrong.

**Known and already reported — do not spend time on these:**

- On the tiling and kitchen business screens, two supply labels still read in the customer's voice
  (*"I'm buying the tiles"*) on a screen shown to the person selling them. Backend wording fix,
  already known, not a frontend bug.

---

## How to answer

One line per question: `A1 — OK, TradePicker.tsx reads /client/trades`. Then, at the end:

1. Only the **BROKEN** ones, in the order you would fix them.
2. The five B13 screenshots.
3. The Part E results.
