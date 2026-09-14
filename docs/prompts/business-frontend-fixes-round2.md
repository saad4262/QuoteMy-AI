# Follow-up — two fields that do not exist, and one data cleanup

Paste below the line. This is a short addendum to the nine-item work order, not a new audit.

---

Your nine items were checked against the backend's actual response shapes. **Seven are correct and
finished.** Two read fields that do not exist, so they render nothing instead of the business's own
words — and one cleanup is still outstanding.

## 1. ⚠ `capabilities.permits.text` does not exist on any trade

Your item 4 now prints `capabilities.permits.text` "if the business wrote it; otherwise nothing".
That condition is never true, so the permit section is now **permanently empty on all five trades.**

Here is what the backend actually sends:

| trade | field | shape |
|---|---|---|
| fencing | `capabilities.permits` | `{ included: boolean \| null, fee: number \| null }` — **no `text`** |
| retaining wall | `capabilities.engineering` | `{ text, price, isFromPrice }` |
| decking | `capabilities.engineering` | `{ text, price, isFromPrice }` |
| tiling | — | neither field |
| kitchen | — | neither field |

Removing the invented sentence was right. Reading a field that isn't there went one step too far: a
fencer who stated their permit position **and published a permit fee** now sees neither.

**Fix — fencing only:**

- `permits.included === true` → a neutral line meaning the business handles permits
- `permits.included === false` → a neutral line meaning the customer does
- `permits.included === null` → **render nothing**, exactly as you have it now
- `permits.fee` → render as money when it is a number, nothing when null

The difference from the old bug: `included` is what the business said, read out of their own
document. The old `permitLine` fired a sentence even when the field was null, which is where the
claim came from. Keep the null case silent and you keep the fix.

`engineering.text` on retaining wall and decking you are already rendering — leave that as it is.

## 2. ⚠ `warrantyLine` composing from `years` — you flagged it, and you were right

`warranty.years` exists on **fencing only**. The other four trades dropped it on purpose: their SOPs
say a business must not be pushed into inventing a warranty period.

And it is the one capability field with **no quote check behind it**. `warranty.text` is only kept
when a real source sentence backs it; `years` is accepted as a bare number with nothing to verify it
against. So "10-year warranty on workmanship" can be composed from a figure nobody ever wrote down
in those words — and the words "on workmanship" are your screen's, not theirs. Warranty scope is
exactly the thing that varies between businesses.

**Fix:** prefer `warranty.text` when present, as you already do. When only `years` is set, render the
bare fact — "Warranty: 10 years" — and never name what it covers.

**Your other two sweep findings are fine, leave them:** `supplyModelHint` explains a slug and is
written from the builder's point of view, which is correct. "Optional — nothing here blocks
approval" is about onboarding, not council.

## 3. Item 5 is confirmed correct

`fixes` really is `{ kind, what, example }` with `example` nullable. Rendering `what` plus an
optional `e.g. {example}` in wire order is exactly right. Nothing to change.

## 4. The leftover data your fix does not reach

Fixing the write stops new bad rows; it does not clean the ones already there. A read-only pass over
live data found **two businesses carrying four trades they have no pricing document for at all**:

```
tiling           1 business listed with no services/{trade} document
retaining_wall   1 business listed with no services/{trade} document
decking          2 businesses listed with no services/{trade} document
```

Those businesses are returned by customer search today and every customer who reaches them is told
*"…but none of them have confirmed their pricing yet."*

One more fencing business sits at status `verified` — approved but never confirmed. **That one is
correct and must be left alone**: prices go live when a human presses Confirm, and waiting is a
legitimate state, not stale data.

**What to do:** for each of the four, either remove the trade from `services_provided`, or tell that
business they have a half-finished trade to confirm. Do not write a blanket migration — `verified`
must survive it, and a script that cannot tell the two apart will delete a business's real work.

`landscaping` is still sitting in live `services_provided` data. Harmless — the backend never queries
it — so leave it unless you are cleaning the four above anyway.

## 5. Still unverified

You could not log in, so the two clicks that prove items 1 and 3 have not happened:

- Open a trade you have never confirmed, leave without saving → `services_provided` unchanged.
- Confirm one trade → the slug appears only then.
- Submit a kitchen list whose only rate bucket is `general` → the panel says kitchen, not tiling.

Until those three are clicked, items 1, 2 and 3 are written but not proven.
