# Fencing chat — backend changed, please check your UI against this

Short version: the fencing conversation no longer has a hardcoded question list. Questions and
multiple-choice options are now generated from Firestore (`/schema/fencing` + each business's
published rates), so a business adding a new material makes it appear in the chat with no code
change on either side.

**Only fencing moved.** Tiling, decking and retaining walls are byte-for-byte unchanged, so
whatever you have for those keeps working. Everything below is `trade === "fencing"` only.

The API shape is the same — same endpoint, same `type` / `message` / `options` /
`checklistComplete` / `results` / `comparison`. What changed is inside `checklist` and inside
`options`. Most of it should need no work from you. There is one thing that will break it if
your client does what most clients do, so start there.

---

## 1. The one that will break it — please check this first

Our `checklist` now carries a `_ui` object inside it. It holds which question was asked, which
page of options the customer has already seen, and whether the last turn was a recap.

**Send the checklist back in `knownChecklist` exactly as we gave it to you — including `_ui`,
including any key you do not recognise.**

```js
// right — pass it straight back
knownChecklist: JSON.stringify(lastResponse.checklist)

// wrong — rebuilding it from your own state drops _ui
knownChecklist: JSON.stringify({ suburb, material, heightKey, lengthMeters })
```

If your code picks named fields out of the checklist and rebuilds the object, that is the change
we need. Never display `_ui`, never edit it — just carry it.

Symptom if it is dropped: "more options" starts showing the same three choices forever, and a
question the customer already answered can come back.

---

## 2. Checklist fields were renamed

If your UI reads any of these anywhere — a summary panel, analytics, the job you save on accept —
they need updating:

| old | new |
|---|---|
| `fenceType: "Colorbond"` | `material: "colorbond"` (slug, lowercase) |
| `heightMm: 1800` | `heightKey: "1.8m"` (string, always `<number>m`) |
| `removeOldFence: true` + `siteAccess: "easy"` | `removal: "timber" \| "metal" \| "none"` — what the OLD fence is made of |
| — | `conditions: []` — array of `"sloped"`, `"rock"`, `"restricted_access"`, `"hand_dig"`. `[]` = nothing tricky |
| — | `gateType: "pedestrian_single" \| … \| "none"` |
| — | `gateQty: 1` (absent when `gateType === "none"`) |

`suburb`, `lengthMeters` and `existingPrice` are unchanged. `siteAccess` is gone — businesses
now price named site conditions instead of an easy/difficult flag.

**Do not build display labels from these slugs.** The customer-facing text always comes down in
`options[].label`, and the recap message is written for you ("Got it — Pakenham VIC 3810,
Colorbond, 1.8m, 30m, removing the old timber fence, rocky ground, 1 x single pedestrian gate.
All correct?").

---

## 3. Options are now always 3 + Other

A trade can have 8 materials or 50. The customer sees three at a time:

```json
"options": [
  { "label": "Treated pine",    "value": "timber_pine" },
  { "label": "Hardwood timber", "value": "timber_hardwood" },
  { "label": "Colorbond",       "value": "colorbond" },
  { "label": "Other",           "value": "__other__" }
]
```

Please confirm your renderer handles:

- **Values are strings and numbers only.** `"timber_pine"`, `"none"`, `10`, `1`. There are no
  booleans any more — the old `removeOldFence: true/false` buttons are now `"timber"` /
  `"metal"` / `"none"`. If anything does `value === true`, it needs to go.
- **Tapping a real option** sends its `value` unchanged as `message`. No transformation.
- **Tapping Other** opens your free-text box (existing behaviour) and sends what they type.
  Do not send the literal `"__other__"`.
- **Labels can contain an em dash and non-ASCII** — `"Pool fencing — aluminium"`. Just check
  nothing truncates or mangles it.
- **A page can have fewer than 3 real options** on the last page (e.g. 2 + Other). Do not assume
  four buttons.

---

## 4. "More options" needs nothing from you

If the customer types "more options", "something else", "koi aur" — we return the **next three**
automatically on the next turn. No flag, no special request, no client state. When the list runs
out, the message says "That's everything we cover" and wraps back to the start.

They can also just type an answer that was never on screen ("chainmesh", "bamboo screening") —
we resolve it against the full list. So the free-text box must stay available on every
multiple-choice turn, not only after they tap Other.

---

## 5. Three response shapes to check you render

**a) The confirmation turn** — `type: "confirmation"`

Before anything is searched for, every answer is read back and the customer has to agree:

```json
{ "type": "confirmation",
  "message": "Got it — Berwick VIC 3806, Colorbond, 1.8m, 30m, removing the old timber fence. All correct?",
  "options": [ { "label": "Yes, that's all correct", "value": "yes" },
               { "label": "No, something's wrong",  "value": "no" } ] }
```

If your renderer only knows `"message"` and `"question"`, treat `"confirmation"` exactly like
`"question"` — otherwise the Yes/No buttons never appear and the conversation cannot finish.
Saying **No** returns "what should I fix?" as free text; whatever they type clears only that one
field and re-asks it.

**b) The alternatives turn** — `type: "question"`, values prefixed `alt:`

When nobody can quote the exact brief, we come back with the nearest things somebody CAN do:

