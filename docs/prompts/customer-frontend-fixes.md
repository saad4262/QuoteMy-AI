# Work order — customer frontend (`agent-fence` / Aura), the four things to fix

Paste everything below the line into your editor / AI assistant. It is self-contained.

This is the follow-up to the audit you already answered. Every item comes from **your own audit
answers**, with the files you named. Nothing here is speculation about your code.

---

You are fixing the QuoteMy AI **customer** frontend (`agent-fence` / Aura). The audit came back
mostly clean — the chat is genuinely server-driven, which is why five trades work today with no
per-trade code. Four defects remain.

## Ground rules — read before touching anything

1. **Fix only what is listed here.** No refactors, no renames, no tidying, no dependency upgrades.
2. **Each item has a "must not break" line.** Check it before moving on.
3. **After each item, run a full conversation for all five trades** — fencing, tiling, kitchen,
   retaining wall, decking — not only the one you were fixing.
4. **Do not change what you send to the backend** beyond what item 1 says. The chat contract is
   working; if a fix seems to need a new request field, stop and report it.
5. **Report what you changed, per item**, in the same numbering as below.

---

## 1. ⚠ The "Other" box is a metres-only number input until a trade is locked

**You reported:** `ChatWindow.tsx` — `otherInputMode = trade ? 'text' : 'numeric'`. With no trade
set, Other renders as `type="number"`, labelled "Length in metres", refuses anything non-numeric, and
sends `{ label: '27m', value: 27 }`. Once any trade is locked it is free text.

**Why it matters.** Before a trade is settled, that box is the customer's only way to say anything
the options do not cover — and it is the exact moment they are most likely to type the thing that
would settle it: *"5m x 4m"*, *"270 sq ft"*, *"merbau deck about 25 square metres"*,
*"retile the bathroom"*. A numeric box refuses all four.

It also assumes the answer is a **length**, which is wrong for three of the five trades: tiling and
decking are square metres, and kitchen has no measurement at all.

**Fix:** make Other free text on every turn. Send the text as typed.

The backend converts measurements itself — `"5m x 4m"`, `"270 sq ft"` and `"about 20 metres"` all
arrive as text and are turned into a number **in code**, then read back to the customer for
confirmation before anything is quoted from it. There is nothing for the client to parse.

**Must not break:** the post-lock behaviour, which is already free text — after this fix there is
one behaviour instead of two. And the `{label, value}` shape for option taps, which is separate.

**Verify:** with no trade selected, type `5m x 4m` into Other and confirm it reaches the backend
verbatim and comes back as an area to confirm.

---

## 2. The field-name fallbacks, and the two fields missing from them

**You reported:** the live panel is correct — `ChecklistPanel.tsx` and `ConfirmationCard.tsx` render
from `checklistAnswered` / `checklistDisplay` / `checklistPending`. The problem is everything
*around* it:

- `utils/checklist.ts` `FIELD_LABELS` — and `kitchenSize`, `wallType`, `benchtop`, `extras` and
  `drainage` are **not in it**, so those print as raw keys
- `formatChecklistValue` — always appends `m` to `lengthMeters`, `m²` to `areaSqm`
- `ChecklistRows` fallback in `ThinkingScreen`, plus `transcript.ts` and `aiSummary.ts`
- `quotes.ts` `quoteTitle` — reads `jobType` / `tileType` / `material` directly, and titles a quote
  **"Fence in {suburb}"** when `trade` never locked

**The backend side is now guaranteed.** Every field a customer is asked carries a `title` in
`checklistDisplay` and `checklistPending`, on all five trades — there is now a test that fails if any
field spec is missing one. So the fallback path is not protecting you against anything real; it is
only there to print worse output when something else has already gone wrong.

**Fix, in this order:**

- **`quoteTitle` first** — it is the one a customer actually sees, on the saved-quotes list. Build
  the title from the trade's own words plus the suburb. When `trade` is missing, do **not** call it a
  fence: use a neutral title. "Fence in Berwick" on a decking quote is the same class of bug as
  "Fence Installation" in the business feed.
