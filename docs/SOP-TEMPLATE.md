# Writing a trade's SOP

`src/prompts/sop/{trade}/rules.md` is what the review agent judges a business's price list against.
It decides whether a submission is publishable, and — when it is not — what the business is told to
go and fix.

It is the highest-leverage prose in the product, and the easiest to get subtly wrong. A rule written
one way turns away businesses that are perfectly compliant; the same rule with a carve-out in the
right place lets them through. **Both failures are silent.** Nothing errors either way — a real
business simply gives up, or a half-priced one goes live.

Fencing's (`F1–F9`) and tiling's (`T1–T10`) agree on shape to the letter. That shape is below.

> Read alongside **[ADDING-A-TRADE.md](ADDING-A-TRADE.md)** — the SOP is step 3 of twelve, and
> steps 0, 1 and 7 depend on decisions this document forces you to make.

---

## 1. The skeleton

Fill this in. Section order is not decorative — the reviewer reads top-down and the principle block
has to land before any rule does.

```
{TRADE} PUBLISH RULES - what a {trade} price description must contain before it can be
published. Check these first; the background knowledge further down is context, not a checklist.

Rules X1-Xn are ALL blocking. Any one unmet means the description is not ready. Xn+1 is not.

=== THE PRINCIPLE THAT MAKES THESE WORKABLE - READ BEFORE APPLYING ANY OF THEM ===
Every item below must be STATED. It does not have to be a price.
  … see §3.1 …

X1 - <THE CORE RATE. THE ONE THING A QUOTE CANNOT BE BUILT WITHOUT.>
X2 - <the variants that carry their own price>
X3 - <preparation / what has to happen before the work>
X4 - <removal or disposal of what is there>
…
X? - WHO SUPPLIES THE MATERIALS, STATED PLAINLY.        ← §4. Skip only if nobody sells materials.
X? - MINIMUM JOB CHARGE, CALL-OUT FEE, AND TRAVEL.
X? - SERVICE AREA: A CENTRE AND A DISTANCE.
X? - GST, STATED ONCE, CLEARLY.
Xn+1 - EXCLUSIONS AND INCLUSIONS - NOT BLOCKING.

WARRANTY. <ask for it, accept a plain answer, never press for a number of years>

HOW TO APPLY THESE: work through X1 to Xn one at a time against what is actually written. Do not
form a general impression. …

WHAT COUNTS AS QUOTABLE WORK HERE: <the core rate, said once more, plainly>. Everything else -
<list the add-ons> - is an optional add-on, quoted on inspection, and never blocking on its own.

WHAT IS WORTH ADDING (for alsoWorthAdding, never for fixes): <what makes a thin price list
quotable> … <one sentence on the cost of not having it>

GROUPING, WORKED FOR THIS TRADE. Same action, different items, ONE line:
  Wrong - three separate fixes: …
  Right - one fix: …

--- background knowledge from here down: context, never a checklist ---
<SUBJECT>: <what a tradesperson in this trade knows that the model does not>
```

Order the numbered rules so the **blocking, quote-critical ones come first** and the
administrative ones (minimum charge, service area, GST) sit at the end. A reviewer that runs out of
attention should run out of it on GST, not on the core rate.

---

## 2. What `_general.md` already says

These are not trade knowledge. `sop/_general.md` states them for every trade and `reviewPrompt()`
prepends it to your file on every call. **Do not restate them.** Know them, because your
trade-specific rules must not contradict them:

| | |
|---|---|
| Rule 1 | every type of work they quote on carries a price |
| Rule 1a | …**quotable work only.** Capability statements and optional add-ons are never blocking |
| Rule 2 | prices are per unit, and the unit is stated — `"$85"` is not a rate, `"$85 per metre"` is |
| Rule 3 | every size or variant band priced separately — a range of heights at one price cannot be right for all of them |
| Rule 4 | no ranges, no `"from"`, no POA **on a core rate** |
| Rule 4a | …**core rates only.** `"from $1,250"` on an optional extra is fine and must not be reported |
| Rule 5 | GST stated once, clearly |
| Rule 6 | service area has a centre **and** a distance — `"Melbourne and surrounds"` is not one |
| Rule 7 | a minimum charge |
| Rule 8 | extras and exclusions stated, **not blocking** |