```json
{ "type": "question",
  "message": "Nobody near you does Colorbond at 1.8m. The closest they can do is Treated pine at 1.8m, $2,750 from Southeast Fencing & Gates. Want one of these instead?",
  "options": [ { "label": "Treated pine, 1.8m · $2,750", "value": "alt:timber_pine:1.8m" },
               { "label": "Aluminium, 1.5m · $5,520",   "value": "alt:aluminium:1.5m" },
               { "label": "No thanks, I'll change something", "value": "no" } ],
  "noMatchReason": "alternative",
  "alternatives": [ { "material": "timber_pine", "materialLabel": "Treated pine",
                      "heightKey": "1.8m", "businessName": "…", "estimatedTotal": 2750,
                      "value": "alt:timber_pine:1.8m" } ] }
```

Send the tapped `value` back **verbatim, colons and all**. Do not parse or transform it. The
`alternatives` array is the same data if you would rather render your own comparison card.

**c) `checklistDisplay`** — for the brief panel

Every response now carries ready-made display text, so nothing has to map slugs on the client:

```json
"checklistDisplay": {
  "suburb":   { "title": "Suburb",   "value": "Berwick, VIC 3806" },
  "material": { "title": "Material", "value": "Treated pine" },
  "removal":  { "title": "Old fence","value": "Timber fence" }
}
```

The side panel currently shows `Material: timber_pine`. Use this instead — the raw `checklist`
holds slugs on purpose, because that is what the pricing data is keyed by.

---

## 6. Unchanged — but worth a smoke test

- **Suburb picker**: still `options: []` + `expects: "suburb"` + optional `suggestedSuburb` to
  prefill. Still send back the same `place` object with coordinates. Untouched.
- **Attachments**: PDF and image upload, unchanged.
- **Results page**: `results[]` and `comparison` have the same shape. Nothing to do.

Two optional additions you can ignore or use:
- `comparison.quotes[].warranty` — a string like `"12-month workmanship warranty"`, or `null`.
- New `noMatchReason` values on a failed result: `"material"`, `"height"`, `"removal"`, `"gate"`,
  alongside the existing `"radius"`, `"suburb"`, `"place"`, `"pricing"`, `"notCheaper"`,
  `"error"`. The `message` already reads correctly for each, so treating them all the same is
  fine — only relevant if you branch on the reason.

---

## 6a. New: `answer` — nothing to do, but there is something nice you could do

Customers ask things. *"Is Colorbond better than timber?"*, *"what's it going for these days?"*,
*"my fence blew over, what do I do?"* The backend now answers those from a live web search and
carries on with the brief in the same turn.

**You do not have to change anything.** The answer is already at the front of `message`, with a
blank line between it and the question, so it renders in your existing bubble as-is:

```
Colorbond is steel, so it will not rot and never needs painting.
Timber looks warmer but wants a coat every few years.

Got it — what height are you after?
```

`options` still arrive, `type` is unchanged, the checklist still advances. It is an extra paragraph
on a turn you already render.

**What you could do.** The same answer also arrives broken up, so you can style it as a distinct
"looked this up for you" block above the question rather than one long paragraph:

```jsonc
{
  "message": "hipages says $85 to $100 a metre… \n\nWhat height are you after?",
  "answer": {
    "kind": "rates",                       // or "advice"
    "text": "hipages says $85 to $100 a metre…",   // the same words already inside `message`
    "sources": [
      { "name": "hipages", "figure": "$85 to $100 a metre installed", "url": "https://…" },
      { "name": "Yellow Pages", "figure": "$75 to $150 a metre", "url": null }
    ]
  },
  "options": [ /* … as always … */ ]
}
```

Three things to know if you do:

1. **`answer.text` is the same text that is already inside `message`.** If you render `answer`
   separately, render `message` with that prefix removed — or you will show it twice.
2. **`url` is usually `null`,** and that is correct rather than missing. It is filled only for a
   page the provider actually opened and cited; a link invented for the other four would point at
   something nobody read. Render a plain name when there is no URL.
3. **`answer` is absent on almost every turn.** It appears only when the customer asked something,
   and at most six times in a conversation.

`answer.text` never contains a URL or markdown — deliberately, because the same string is read
aloud on voice calls.

---

## 7. Two-minute test once it is wired up

Run one fencing conversation end to end and confirm each line:

1. Say "I need a fence quote" → you get an opener, no options.
2. Answer, then pick a suburb from the Google picker.
3. You get 3 fence types + Other.
4. Type "more options" → **three different** types. Type it twice more → eventually
   "That's everything we cover" and it wraps.
5. Pick one → heights, then length, removal, site conditions, gates, gate count. **No search
   happens during any of this** — every question comes from the schema.
6. You get a recap ending in "All correct?" with Yes / No.
7. Say **No** → "what should I fix?" → type "the height is wrong" → it re-asks **only** the
   height → recap again.
8. Say **Yes** → *now* it searches → results, or the alternatives turn from §5b.

One more question we have for you: when the customer hits **New project**, does the client mint a
fresh `sessionId` and drop the stored checklist? It should — reusing a session id carries the old
brief and its option paging into the new conversation.

The two failures to watch for: a question you already answered coming back (that is `_ui` being
dropped — see §1), and "more options" repeating the same three (same cause).

Anything looks off, send us the request/response pair for that turn and we will trace it.
