# Follow-up — two small things, and one that would cost you the sixth trade

Paste below the line. Short addendum to the four-item work order, not a new audit.

---

All four items were checked against the backend's actual contract. **Items 1, 3 and 4 are correct,
and so is most of item 2.** Two things to change, one of them worth more than it looks.

## 1. `quoteTitle` built a local trade→word map, which is the thing item 2 was about

`Kitchen in Berwick` is the wrong words. The backend calls this trade **"kitchen fitting"** — it is
what `GET /api/v1/client/trades` returns as its `label`, and what the chat itself says to the
customer. `Kitchen in Berwick` also reads like a place rather than a job.

The other four happen to match — fencing, tiling, retaining wall, decking — so only one title is
visibly wrong today. But a hand-kept trade→word map going stale is exactly the failure item 2 was
about, and this one goes stale the day a sixth trade ships.

**Fix:** take the words from the `label` in `GET /client/trades`, which you already fetch for the
picker. Missing trade → `Quote in {suburb}`, which you have right.

## 2. ⚠ `submitJob` now throws for a trade it does not recognise, which shuts out the next trade

Throwing instead of writing a fencing job is the right move for a **missing** trade. But your check
is `lead.trade && TRADE_META[lead.trade]`, so it also throws for a trade that is present and real and
simply not in your local map — which is every new trade, on day one, before you ship anything.

Today that is theoretical. It was not theoretical for decking: the customer chat needed **no
release** for decking because everything else here reads the trade from the server. This one line
would have been the exception, and the symptom is the worst kind — customers reaching a real quote
for a live trade and being told to start again.

**Fix — split the two cases:**

- `trade` missing or empty → throw, exactly as you do now. It is a real bug upstream.
- `trade` present but not in `TRADE_META` → **post it as-is** and `console.warn`. The slug is just a
  string on the job document; the backend never reads `jobs/{id}`, and the business app matches it
  against `services_provided`, which will already contain the new slug.

That keeps what you fixed — no silent fencing fallback — without making a new trade wait for a
release here.

While you are there: `TRADE_META` is a hardcoded five. Anything in it that is only display words
should come from `/client/trades` too. Anything that is genuinely per-trade behaviour, leave and tell
me what it is.

## 3. Correct, leave alone

- Other as free text on every turn, sending the string as typed. Confirmed against the backend: the
  chat request carries a plain `message` string, so `5m x 4m` arriving verbatim is exactly right.
- Deleting `FIELD_LABELS` and printing nothing for a field with no server title. A blank row is
  honest; a raw key is not.
- `formatChecklistValue` no longer appending units by field name.
- `transcript.ts` / `aiSummary.ts` reading `checklistAnswered` then `checklistDisplay`.
- Everything in your item 5 — voice, totals, `formatQuoteRate`, the picker.

## 4. What is proven and what is not

383 unit tests across all five trades, plus lint and build, is real coverage and it covers the parts
that broke before. Playwright not running leaves three things unproven, all of them item 1 and 2:

- With no trade locked, type `5m x 4m` in Other and see the **backend's** reply — the area read back
  for confirmation. The unit test proves you sent it; only this proves it was understood.
- A saved kitchen quote's title, on the quotes list, in a browser.
- A kitchen and a retaining wall conversation opened as transcript and as AI summary — the two files
  that used to invent a brief from raw keys.

Three clicks. Worth doing before calling item 2 finished.
