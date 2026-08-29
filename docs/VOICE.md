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
                          resolveSuburb()         ← Google, server-side
                                        ▼
                          runFencingChat()        ← the existing pipeline, untouched
                                        ▼
                          toSpeech()  +  voiceSessions/{sessionId}
                                        ▼
   call ends ──▶ GET /voice/session ──▶ the chat carries on where the call stopped
                                        ▼
                          confirm on screen ──▶ quoteResults/{resultId}
```

| File | What it does |
|---|---|
| [`src/client/voice/controller.ts`](../app/src/client/voice/controller.ts) | One turn. Thin on purpose. |
| [`src/client/voice/matchSpoken.ts`](../app/src/client/voice/matchSpoken.ts) | What they said → one of the choices read out, or nothing |
| [`src/client/voice/toSpeech.ts`](../app/src/client/voice/toSpeech.ts) | A turn, as words |
| [`src/client/suburb.ts`](../app/src/client/suburb.ts) | A suburb the customer said → a real place, or a choice of them |
| [`src/client/saveResult.ts`](../app/src/client/saveResult.ts) | The finished quote, where a page can listen |

---

## Endpoints

### `POST /api/v1/voice/create-call`

Starts a call. Body is optional:

```json
{ "checklist": "{…}", "place": "{…}", "options": "[…]",
  "checklistDisplay": "{…}", "checklistAnswered": "[…]", "message": "How long is the fence?" }
