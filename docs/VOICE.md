# Voice mode

A customer taps a mic, speaks instead of typing, and hears the assistant speak back.

Retell does speech and nothing else: it transcribes what was said, sends it to this backend, and
reads back exactly the words it gets. Every decision — which question comes next, which choices
exist, what the price is — is made by the same pipeline the text chat uses. **One product, two front
doors.**

---

## What runs where

```
Browser mic
   │  Retell Web SDK
   ▼
Retell  ── speech to text ──▶  calls the `voice_turn` tool
   ▲                                    │
   │                                    ▼
   └── text to speech ◀── speakText ── POST /api/v1/voice/turn?sessionId=…
                                        │
                          matchSpokenToOption()   ← the no-model turn
                                        ▼
                          runFencingChat()        ← the existing pipeline, untouched
                                        ▼
                          toSpeech()  +  saveChatResult()
                                        ▼
                          quoteResults/{resultId} ──▶ the page renders the quote
```

| File | What it does |
|---|---|
| [`src/client/voice/controller.ts`](../app/src/client/voice/controller.ts) | One turn. Thin on purpose. |
| [`src/client/voice/matchSpoken.ts`](../app/src/client/voice/matchSpoken.ts) | What they said → one of the choices read out, or nothing |
| [`src/client/voice/toSpeech.ts`](../app/src/client/voice/toSpeech.ts) | A turn, as words |
| [`src/client/saveResult.ts`](../app/src/client/saveResult.ts) | The finished quote, where a page can listen |

---

## Endpoints

### `POST /api/v1/voice/create-call`

Starts a call. Returns:

```json
{ "sessionId": "8f1c…", "accessToken": "…", "configured": true }
```

The Retell API key never leaves the server — a browser holding it could create calls against the
account at will. Only the token, which is scoped to one call, is handed out.

With no key configured this still returns a `sessionId` and `configured: false`, which is what makes
the whole voice path testable from Postman with no Retell account.

### `POST /api/v1/voice/turn?sessionId=<id>`

```json
{ "spokenText": "colorbond" }
```

```json
{ "speakText": "Good choice. What height are you after? Option A, 1 point 2 metres. …", "isDone": false }
```

- `speakText` — read verbatim. It already contains the question, the lettered options, and the
  invitation to answer freely.
- `isDone` — `true` only on a finished quote. Ends the call.
- `resultId` — present on the last turn. Where the quote was written.

**Errors return this same shape with `isDone: false` and a spoken apology, never a 4xx or 5xx.** A
call that receives a status the agent cannot read goes silent, and silence is the one failure a
caller will not sit through.

---

## Environment

```
RETELL_API_KEY=          # server-side only, never sent to a browser
RETELL_AGENT_ID=
```

Both unset is a supported state: the voice endpoints work, no Retell call is minted.

---

## Test it without Retell first

Do this before touching the dashboard. It exercises everything except speech.

```bash
SESSION=$(curl -sX POST localhost:8787/api/v1/voice/create-call | jq -r .sessionId)
say() { curl -sX POST "localhost:8787/api/v1/voice/turn?sessionId=$SESSION" \
  -H 'content-type: application/json' -d "{\"spokenText\":\"$1\"}" | jq -r '.speakText, .isDone'; }

say "I need a fence quote"
say "yes go ahead"
# the suburb is picked on screen, not spoken - see below
say "option C"
say "1.8 metres"
say "30 metres"
say "nothing to remove"
say "nothing tricky"
say "no gates"
say "yes"
```

`tests/unit/voice.test.ts` covers the same ground automatically, including that a spoken option
consults **no model at all**.

---

## The suburb is the one thing voice cannot take

`isMissing('suburb')` tests the geocoded place object, not the words
([`mergeAndDecide.ts`](../app/src/client/mergeAndDecide.ts)) — ranking measures distance and needs
coordinates. A spoken suburb can never satisfy it, so the question would come back every single turn,
for ever.

`toSpeech` therefore says to pick it on screen and waits. **This means voice needs a screen.** A
phone-only call cannot get past the suburb question, and making it work needs a different mechanism
(reverse geocoding the caller, or a spoken postcode resolved server-side) — that is not built.

