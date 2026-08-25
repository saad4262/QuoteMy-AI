# Client (React) — what changes for the fencing chat

Only fencing has moved. Tiling, decking and retaining walls are untouched, so the client has to
keep handling both shapes for now. Everything below is about `trade === "fencing"`.

---

## 1. THE ONE THING THAT WILL BREAK IT

The `checklist` we return now carries a `_ui` object inside it. **Send the whole checklist back
verbatim in `knownChecklist`, including `_ui`, including any key you do not recognise.**

`_ui` is how the backend remembers which question was asked, which page of options the customer
has already seen, and whether the last turn was a recap. Strip it and the conversation restarts
its option paging and can re-ask a question.

```js
// right
knownChecklist: JSON.stringify(lastResponse.checklist)

// wrong — drops _ui
knownChecklist: JSON.stringify({ suburb, material, heightKey, ... })
```

Nothing in `_ui` is meant to be displayed. Ignore it, just carry it.

---

## 2. Checklist fields renamed

| old | new | example |
|---|---|---|
| `fenceType: "Colorbond"` | `material: "colorbond"` | slug, lowercase |
| `heightMm: 1800` | `heightKey: "1.8m"` | string, always `<number>m` |
| `removeOldFence: true` + `siteAccess: "easy"` | `removal: "timber" \| "metal" \| "none"` | what the OLD fence is made of |
| — | `conditions: []` | array of `"sloped"`, `"rock"`, `"restricted_access"`, `"hand_dig"`. `[]` means nothing tricky |
| — | `gateType: "pedestrian_single" \| ... \| "none"` | new |
| — | `gateQty: 1` | new, absent when `gateType === "none"` |
| `lengthMeters`, `existingPrice`, `suburb` | unchanged | |

`siteAccess` is gone entirely — the businesses price named site conditions now, not an
easy/difficult flag.

If the client displays the checklist anywhere, it needs the label, not the slug. Do not build
those labels yourself — the backend already sends the customer-facing text in every option's
`label`, and the recap message ("Got it — Pakenham, Colorbond, 1.8m, 30m…") is written for you.

---

## 3. Options: 3 + Other, always

Every multiple-choice turn now returns **at most 3 real choices plus `Other`**. There may be 8
materials or 50 — the customer sees three at a time.

```json
"options": [
  { "label": "Treated pine", "value": "timber_pine" },
  { "label": "Hardwood timber", "value": "timber_hardwood" },
  { "label": "Colorbond", "value": "colorbond" },
  { "label": "Other", "value": "__other__" }
]
```

- Tapping a real option: send its `value` as the `message`, exactly as-is. Values are now
  strings (`"timber_pine"`), numbers (`10`, `1`), and the literal `"none"` — no booleans.
- Tapping **Other**: open a free-text box (this is already the existing behaviour). Send whatever
  they type as `message`. Do **not** send `"__other__"`.
- If they type "more options", "something else", "koi aur" — the backend returns the **next three**
  automatically. No special handling needed on the client. When the list runs out the message
  says so and wraps to the start.
- If they type a real answer that was not on screen ("chainmesh"), that works too — it is
  resolved against the full list.

---

## 4. Suburb turn — unchanged

Still `options: []` with `expects: "suburb"` and an optional `suggestedSuburb` string to prefill
the Google picker. Send back the confirmed `place` object exactly as before. A suburb is only
real once it comes from the picker with coordinates.

---

## 5. Results / no-match

`type: "result"` and the `results` / `comparison` shapes are unchanged, so the results page
needs no work.

Two additions, both optional to use:
- `comparison.quotes[].warranty` — a string like `"12-month workmanship warranty"`, or `null`.
- New `noMatchReason` values on a failed result: `"material"`, `"height"`, `"removal"`, `"gate"`,
  alongside the existing `"radius"`, `"suburb"`, `"place"`, `"pricing"`, `"notCheaper"`, `"error"`.
  The `message` already reads correctly for each one, so treating them all the same is fine.

---

## 6. Nothing else moved

`type`, `message`, `options`, `checklistComplete`, `sessionId`, `place`, `intent`, `trade` all
behave exactly as they did. Attachments (PDF / image upload) are unchanged.