```

Returns:

```json
{ "sessionId": "8f1c…", "accessToken": "…", "configured": true, "greeting": "Welcome back. …" }
```

Sending these makes a **second** call continue the conversation rather than start it again — the
page holds them by then, from an earlier call's handover or from typing, and without them the caller
is asked their suburb twice in one sitting. Same JSON-text encoding the chat uses.

They also decide **what the call opens with**. A caller who typed half a brief and then pressed the
microphone should not be greeted like a stranger, and should not be walked straight into a question
either:

> *"Welcome back. I still have your details — Pakenham, Victoria 3 8 1 0, Treated pine. How long is
> the fence? Option A, 10 metres. Option B, 15 metres. …"*

That line is built by [`greetingFor`](../app/src/client/voice/toSpeech.ts) and handed to Retell as
the dynamic variable `{{greeting}}`, exactly the way `{{speak_text}}` is. The flow's greeting node
reads it and nothing else. **The speech model never writes it** — same rule as every other sentence
here. With nothing carried it is the ordinary opening line, which is also the flow's stored default,
so a call made from the Retell dashboard still greets properly.

`checklistAnswered` is carried as well as `checklistDisplay` because only the array keeps its
order across the wire. Without it the brief panel reshuffles itself the moment a call starts, which
reads as the call having lost something.

**The greeting is stored as turn `0`** of the new session, and returned here as well. Retell speaks
it from a dynamic variable before it ever calls `/voice/turn`, so nothing else in this service sees
it: it played, and then it was gone the next time the page was loaded — the one line of the call
that a customer coming back through "view chat" could not find. Zero and not one, so the numbering
of what was actually said back and forth is unchanged, and so a screen can tell the line nobody
answered from the ones they did. It carries `said: ""`, `wrote: ""`, and the standing `options` as
its `offered`, so the "turn `n` offers, turn `n + 1` chose" rule holds across the handover into a
call the same way it holds inside one.

A session document is therefore written for **every** call, not only one that carries a
conversation. A fresh call's is empty apart from that greeting — an empty `checklist` from this
endpoint means *nothing known yet*, never *clear what you have*.

The Retell API key never leaves the server — a browser holding it could create calls against the
account at will. Only the token, which is scoped to one call, is handed out.

With no key configured this still returns a `sessionId` and `configured: false`, which is what makes
the whole voice path testable from Postman with no Retell account.

### `POST /api/v1/voice/turn?sessionId=<id>`

Retell posts one of two shapes, and **both are accepted**:

```json
{ "name": "voice_turn", "call": { … }, "args": { "spokenText": "colorbond" } }
{ "spokenText": "colorbond" }
```

The nested one is the default; the flat one appears only when the tool's "args only" switch is on.
Reading just the flat shape cost days: every turn reached the pipeline as an empty string, the
model was handed nothing, the suburb question repeated for ever — and Retell's own call log showed
`{"spokenText":"In Pakenham 3810."}` being sent correctly the whole time. Nothing errored anywhere.
`turns[].said` coming back empty is the symptom to look for; it names the fault immediately.

`sessionId` comes from the query string. If it arrives as the literal `{{session_id}}` the dynamic
variable was never substituted, and it is refused rather than used — every call in the world sharing
one session document is worse than having no id at all.

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

Every chat response also carries **`checklistPending`** — the fields still to come, in the order
they will be asked, dependencies already applied:

```json
"checklistDisplay": { "material": { "title": "Material", "value": "Colorbond" } },
"checklistPending": [{ "key": "heightKey", "title": "Height" }, { "key": "lengthMeters", "title": "Length" }]
```

`checklistDisplay` holds answers and nothing else, which is right for a results page and wrong for a
panel beside a live conversation: with only the answered fields a screen cannot tell "not asked yet"
from "does not exist", so it can show neither. Somebody who said they have no gates never sees
"Gate count" waiting, because it will never be asked.

### `GET /api/v1/voice/session?sessionId=<id>`

Where a call becomes a chat.

```json
{
  "found": true,
  "turns": [
    { "n": 3,
      "at": "2026-08-28T01:19:52.000Z",
      "said": "yeah Pakenham 3810",
      "spoke": "Nice one — what type of fence are you after? Option A, Treated pine. …",
      "wrote": "Nice one — what type of fence are you after?",
      "offered": [{ "label": "Treated pine", "value": "timber_pine" }],
      "chose": null }
  ],
  "type": "question",
  "message": "Nice one — what type of fence are you after?",
  "options": [{ "label": "Treated pine", "value": "timber_pine" }],
  "checklistDisplay": { "suburb": { "title": "Suburb", "value": "Berwick, VIC 3806" } },
  "checklistAnswered": [{ "key": "suburb", "title": "Suburb", "value": "Berwick, VIC 3806" }],
  "checklistPending": [{ "key": "material", "title": "Material" }],
  "resultId": null,
  "checklist": { "suburb": "Berwick, VIC 3806", "material": "colorbond", "_ui": { } },
  "place": { "latitude": -38.0362, "longitude": 145.3478, "suburb": "Berwick" },
  "updatedAt": "2026-08-28T01:20:00.000Z"
}
```

**In a voice bubble, render `spoke`.** They are the same turn in two registers: `spoke` is what
was actually said aloud — "Pakenham, Victoria 3 8 1 0, one point five metres", with the choices read
out as Option A, Option B — and `wrote` is what the text chat would have put in the bubble. A
transcript of a call is a record of what was said, so it gets the spoken one; rendering `wrote`
there shows a heading in place of the sentence the customer actually heard.

`wrote` still has its own job: it is what the top-level `message` is taken from, so a caller who
hung up mid-question finds that question on screen in written form with its choices tappable.

`type` and `options` describe the turn the call ended on, so a caller who hung up on a question
finds it waiting with its choices still tappable rather than a transcript that simply stops.

`n` is the turn's number in the call, never reused — **key the rendered list on it, not on the
array position.** Spoken turns run from 1; `0` is the greeting, which has no `said` and no `wrote`
because nobody answered it and the text chat never had it.

Past `MAX_TURNS` the oldest turns are dropped and every index behind them shifts, so a page tracking "I have rendered the first N" re-renders turns it already had: new React
keys, a remounted list, and a visible flicker on every reply.

`at` is when the turn was recorded, ISO 8601. `n` orders a call against itself, which is not the
same as ordering a conversation: somebody types three messages, calls, hangs up, then types two
more, and a page holding those in two places has no way to interleave them — so the typed ones
stack at the bottom and the transcript reads in an order the conversation never happened in. A
clock is the only thing both halves share. **Merge typed messages and call turns into one list
sorted on time, then render top to bottom.**

`offered` is what that turn put on the table — the same thing top-level `options` holds for the
last turn, kept for every turn instead of only the newest. It is recorded for every turn, spoken
ones included, but **pills are drawn only where the conversation is in text mode**: a spoken turn
already read its choices out inside `spoke`, so drawing them again underneath is the same sentence
twice. See *Two modes, one transcript* below.

The answer is not on the same turn, because when that turn was written it did not exist yet: this
turn asks, the next one answers. **Fill the pill on turn `n` from `turns[n + 1].chose`.** In history
the pills are a record, not a control — only the last turn's are worth making tappable, and only
once the call has ended. `__other__` is a text box, not a choice: filter it out before drawing.

`chose` is the **label** of the option they picked, when what they said was one of the ones just
read out — `matchSpokenToOption` already works this out and the answer used to be thrown away.
Tapping "Treated pine" in the text chat leaves "Treated pine" in the transcript; saying it should
leave the same thing, not "Treated pine. I need treated pine." It is `null` when they said something
of their own.

`checklistAnswered` and `checklistPending` are the brief panel's two halves, so it fills in **while
the call runs** rather than all at once when it ends. **Draw the panel from these two arrays.**
`checklistDisplay` holds the same answers keyed by field, which is right for looking one up and
wrong for drawing a list: an object carries no order across a wire, so after Firestore and a
`JSON.parse` the panel reshuffles itself between the call and the results page for no reason the
customer can see. Both are on `POST /client/fencing-chat` as well, so one panel serves both doors. Fetch this on the SDK's `agent_stop_talking`
rather than on a timer: the agent stops talking exactly once per turn, so that is one request per
turn, where polling every two seconds would spend 90 of an IP's 600 hourly requests on a single
three-minute call.

The page asks for this when the Retell SDK says the call ended — whoever hung up — and renders
`turns` as the conversation.

**`resultId` present** means the call reached a quote: open the results page. **Absent** means the
caller hung up part-way, so post `checklist` straight back into `POST /client/fencing-chat` as
`knownChecklist` and let them finish by typing. Either way the conversation continues rather than
restarts — and `POST /voice/create-call` takes the same `checklist` back if they press the mic
again.

`checklist` carries `_ui` and must be handed back **whole**. Every field in it exists to stop a bug
the comments in `mergeAndDecide.ts` describe; a trimmed copy is how those bugs come back.

`found: false` is not an error, and now means only two things: an id nothing was ever created for,
or a call older than the session's half hour. Every created call has a document from the moment it
is created, because the greeting lives in it. Treat it as *nothing to merge*, never as *the call
failed*.

Deliberately **not** a Retell webhook. The browser sees the call end anyway, it is the thing that
has to render the result, and a webhook would add signature verification and a second write path
for nothing the customer would notice. That changes the day phone calls exist, because then there
is no browser.

---

## Two modes, one transcript

A conversation moves between typing and talking and back, sometimes several times, and it is one
conversation throughout. The screen shows **one list**, top to bottom, in the order things actually
happened. What changes between the two modes is not the list — it is what gets drawn into it.

| | what the screen shows |
|---|---|
| **call running** | live transcript only. Customer's speech right, agent's left. No pills. |
| **call ended** | the text chat as before: bubbles, and the standing `options` as pills. |

**During the call, the words come from the Retell Web SDK, not from here.** Its `update` event
carries the whole transcript array, both roles, in order, growing word by word as each side speaks.
Nothing in this service can stream — a turn is only written once it is finished — so a page that
waits for `GET /voice/session` shows a blank screen for the three seconds a customer is watching
most closely.

**When a turn commits, the same words arrive here permanently**, as `said` and `spoke`. The live
layer is a tail on the end of the committed one, and the two are separated by counting rather than
by matching text:

```
N   = committed turns with n >= 1        (the greeting, turn 0, is not one)
idx = position of the (N + 1)th 'user' entry in the SDK's transcript array
      found     -> live tail = transcript.slice(idx)
      not found -> live tail = []