- **`FIELD_LABELS`** — either add the five missing keys, or (better) delete the map and make the
  fallback render nothing for a field with no server title. A blank row is honest; `kitchenSize` is
  not.
- **`formatChecklistValue`** — stop appending units by field name. The server sends the value already
  formatted in `checklistDisplay[field].value`; use it. If a fallback must format a bare number, take
  the unit from the response's `unit` field, never from the field's name.
- **`transcript.ts` / `aiSummary.ts`** — same rule: prefer `checklistAnswered`, which carries title
  and value together and is already in the order the questions were asked.

**Must not break:** the live panel, which is already right. This item is only about the paths that
run when `checklistDisplay` / `checklistAnswered` are absent.

**Verify:** a full kitchen conversation and a full retaining wall conversation, then open the saved
quote, the transcript and the AI summary for each. No raw key, no wrong unit, no "Fence in …".

---

## 3. An unknown trade posts a fencing job

**You reported:** `jobs.ts` `submitJob` — `lead.trade && TRADE_META[lead.trade] ? lead.trade : 'fencing'`.
An unknown slug (or none) writes `jobType: 'fencing'`.

**Why it matters:** that job goes to fencing businesses, who see a job they cannot do, while the
business who could do it never hears about it. It is silent on both sides.

**Fix:** do not default. If the trade is missing or unknown, do not post the job — surface the error
and report it. A lead with no trade is a bug upstream, and writing a fencing job hides it.

**Must not break:** the five real slugs, and the `retaining-wall` hyphen alias you already accept
here. Note this path is between the two frontends only — the backend never reads `jobs/{id}` or
`incoming_jobs`, so nothing downstream will catch a wrong `jobType` for you.

---

## 4. Dead copy still says fencing only

**You reported:** `ComingSoonScreen.tsx` — "only matching fencing…" — not mounted anywhere. Also
`HeroInputScreen.tsx`'s placeholder is decking-specific ("A deck — describe the size…").

**Fix:** delete `ComingSoonScreen.tsx`. For the placeholder, either rotate it across the five trades
from `GET /client/trades`, or make it trade-neutral. A single hardcoded example trade in the hero is
how a customer concludes you only do that one.

**Must not break:** nothing imports `ComingSoonScreen` — confirm that before deleting, and say so.

---

## 5. Do NOT change these — they are correct

Things your audit raised that are working as designed. Leaving them alone is part of the job.

- **Voice `create-call` not sending `trade` is fine.** The backend reads the trade from the carried
  checklist's `_ui.trade`, and asks if there is none. Sending it is a small improvement on a
  per-trade landing page, not a fix — and it must never be sent as a guess.
- **Not recomputing totals is correct, keep it that way.** `estimatedTotal` is authoritative.
  On decking `ratePerMeter × areaSqm` deliberately does **not** equal the total — a decking quote
  carries three quantities (deck in m², balustrade in linear m, stairs by the flight). Do not add a
  subtotal, a "≈ $X/m²" caption, or a consistency check.
- **`unit`-driven rate printing is correct.** `formatQuoteRate` using the response's `unit`, with no
  suffix for `item` and `null`, is exactly right. Do not hardcode a unit anywhere.
- **The picker reading `GET /client/trades`** is correct and is why decking needed no release here.
  Do not add a hardcoded list "as a fallback" — a hardcoded list is how a live trade stays invisible.

---

## Done when

- [ ] Other is free text on every turn, and `5m x 4m` reaches the backend as typed (item 1).
- [ ] No raw field key and no wrong unit on any fallback screen; no quote titled "Fence in …" unless
      it is a fence (item 2).
- [ ] A lead with no trade fails loudly instead of becoming a fencing job (item 3).
- [ ] Dead fencing-only copy is gone (item 4).
- [ ] All five trades run end to end — chat, result card, saved quote, transcript, summary — checked
      after the last item, not after the first.
