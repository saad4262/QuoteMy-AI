# Adding a second trade — what the frontend has to change

Companion to `docs/FRONTEND.md`, which stays correct for everything not listed here. This file
covers only what changes when the product stops being fencing-only.

Written while the backend was being made per-trade (branch `tiling-multi-trade`, steps A0–A8).
**Everything in section 1 is already live on that branch and safe to build against now.** Section 2
is waiting on the client's tiling SOP and will be filled in once that lands — do not guess it.

---

## 1. Settled — build against this today

### 1.1 The chat endpoint was renamed, and the old one still works

```
POST /api/v1/client/chat            ← use this
POST /api/v1/client/fencing-chat    ← still answers, identically, for ever
```

Same body, same response, same handler. Nothing breaks if you migrate late. There is a test that
both paths answer.

### 1.2 The chat body takes an optional `trade`

```jsonc
{
  "trade": "fencing",        // NEW, optional. Omitted = "fencing", exactly as before.
  "message": "…",
  "sessionId": "…",
  "place": "…",              // JSON text, unchanged
  "knownChecklist": "…"      // JSON text, unchanged
}
```

Send it once per conversation and keep sending it every turn — the server holds no session state
between calls, which is unchanged from today.

The response now echoes `trade` as the trade that actually answered, rather than the literal
`"fencing"` it always was. Read it rather than assuming.

### 1.3 The business payload already had `trade` — it now means something

`POST /api/v1/business` has always accepted `trade`, defaulting to `fencing`. It now selects the
trade's own publish rules, its own extraction, and its own vocabulary. So the onboarding screen
needs a **trade picker**, and whatever it picks must be sent on every call for that business:
`submit`, `profile` and `confirm`.

Storage paths are already per trade and need no change:

```
businesses/{uid}/services/{trade}/…
```

### 1.4 Nothing about the customer's result document changes

`quoteResults/{resultId}` and `firestore.rules` are trade-agnostic already. The listener you have
keeps working.

### 1.5 The checklist panel is already generic — do not hardcode fields

This matters more than anything else here. The questions, their order, their options and their
titles all come from the server per trade, and tiling's are different from fencing's. If your brief
panel has `material`, `heightKey`, `gateType` written into it anywhere, that is the work.

Everything you need is already in each response:

| field | what it is |
|---|---|
| `checklistDisplay` | every answered field, keyed, with its human title and label |
| `checklistAnswered` | in order, what has been answered |
| `checklistPending` | in order, what is still to come, with titles |
| `options[]` | the choices for the current question, `{label, value}` |
| `message` | the question itself, already worded |

Render those. A trade the frontend has never heard of should render correctly with no deploy — that
is the whole design, and it is what makes tiling cheap on your side.

---

## 2. Waiting on the tiling SOP

The client is sending their tiling SOP. It decides what a tiler must publish, and therefore what a
customer is asked and what the confirm screen shows. These are the three open questions — they are
not ours to guess:

1. **How area is asked.** Room length × width with the server computing m², a single m² field, or
   size presets.
2. **Labour-only vs supply-and-install.** Fencing is always supply-and-install. Tiling routinely is
   not, and if the SOP wants both it becomes an ordinary question in the chat.
3. **What keys a rate.** Tile type × surface, possibly with a size band.

### 2.1 The business confirm screen is the real work

Today's screen renders fencing's shape: material × height × $/m, gates as items, removal per metre.
Tiling's verified shape is genuinely different — rates per m², surface prep, waterproofing — so this
screen has to become per trade, or be driven from the response's own structure.

Two ways to do it, to decide together once the SOP lands:

- **Per-trade renderers.** Simple, honest, and one more component per trade.
- **Server-described sections.** The response describes what to render; the frontend has one
  renderer for ever. More work up front on both sides, and nothing to do per trade after.

**No price goes live without this screen.** A business explicitly confirming its figures is a
non-negotiable (`CLAUDE.md`), so this cannot be skipped for tiling to launch.

### 2.2 The unit on result cards

Fencing shows `$/m`. Tiling shows `$/m²`. The wire field names stay `ratePerMeter` and
`avgRatePerMeter` — they are what you already read, and renaming them would break the shipped app to
improve a name — but for tiling they carry a **per square metre** figure.

Open decision, to make with the tiling wire contract:

- the server adds a `unit` field to the response (`"m" | "m2" | "item"`), and you render whatever it
  says — **recommended**; or
- the frontend maps trade → unit itself, which is one small duplicated fact.

Until that is decided, do not print a hardcoded "per metre" anywhere you would show tiling.

---

## 3. What is NOT changing

- The two-panel approved/rejected onboarding flow, and every field in it.
- `pending → verified/unverified → confirmed`, and that `confirmedAt` is only ever set by the
  business confirming on your screen.
- Error envelopes, limits, upload handling, the voice endpoints.
- Anything in `docs/FRONTEND.md` not contradicted above.
