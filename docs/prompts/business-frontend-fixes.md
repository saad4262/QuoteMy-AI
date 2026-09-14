# Work order — business frontend (`quotemybusiness`), the nine things to fix

Paste everything below the line into your editor / AI assistant. It is self-contained.

This is the follow-up to the audit you already answered. Every item below comes from **your own
audit answers**, with the line numbers you reported. Nothing here is speculation about your code.

---

You are fixing the QuoteMy AI **business** frontend (`quotemybusiness`). An audit of this app
against the backend's five live trades came back with nine defects. They are listed in the order to
fix them, worst first.

## Ground rules — read before touching anything

1. **Fix only what is listed here.** Do not refactor neighbouring code, do not rename things, do not
   "tidy while you're in there", do not upgrade dependencies. Every item below names the file and
   the behaviour; stay inside it.
2. **Each item has a "must not break" line.** Check it before you move on. Several of these touch
   code that five trades share, so a fix that helps one trade can silently break the other four.
3. **After each item, run the whole app once for all five trades** — fencing, tiling, kitchen,
   retaining wall, decking — not just the trade you were fixing. Most of the defects below exist
   because something was written when there was one trade.
4. **Do not change the backend contract.** If a fix seems to need a new field or a different
   response shape, stop and report it instead of working around it.
5. **Report what you changed, per item**, in the same numbering as below.

---

## 1. ⚠ `services_provided` is written on page VISIT, before Confirm

**You reported:** `PricingPage.jsx` ~294–298 — opening `/profile/pricing/{trade}` calls
`withTradeInServicesProvided` and writes the array. The same helper runs again on Confirm (~525–529).

**Why it is the worst one.** That array is the **only** thing the customer search reads:

```js
where('services_provided', 'array-contains-any', ['decking'])
```

Writing it on visit means a business becomes searchable for a trade **the moment somebody opens the
page** — before any price list exists, before Confirm, sometimes before they type a word. The
customer then gets *"There are decking businesses around your suburb, but none of them have
confirmed their pricing yet"* for a business that was only browsing.

This is also how three businesses ended up carrying `decking` with no pricing behind them.

**Fix:** remove the write at ~294–298. Keep the Confirm write at ~525–529. The array should gain a
trade **only when that trade's prices are confirmed and live.**

**Must not break:** a business that has already confirmed a trade must keep it. Only the on-visit
write goes; the Confirm write stays exactly as it is.

**Verify:** open a trade's pricing page for a business that has never used it, close it without
saving, and check the Firestore document — `services_provided` must be unchanged.

---

## 2. ⚠ Service Area save OVERWRITES the whole array

**You reported:** `ServiceAreaPage.jsx` ~536–541, ~600 — saving replaces `services_provided` with
whatever chips are ticked. Unticking fencing removes it.

**Why it matters:** a fencer who confirmed fencing prices, then visits Service Area and saves with
fencing unticked, disappears from every fencing customer — with their prices still live and their
own screen still saying so. Same failure as the hyphen bug, different cause.

**Fix:** merge rather than replace. A trade that has a confirmed `services/{trade}` price list must
not be removable by a chip on this page. Either:

- drop `services_provided` from this page's write entirely and let item 1's Confirm write own it
  (preferred — one writer, one rule), or
- keep the chips but union them with the trades that are already confirmed.

**Must not break:** the service-area radius/suburb fields this page actually exists for.

**Also answer:** `SERVICES_OPTIONS` has **six** entries — the five backend trades plus
`landscaping`. Landscaping is not a trade the backend serves, so a business that ticks it is
searchable for something that can never be quoted. Say what that chip is for; if it is aspirational,
it should not be writing to `services_provided`.

---

## 3. ⚠ A kitchen price list renders as tiling

**You reported:** `PricingReviewPanel.jsx` — `isTilingPricing` (~107) is checked before
`isKitchenPricing`, and `isKitchenPricing` requires `enabledKitchenSizes` / `cabinetSupply` /
`benchtops` / `siteMeasureFee`. A kitchen with only `supplyModels` + `rates.general` is classified
as tiling and `general` becomes a job-type row.