---

## Building the Retell agent

The flow has four nodes and one tool. It contains **no fencing-specific content whatsoever** — no
field names, no materials, no questions. If the word "fencing" appears anywhere in it, something is
wrong: that content belongs in the backend, which is what makes a second trade a schema document
rather than a second agent.

> **Why this is a written spec rather than a JSON file to import.** Retell's public docs describe
> the node types but do not publish the exact JSON field names for instructions, edges and tool
> configuration. A generated file would be a guess that fails to import, and you would spend longer
> debugging my guess than building four nodes. Build it in the dashboard, then **export it and commit
> that** — the export is the reliable shape.

### Agent settings

| Setting | Value | Why |
|---|---|---|
| `language` | `en-AU` | |
| `timezone` | `Australia/Sydney` | |
| `allow_user_dtmf` | off | Nothing here is answered with a keypad |
| model | the fastest available | It decides nothing; it relays |
| `model_temperature` | `0` | Same reason |

### Global prompt

State plainly that the agent decides nothing. Include explicit NEVER lines — this is the main guard
against it inventing a price or a business name:

> You are a voice interface and nothing more. You relay what the tool gives you and what the customer
> says. NEVER answer a question from your own knowledge. NEVER invent, guess or estimate a price, a
> business name, a material, a height or a measurement. NEVER add, remove or reword anything in
> `{{speak_text}}` — read it exactly. If you do not have text to read, say you did not catch that and
> ask them to repeat.

### The tool — `voice_turn`

| | |
|---|---|
| Method | `POST` |
| URL | `https://<your-host>/api/v1/voice/turn` |
| Query params | `sessionId` = `{{session_id}}` |
| Body | exactly one parameter, `spokenText` |
| `spokenText` description | "The customer's words, transcribed verbatim. Do not clean it up, fix grammar, summarise, or map it onto an option. All interpretation happens server-side." |

`session_id` arrives as a dynamic variable from `create-call`, so the agent never has to say, hear
or invent one.

### The nodes

```
node-greeting ──▶ node-turn ──[ is_done == "true" ]──▶ node-end
                    ▲   │
                    │   └──[ else ]──▶ node-speak
                    └────────────────────────┘
```

1. **node-greeting** — a static opening line, then listen. Something like *"Hi, I can get you fencing
   quotes. What are you after?"*
2. **node-turn** — function node calling `voice_turn`.
   - `wait_for_result: true`
   - `speak_during_execution: true` with a short filler — the confirm turn does real work
   - `speak_after_execution: false` — we do not want the model rewriting our words
   - response variables: `speak_text ← speakText`, `is_done ← isDone`
3. **node-speak** — reads `{{speak_text}}`, then listens, then loops back to node-turn.
   - Use the **static sentence** instruction type so the backend's words are spoken verbatim.
   - **Verify this on the first call.** If static text does not interpolate a dynamic variable, fall
     back to a prompt instruction reading: *"Say exactly this, word for word, adding nothing:
     {{speak_text}}"*.
4. **node-end** — speaks `{{speak_text}}` and ends the call.

### The `is_done` edge must be an equation

`{{is_done}} == "true"`, not a prompt condition. Whether the call ends is a fact the backend already
decided; letting a model judge it means calls that hang up mid-conversation, or never hang up.

---

## What to check on the first real call

1. The agent speaks **only** what the backend sent. Anything else means the node-speak instruction
   type is wrong — switch to the prompt fallback above.
2. The call ends on a finished quote and not before.
3. Saying a lettered option is fast. If every turn takes the same time, `matchSpokenToOption` is not
   hitting and everything is going to the model.
4. The suburb turn stops and waits rather than reading a list.

---

## Not built

- **The frontend.** The React app is not in this repository. It needs
  `npm install retell-client-js-sdk`, a mic button wired to `create-call` → `startCall(accessToken)`,
  a visible listening/speaking state, a clean stop on unmount, and a listener on
  `quoteResults/{resultId}` for the results page.
- **The Retell agent itself** — see above. Build, export, commit.
- **Phone-only calls** — blocked on the suburb, see above.