Note that two of the ten are carve-outs on the rule immediately above them. That is §3.2, and it is
there because the version without them rejected a compliant business.

Your file restates a general rule only when the trade **sharpens** it. Tiling's `T8` repeats the
service area because it is worth saying twice; tiling's `T1` sharpens Rule 2 into *"per square
metre, floor and wall separately"*, which is genuinely trade knowledge.

---

## 3. Four things that are easy to get wrong

Each of these traces to something that actually happened.

### 3.1 "Stated, not priced" — put it before the rules, not after

Without this block, every rule reads as *"you must have a price for this"*, and a specialist who
genuinely does not offer something cannot publish at all.

```
Every item below must be STATED. It does not have to be a price.

"We don't do waterproofing" satisfies the waterproofing rule. "We only install tiles the customer
supplies" satisfies the supply rule. "Preparation is quoted after inspection" satisfies preparation.
A one-line "no" is a complete answer.

SILENCE is what fails, never absence.
```

Then put `SATISFIED by "…"` on **each individual rule** as well. Stating the principle once is not
enough — a reviewer applying rule seven has stopped thinking about a paragraph at the top.

The distinction the sentence has to carry: a business that **does not do** the thing and said so has
satisfied the rule; one that simply **forgot to mention** it has not.

### 3.2 A carve-out in a parenthetical gets ignored

This caused a real false rejection. `_general.md` Rule 4 said flatly that `"from $80/m"` is the
absence of a rate, with the exception for optional extras in brackets at the end. The agent followed
the flat statement and turned away a fully compliant submission.

**A carve-out needs its own numbered heading** — hence `Rule 4a` and `Rule 1a` — **and it must also
appear in the system prompt, not only in the rules file.** When the two conflict, the prompt wins.

### 3.3 Core rate versus optional extra

| | Core rate | Optional extra |
|---|---|---|
| What it is | the per-unit price the quote is calculated from | quoted on inspection |
| May it say `"from $X"`? | **no** — one firm number | **yes** |
| Blocking? | yes | **never on its own** |
| Reaches the price formula? | yes | no — it lives in `capabilities/{trade}.extras` (`CONTEXT.md` §4) |

Your `WHAT COUNTS AS QUOTABLE WORK HERE` line is where you draw this. Draw it explicitly, and list
the add-ons by name. Fencing names gate motors, powder coating, compliance certificates, callout
fees and one-off gates. Tiling adds that **a job the business sells at one price is just as much a
core rate** as a per-unit one — which is what let a business quoting `"Complete bathroom $4,850"`
publish at all.

### 3.4 One grouping example, in your trade's own words

`review.system.md` already carries a general worked example and the "3 to 5 fixes" ceiling. It is
still worth repeating in the trade's own nouns — *"group similar issues"* alone gets ignored, and
tiling's file carries its own for that reason:

```
Wrong - three separate fixes:
  "Wall tiling has no price."   "Mosaic has no price."   "Natural stone says POA."
Right - one fix:
  "Add one set per-square-metre rate for wall tiling, mosaic and natural stone - these are
   currently missing or POA, which we can't quote from."
```

Remember who reads the output: **a tradesperson on a phone after work.** Under 250 words, 3–5
bullets, no rule numbers, no categories, no counts, no tool names, no lecturing, no exclamation
marks.

---

## 4. The labour/material rule — for a trade that sells materials too

Skip this section only if the businesses never supply materials. If they do, **this rule is what
decides whether a supply-and-install quote can be produced at all**, and a vague version of it means
every such customer gets nothing.