render: committed bubbles, then the tail
```

The greeting needs no special case: it is turn 0 in the committed layer from the moment the call is
created, so it is on screen before anyone speaks and it is still there after a reload.

The live layer is **ephemeral by design** — it is gone on reload, and it is the only place a
half-spoken sentence or a turn that errored ever appears. The committed layer is the record.

**Context survives every crossing, in both directions, and always has:**

- **typing → talking**: `POST /voice/create-call` takes `checklist`, `place`, `options`,
  `checklistDisplay`, `checklistAnswered` and `message`, writes them under the new session before
  the call is minted, and opens on the question already on screen.
- **talking → typing**: `GET /voice/session` hands back `checklist` (with `_ui`) and `place`; post
  them into `POST /client/fencing-chat` as `knownChecklist` and `place`.

**Merge what comes back, never replace.** An empty `checklist` means nothing is known yet, which is
true of a call that has only just connected.

**Every call gets a new `sessionId`, and its `turns` start empty.** That is deliberate: the page
already holds everything said before this call. It follows that transcript entries must be keyed by
session as well as turn — `v-{sessionId}-{n}` — because two calls in one conversation both have a
turn 1, and a key of `v-{n}` silently overwrites the first call's lines with the second's.

The mode changes are worth drawing. A divider where a call starts and where it ends, and a
microphone mark on spoken bubbles, is the whole of it: without them a transcript that switches
register mid-list looks like a rendering bug rather than a conversation that changed medium.


## Environment

```
RETELL_API_KEY=          # server-side only, never sent to a browser
RETELL_AGENT_ID=
GEOCODING_API_KEY=       # already used by the business side; voice needs it too now
```

The first two unset is a supported state: the voice endpoints work, no Retell call is minted.
`GEOCODING_API_KEY` unset is not — the suburb question can never be answered without it, on either
front door. It must be a server key: one restricted to HTTP referrers is a browser key and Google
answers `REQUEST_DENIED`.

---

## Test it without Retell first

Do this before touching the dashboard. It exercises everything except speech.

```bash
SESSION=$(curl -sX POST localhost:8787/api/v1/voice/create-call | jq -r .sessionId)
say() { curl -sX POST "localhost:8787/api/v1/voice/turn?sessionId=$SESSION" \
  -H 'content-type: application/json' -d "{\"spokenText\":\"$1\"}" | jq -r '.speakText, .isDone'; }

