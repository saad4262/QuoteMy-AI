# Prompt — customer side chat frontend, adding tiling

Paste everything below the line into your editor / AI assistant. It is self-contained: it does not
assume access to the backend repo.

---

You are updating the **customer-facing** quote chat of QuoteMy AI (React). The backend now supports
a second trade, **tiling**, alongside fencing.

**Read this first, because it decides how much work this is:** if your chat renders the questions,
options and brief panel from the fields the server sends, tiling costs you almost nothing — the
tiling questions arrive down the same wire and render themselves. If any of `material`,
`heightKey`, `gateType` or `lengthMeters` is written into your components, that is the work.

## The endpoint

```
POST /api/v1/client/chat            ← use this
POST /api/v1/client/fencing-chat    ← the old path, still answers identically, for ever
```

Body, unchanged except for one optional field:

```jsonc
{
  "trade": "tiling",        // OPTIONAL. See "which trade" below.
  "message": "...",
  "sessionId": "...",
  "place": "...",           // JSON text, unchanged
  "knownChecklist": "..."   // JSON text, unchanged — echo back last turn's `checklist` verbatim
}
```

`knownChecklist` must be echoed back **whole, including `_ui`**, exactly as you do today. The
conversation's memory lives in there — including which trade it settled on.

## Which trade

The backend works it out. You do not have to send `trade`, and it is no longer fencing-by-default:

1. `trade` in the body — you said, you win. Send it if you have a picker or trade-specific landing
   pages.
2. What the conversation already settled (held in `_ui`).
3. The customer's own words — "I need a fence quote" → fencing, "my bathroom needs tiling" → tiling.
4. Otherwise **it asks**, and this is the only new turn shape you must handle:

```jsonc
{ "type": "question",
  "trade": null,                                   // ← null ONLY on this turn
  "message": "Are you looking for Fencing or Tiling services?",
  "options": [ { "label": "Fencing", "value": "fencing" },
               { "label": "Tiling",  "value": "tiling"  } ],
  "checklist": { ...exactly what you sent... } }
```

Render it like any other question; send the tapped `value` back as the next `message`. A message
naming both jobs gets a different sentence ("Sounds like there might be more than one job there…"),
same shape.

**Two things:** `trade` can be `null` on that one turn — do not assume it is a string. And that turn
records nothing, so `checklist` comes back as you sent it.

To build a trade picker, get the live list from `GET /api/v1/client/trades`:

```jsonc
{ "ok": true, "data": [ { "trade": "fencing", "label": "fencing" },
                        { "trade": "tiling",  "label": "tiling"  } ] }
```

## The response, and why tiling needs no new rendering

Every turn returns the same shape it always has. The parts that carry the questions are already
generic — **render these, never a hardcoded field list**:

```jsonc
{
  "type": "message" | "question" | "confirmation" | "result",
  "trade": "tiling",
  "message": "What are you having tiled?",                  // the question, already worded
  "options": [ { "label": "Bathroom",           "value": "bathroom" },
               { "label": "Floor only",         "value": "floor_only" },
               { "label": "Kitchen splashback", "value": "kitchen_splashback" },
               { "label": "Other",              "value": "__other__" } ],
  "checklistAnswered": [ { "key": "suburb",  "title": "Suburb", "value": "Berwick, VIC 3806" } ],
  "checklistPending":  [ { "key": "jobType", "title": "Job" } ],
  "checklistDisplay":  { "...": "keyed, with title and label per answered field" },
  "checklistComplete": false,
  "checklist": { "...": "echo this back next turn, `_ui` included" }
}
```

A tiling conversation asks: **suburb → jobType → tileType → areaSqm → supply → removal →
waterproofing → conditions**. You do not need to know that; it arrives as `message` + `options` +
`checklistPending` like fencing's does.

`__other__` is the "something else" chip and opens a free-text box, exactly as today.

## The result turn

```jsonc
{ "type": "result",
  "results": [ { "businessId": "tile-1", "businessName": "Paky Tiles", "suburb": "Berwick, VIC 3806",
                 "ratePerMeter": 72, "estimatedTotal": 1440, "autoAcceptsAi": true,
                 "notes": "incl. GST · 12.6 km away · 4.9★ (80) · You supply the tiles" } ],
  "comparison": { ... }, "avgRatePerMeter": 72, "alternatives": [ ... ], "resultId": "..." }
```

**One thing to fix:** `ratePerMeter` and `avgRatePerMeter` keep their names for compatibility, but
for tiling they are **per square metre**. Do not print a hardcoded "per metre" anywhere a tiling
result can appear — key the suffix off `trade` (`fencing → /m`, `tiling → /m²`).

`resultId` and the `quoteResults/{resultId}` Firestore listener are unchanged.

## What does not change

- `place` / the Google suburb picker, and `expects: "suburb"`.
- Attachments, error shapes, limits.
- The comparison panel, alternatives, the "nobody covers your suburb" retry.
- Firestore rules and the results listener.

## Acceptance

- A fencing conversation behaves exactly as it does today.
- A customer typing "I need my bathroom tiled" is never asked which trade, and is asked tiling's
  questions.
- A customer typing "hi, I need a quote" gets the Fencing/Tiling question and can tap through it.
- No screen prints "per metre" against a tiling quote.
- Nothing in the chat components names `material`, `heightKey` or `gateType`.