**The cause:** `supplyModels` is **not** unique to tiling — kitchen has it too. Each trade has
exactly one key that only it has, and those are what the backend narrows on internally:

| trade | the key that only it has |
|---|---|
| fencing | `enabledMaterials` |
| tiling | `enabledJobTypes` |
| kitchen | `enabledKitchenSizes` |
| retaining wall | `enabledWallTypes` |
| decking | `enabledDeckMaterials` |

Each is **always present and always an array** on that trade's pricing document — including
`enabledKitchenSizes` on a kitchen whose only rate bucket is `general` (the backend fills it with
every size in that case, so it is never empty).

**Fix:** use exactly these five keys, `Array.isArray(...)` on each. Order then does not matter,
because no two trades share one.

**Must not break:** `key === 'general'` must still be rendered for kitchen (you reported it is, at
~355). It is the common case, not an edge case — most fitters publish one installation price
covering new, replacement and install-only.

**Verify:** submit a kitchen price list with a single general rate and confirm the panel says
kitchen, not tiling.

---

## 4. ⚠ The screen invents sentences about permits

**You reported:** `PricingReviewPanel.jsx` ~219–232 — `permitLine` produces "Permits arranged by the
business" / "Permits are the customer's responsibility". Also ~981–987, a groundworks line the
screen adds itself.

**Why it matters:** this is a compliance sentence the business never wrote, shown to them as if it
were their own. A tradesperson can repeat it to a customer. Whether a permit is needed depends on
height, position, boundary and site, and nobody here is in a position to answer it.

**Fix:** delete the invented wording. Render only what the business actually submitted —
`capabilities.engineering.text` and the equivalent fields. A section heading of your own ("Engineering")
is fine; a **claim** of your own is not. When the field is null, show nothing, not a placeholder.

**Must not break:** the rest of the capabilities section, and the "from $X" rendering (item 6).

**Sweep while you are here:** search the whole panel for any other sentence the screen composes
about compliance, approval, warranty, insurance or licensing. Report every one you find, even if you
leave it.

---

## 5. The rejected panel groups, heads and numbers the fixes

**You reported:** `PricingReviewPanel.jsx` ~593–618 splits `fixes` by `kind`, adds **"What we still
need"** / **"What needs to be clearer"** headings, and numbers them — and that **this repo's own
`FRONTEND.md` asks for exactly that**, which contradicts the audit.

**The decision, so you can stop having it:** the backend writes `fixes` as a finished list for a
tradesperson reading a phone after work. It is capped at 3–6 items and every item is already
grouped — the prompt that writes them carries a worked example specifically to stop three separate
problems becoming three separate lines. Adding headings and numbers on top re-sorts something that
was already sorted and makes a short list look like a long report.

**Fix:** render `fixes` as a plain list, in the order received. No headings, no numbering, no counts,
no severity badges, no "3 errors found".

**Then update `FRONTEND.md`** so the next person does not re-add it. That file is stale on this point.

**Must not break:** the approved path, and whatever renders `opening` and `nextStep` around the list.

---

## 6. `labels[slug] ?? slug` fails silently, and `unitPhrase` mangles units

**You reported:** `PricingReviewPanel.jsx` ~287 `labelOf = (slug) => labels[slug] ?? slug`; and
`unitPhrase` doing `unit.replace(/_/g, ' ')`, so `per_sqm` prints as "per sqm" rather than "per m²".
Also `TradePicker` title-casing `row.label || row.trade` (~109–112, ~152), and `FencingSpecsForm`
keeping its own fencing label table instead of using `labels`.

**Backend side is now closed.** Two real holes were found and fixed on the backend the same week:
tiling's whole `prep` list had no labels, and `per_hour` was missing from tiling and kitchen. There
is now a test that walks every trade's extraction schema and fails if any value it can emit has no
label. So a missing label is no longer expected — which is exactly why the silent fallback is wrong.

**Fix:**