say "I need a fence quote"
say "yes go ahead"
say "Berwick 3806"   # resolved server-side, needs GEOCODING_API_KEY
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

## The suburb, which used to be the thing voice could not take

`isMissing('suburb')` tests the geocoded place object, not the words
([`mergeAndDecide.ts`](../app/src/client/mergeAndDecide.ts)) — ranking measures distance and needs
coordinates. For a while that made voice unfinishable: a spoken suburb could never satisfy it, the
question came back every single turn, and no call reached a second question.

[`suburb.ts`](../app/src/client/suburb.ts) resolves it server-side instead, and both front doors get
it: the browser's picker still wins when it is used, and typing or saying a suburb now works
everywhere. **The question asks for a postcode**, because a postcode is the one form of the answer
that cannot be two places at once.

Three rules, and each one is there because the alternative fails silently:

- **Only a result Google itself calls a suburb or a postcode is accepted**, and `partial_match` is
  refused outright. Ask Google for "one point eight metres" and it returns a street somewhere,
  confidently, with coordinates.
- **More than one match is a question, never a guess.** Australia has a Richmond in four states.
  Picking the nearest produces a quote from businesses 900 km away and reports nothing. The
  candidates go back as options with their coordinates attached, so the reply needs no second trip
  to Google.
- **A name Google cannot place comes back as nothing**, and the question asks for the postcode by
  name rather than inventing a place.