Modelled on tiling's `T6`:

```
X? - WHO SUPPLIES THE MATERIALS, STATED PLAINLY.
There are two models and a business may do either or both:
  - they supply the materials and fit them, or
  - the customer buys the materials and they fit those.
The description must say which. If they supply, the material prices themselves need to be there
too, per <unit> - the fitting rate alone cannot produce a supply-and-install quote.
If they only fit the customer's own, saying so is a COMPLETE answer to this rule and no material
prices are needed.
```

Three things that sentence has to do, and they are easy to lose:

1. **Name both models.** A business that does one is not incomplete for not doing the other.
2. **Demand the material prices when — and only when — they supply.** This is the half most often
   missing. A price list full of fitting rates and no material prices reads as thorough and cannot
   quote a single supply-and-install customer.
3. **Make "we only fit the customer's own" a complete answer.** Otherwise every labour-only
   business in the trade is rejected.

### Where it goes afterwards

The SOP sentence is the first link in a chain, and each link needs the one before it:

```
SOP rule            "who supplies the materials, and your material prices if you do"
   ↓
vocab.ts            KITCHEN_SUPPLY = ['supply_and_install', 'labour_only']   (closed list)
   ↓
extraction schema   materialSupply rows: { type, pricePer<unit>, sourceQuote }
   ↓
verify/{trade}.ts   materialSupply[] on the verified pricing, each price quote-verified
   ↓
fieldSpec.ts        a `supply` field, asked like any other:  "Who's buying the …?"
   ↓
pricing/{trade}.ts  if (brief.supply === 'supply_and_install' && pricing.materialSupply.length) …
```

Two behaviours the pricing code already implements, which the SOP should not fight:

- **When the customer has not chosen a material, the DEAREST published price is used.** The one
  number nobody may be shown is a total below what they will actually be charged. So a business
  listing one cheap material and one expensive one is quoted at the expensive one until the customer
  picks — which is a reason for the SOP to ask for **every** material they supply, not a sample.
- **Only the business's own published price is ever used.** A price found by web search is a market
  guide shown *beside* a quote, never part of one. There is no fallback if they did not publish one,
  which is why the SOP has to insist.

---

## 5. Length, and what it costs

Checked at boot by `assertPromptBudgets()`, per trade. Over budget is a **boot failure**, not a
surprise on next month's bill.

| | |
|---|---|
| Ceiling | **8,000 tokens** for the whole review prompt |
| What is in it | `review.system.md` + `_general.md` + **your `rules.md`** + any previous-review block |
| Where fencing sits | ~7,266 |
| Where tiling sits | ~7,481 |

**That leaves very little room, and the constraint is attention rather than cost.** At this volume
the prompt is about $0.014 a call. The real limit is that every extra rule is one more thing
competing for the model's attention, and this prompt has already produced one false rejection by
being read unevenly.

So: if your trade needs more rules than tiling's ten, the background-knowledge section at the bottom
is what to cut first. It is context, not a checklist, and it is the part the reviewer needs least.

---

## 6. Before you hand the SOP over

- [ ] Every blocking rule has a `SATISFIED by "…"` clause
- [ ] The "stated, not priced" principle is **above** the rules
- [ ] Every carve-out has its own numbered heading — no parentheticals
- [ ] `WHAT COUNTS AS QUOTABLE WORK HERE` names the core rate and lists the optional extras
- [ ] The supply rule names **both** models, and demands material prices only from suppliers (§4)
- [ ] One grouping example, in this trade's own nouns
- [ ] Background knowledge is separated and labelled as context
- [ ] **`WHAT_TO_SEND[trade].need` in `src/messages.ts` says the same things in the same order**

That last one is not a tidiness check. `WHAT_TO_SEND` is the form the business fills in and the SOP
is what judges what they send. If the two disagree, a business sends exactly what it was asked for
and is rejected for it — and there is no way for them to tell why.