- Keep `labels[slug] ?? slug` as the last resort, but make it **loud in development** — a
  `console.warn` naming the slug and the trade. A missing label is now a backend bug worth
  reporting, not a thing to paper over.
- Delete the `replace(/_/g, ' ')` fallback in `unitPhrase`. Units are in `labels` for every trade.
- `TradePicker`: use `row.label` as given. Do not title-case it — the backend's label for `kitchen`
  is "kitchen fitting", and title-casing the slug gives "Kitchen".
- `FencingSpecsForm`: use the `labels` map from the response rather than its own copy, so it cannot
  drift from the backend's vocabulary.

**Must not break:** any screen that renders before a response has arrived. If `labels` is not loaded
yet, render nothing rather than the slug.

---

## 7. Job matching still falls back to fencing

**You reported three defaults in this family:**

- `titleForJobType` (`converters.ts` ~226–242, `servicesMatch.ts` ~163–170) → **`'Fence Installation'`**
- `jobMatchesServices` with an **empty** `services_provided` → matches everything except tiling and kitchen
- `jobMatchesServices` with a **null** `jobType` → treated as fencing

**Why it matters:** the first puts "Fence Installation" on a decking job in the feed. The second
sends decking and retaining wall jobs to businesses that never said they do them — and after item 1
is fixed, empty arrays become **more** common, not less, because the array is no longer written on a
page visit.

**Fix:**

- `titleForJobType`: unknown or missing trade → a neutral title built from the slug
  (`retaining_wall` → "Retaining wall job"), never a fencing one.
- Empty `services_provided` → match **nothing**. A business that has confirmed no trade has no jobs
  to see. Show them an empty feed with a line telling them to confirm their pricing.
- Null `jobType` → match nothing, and log it. A job with no trade is a data bug, not a fencing job.

**Must not break:** businesses that legitimately have one or more trades confirmed. Test with a
business that has exactly one, and one that has three.

---

## 8. The last two, small

- **`materialDef`** uses `find(...)!` and throws if the id is missing. It is only called from the
  fencing form today, so it is latent — give it a null return and a caller that handles it.
- **Dead files and copy:** `RetainingWallPricing.jsx` (unused, and its ids `treated-timber` /
  `concrete-sleepers` use hyphens that match nothing), and the Login/Signup copy still saying
  "fencing quotes". Delete the dead file; update the copy to name the product, not one trade.

---

## 9. Do NOT change these — they are correct

Three things your audit flagged that are working as designed. Leaving them alone is part of the job.

- **`action: 'process'` is the supported path.** The backend accepts `submit`, `profile`, `confirm`
  **and** `process`. Your flow — write the description to Firestore, then nudge `process`, then read
  `description/lastaireview` — is the intended asynchronous one. `submit` is the synchronous
  alternative, not the "correct" one. `profile` being unused is fine; the labels you need are inside
  `lastaireview.business.labels`.
- **The `retaining-wall` hyphen in old data is handled.** The customer search uses
  `array-contains-any` with both spellings, so businesses stored with the hyphen are still found. Do
  not write a migration. Keep writing `retaining_wall` with an underscore for anything new.
- **`rates` genuinely having a different shape per trade** is not an inconsistency to normalise.
  Fencing is a nested map; tiling and kitchen are keyed by job type; retaining wall by supply model;
  decking by deck height. Each reflects what that trade's builders actually publish.

---

## Done when

- [ ] `services_provided` is written on Confirm and nowhere else (items 1 and 2).
- [ ] A kitchen list with only `rates.general` renders as kitchen (item 3).
- [ ] No sentence about permits, approval or compliance appears that the business did not write (4).
- [ ] `fixes` renders as a plain list, and `FRONTEND.md` agrees (5).
- [ ] No slug and no raw unit reaches a screen; a missing label warns in dev (6).
- [ ] A decking job in the feed is not titled "Fence Installation"; an empty `services_provided`
      matches nothing (7).
- [ ] All five trades open, render and confirm without a console error — checked after the last item,
      not after the first.