Without `GEOCODING_API_KEY` the lookup returns nothing rather than a guess — which reads exactly
like the old bug, so check it first when a call stalls on the suburb.

## A call runs all the way to the quote

The recap is read back in full — every value, spoken — and then answered out loud: *"That is
everything I need. Shall I go and find you some quotes? Or tell me what you would like to change."*
Yes gets the search, the cheapest price read out, and goodbye. Anything else reopens whatever they
name, exactly as it does in the text chat.

Reading the whole brief first is what makes a spoken "yes" mean something. The written recap ends
"All correct?", which out loud invites a one-word answer to a list nobody has finished hearing; the
spoken one ends with a real question and an explicit way out, because saying "no" to a machine is
harder than tapping it.

**The quote itself is never read out.** Yes gets a sign-off and a hang-up, and the page takes over:

> *"Beauty — leaving it with me. I am pulling your quotes together now, and they will be on your
> screen in a moment. Thanks for calling, bye for now."*

Three businesses with five figures each is unlistenable, a price heard once cannot be compared with
anything, and a caller cannot scroll back through a phone call. The sign-off also says nothing about
what was found, deliberately — the same line has to be true when nobody covers the suburb, and a
cheerful count would be a lie at exactly the moment the customer is about to read bad news.

`isDone` is therefore `type === 'result'` and nothing else. The matcher has already run by the time
the sign-off is spoken, so `resultId` is written into the voice session on that same turn and
`GET /voice/session` hands the page somewhere to go the moment the call ends.

## Silence is the thing to design against

A caller cannot see a spinner. Two seconds of nothing reads as a dropped line, and the fixes are all
small:

- **`matchSpokenToOption` finds an option named inside a sentence** — "Treated pine. I need treated
  pine.", "yeah go with the Colorbond one". Nobody answers a spoken question with a bare noun, and
  every one of those turns was going to the model for an answer this code had already written. Ties
  and short labels still resolve to nothing: "no" appears in "no worries", which means yes.
- **The `turn` node speaks two or three words while the tool runs**, not a sentence — anything
  longer gets spoken over by the real answer arriving, which is what made the agent sound like it
  was interrupting itself.
- **`enable_typing_sound` on the same node** covers the rest. It cannot be cut off mid-sentence the
  way a spoken filler can, and it says "working" without saying anything.

---

## Building the Retell agent

The flow has four nodes and one tool. It contains **no fencing-specific content whatsoever** — no
field names, no materials, no questions. If the word "fencing" appears anywhere in it, something is
wrong: that content belongs in the backend, which is what makes a second trade a schema document
rather than a second agent.

> **This is now built and committed** — [`retell/`](../retell/) holds the exact payloads that
> created the live flow and agent, and its README carries the setup. The section below is the
> reasoning behind the shape; the files are the shape. Note that the node diagram here was right all
> along and the first committed flow was not: it grew a `branch` node and `success_edge`/`failure_edge`
> exits, which validate and then never route, and the call sat in one node improvising questions for
> two minutes.

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
4. The suburb is asked out loud, and answering it with a postcode works.
5. The call ends on the recap, and the page picks the conversation up from `GET /voice/session`.

---

## Not built

- **The frontend.** The React app is not in this repository. It needs
  `npm install retell-client-js-sdk`, a mic button wired to `create-call` → `startCall(accessToken)`,
  a visible listening/speaking state, a clean stop on unmount, a `call_ended` handler that calls
  `GET /voice/session` and hydrates the chat, and a listener on `quoteResults/{resultId}` for the
  results page.
- **Phone-only calls.** No longer blocked on the suburb — blocked on the handover instead, which
  assumes a browser is watching. A phone call would need the Retell `call_ended` webhook and
  somewhere other than a screen to put the recap.
