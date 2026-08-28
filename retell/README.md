# Retell setup, from zero

You do not need to know Retell. Follow this in order — it is four commands and two dashboard clicks.

Everything the customer hears is written by our backend. Retell only turns speech into text, text into
speech, and takes turns. The flow in this folder contains **no fencing content at all** — no
questions, no materials, no prices. That is on purpose: it is why a second trade will need no changes
here.

---

## Already created on this account

| | |
|---|---|
| Conversation flow | `conversation_flow_f53c56682df5` |
| Agent | `agent_29da95d54d4b96b211dbdf95bf` |
| Voice | `11labs-Amy` — British, female, young. See the note below on why not Australian |

The files here are the payloads that produced those, verified against the live API. Re-run Steps 2
and 4 only to create a second flow/agent or to rebuild on another account; to change an existing one
use `update-conversation-flow` / `update-agent` instead.

**Do not use the dashboard's Import button.** It expects an agent *export bundle* (one object holding
both `agent` and `conversationFlow`) exported from another Retell workspace. Handing it either file
here fails with `undefined is not an object (evaluating 'e.conversationFlow.is_transfer_cf')`. The
API below is the way in.

---

## Before you start

- A Retell account, and your API key from **Dashboard → API Keys**.
- Your backend deployed and reachable on the public internet. Retell calls it, so `localhost` will
  not work. If you are only testing, use `ngrok http 8787` and take the https URL it prints.

Check the backend first — this must answer before anything else is worth doing:

```bash
curl -sX POST "https://quote-my-ai.vercel.app/api/v1/voice/create-call"
# {"sessionId":"…","accessToken":null,"configured":false}
```

`configured: false` is correct at this stage. It means the backend works and Retell is not wired yet.

---

## Step 1 — The backend URL is already in the flow

[`conversation-flow.json`](conversation-flow.json) already points at the deployed backend:

```
"url": "https://quote-my-ai.vercel.app/api/v1/voice/turn"
```

Change it only if you deploy somewhere else. Nothing else in that file needs editing.

---

## Step 2 — Create the flow

```bash
export RETELL_KEY=your_api_key_here

curl -sX POST https://api.retellai.com/create-conversation-flow \
  -H "authorization: Bearer $RETELL_KEY" \
  -H "content-type: application/json" \
  -d @retell/conversation-flow.json
```

The reply contains `conversation_flow_id`. **Copy it.**

If it errors, jump to [When it complains](#when-it-complains) — there are two known-uncertain fields
and both are one-line fixes.

---

## Step 3 — Pick a voice

Dashboard → **Voices**. Play a few, pick an Australian one, copy its `voice_id`.

There is no way to choose this from here — it is a taste decision and the ids change.

---

## Step 4 — Create the agent

Put the flow id and the voice id into [`agent.json`](agent.json), then:

```bash
curl -sX POST https://api.retellai.com/create-agent \
  -H "authorization: Bearer $RETELL_KEY" \
  -H "content-type: application/json" \
  -d @retell/agent.json
```

The reply contains `agent_id`. **Copy it.**

### There is no Australian female voice

`list-voices` returns 300 voices and exactly **two** Australian ones — `11labs-Noah` and
`11labs-charlie`, both male, both middle-aged. There is no young Australian female voice to pick.

`11labs-Amy` (British, female, young) is the closest available and is what is set. To an Australian
ear a British voice sits far nearer than an American one, which is the only other option. The other
two worth hearing are `11labs-Maren` and `11labs-Dorothy`; every voice has a `preview_audio_url` in
the `list-voices` response, so listen before deciding.

A genuinely Australian female voice means bringing one from ElevenLabs' own library under your own
ElevenLabs key. That is the only route, and it is a Retell dashboard setting rather than anything in
these files.

### What `agent.json` sets beyond the voice

| Field | Why |
|---|---|
| `stt_mode: "accurate"` | The default is `fast`, which trades transcription accuracy for latency. Wrong on this side of the product: a misheard height becomes a wrong quote, silently. |
| `boosted_keywords` | Biases the transcriber toward words it otherwise mangles — `Colorbond`, `merbau`, `Pakenham`. Without it, suburb and material names come through as something else entirely. |
| `denoising_mode` | Background speech cancelled as well as noise; these calls are made in kitchens and utes. |
| `enable_backchannel: true` | "Mhmm", "right", "gotcha" while the customer talks. These carry no fact and no number, so they are the one place a generated word is harmless — and without them a caller talking to silence assumes the line has dropped. |
| `interruption_sensitivity: 0.9` | The agent stops when the caller starts. Was `0.7`, which had it reading a list of options over somebody already answering. Denoising is what makes 0.9 safe: a cough no longer counts as speech. |
| `voice_speed: 0.95` | Slightly under a native pace. The customer is being read suburb names, heights and prices, and every one of them is a number they have to hold. |
| `responsiveness: 1` | A caller who has just answered should not wait to be asked the next thing. |
| `begin_message_delay_ms: 500` | Half a second before the greeting, so the first three words are not lost while the browser finishes opening the microphone. |

`normalize_for_speech` is deliberately absent: Retell stores it as `null` on this engine, and the
words are normalised on our side already ([`toSpeech.ts`](../app/src/client/voice/toSpeech.ts)) —
"1.8m" to "one point eight metres", "VIC 3806" to "Victoria three eight zero six". Two layers of
number-reading would fight each other.

`boosted_keywords` is the one place trade vocabulary leaks into this folder. There is no
trade-agnostic way to bias a transcriber, so a second trade adds its materials to that list — the
flow itself still needs no change.

---

## Step 5 — Tell the backend

```
RETELL_API_KEY=your_api_key_here
RETELL_AGENT_ID=agent_id_from_step_4
```

On Vercel these go in **Settings → Environment Variables**. Mark the key **Sensitive**.

The API key stays on the server and must never reach a browser — anyone holding it can create calls
against your account.

Redeploy, then:

```bash
curl -sX POST "https://quote-my-ai.vercel.app/api/v1/voice/create-call"
# {"sessionId":"…","accessToken":"…","configured":true}
```

`configured: true` and a real `accessToken` means the whole backend half is done.

---

## Step 6 — Make one test call

Dashboard → your agent → **Test call**.

Say *"I need a fence quote"*. Four things to watch, in this order:

| Check | If it is wrong |
|---|---|
| It speaks **only** what our backend sent — no extra sentences, no invented prices | The `speak` node instruction is wrong. See [When it complains](#when-it-complains) |
| Saying a lettered option ("option B") is noticeably faster than a full sentence | The tool is not being called with verbatim text, or `sessionId` is not reaching it |
| The wait is filled with "Righto." or "Timber it is.", never the same twice running | The `turn` node's instruction is static text again, or the global prompt lost its carve-out |
| The suburb is asked out loud, and "Berwick 3806" is accepted | `GEOCODING_API_KEY` is missing on the server — the lookup returns nothing rather than a guess, which looks exactly like the old bug |
| It reads the recap back, takes a spoken yes, then reads the cheapest price and hangs up | The `is_done` edge is wrong — it must be the **equation**, never a prompt |

---

## When it complains

Two fields in the flow are the only ones the published schema left ambiguous. Both are one-line
fixes, and you will know immediately which one you hit.

### "must match exactly one schema in oneOf" on a node

The node validator prints every `oneOf` branch it tried, so the real cause is one line inside a wall
of noise. Three rules the published docs do not state, all learned from that wall:

- every `else_edge` needs a `transition_condition`, and its prompt must be the literal string
  `"Else"` — no other wording is accepted. This is the error that reads as though it were about
  something else; it was once misread here as "a function node cannot take `edges`", which cost a
  working flow.
- a `function` node takes `edges` and `else_edge`, exactly like a conversation node, and branches on
  its own result. It needs no `branch` node after it.

Both are already correct in `conversation-flow.json`.

### Every turn reaches the backend empty

`turns[].said` is `""` in `GET /voice/session`, the same question repeats for ever, and the call log
shows the right words being sent. A custom tool posts `{ name, call, args: { spokenText } }` unless
its **"args only"** switch is on, which flattens it to `{ spokenText }`. The backend now reads both
([`voice/controller.ts`](../app/src/client/voice/controller.ts)), so this cannot come back — but it
is the first thing to check on any new tool, because it fails in complete silence.

### `POST /v2/create-conversation-flow` returns "Cannot POST"

Those two endpoints are **unversioned** — `/create-conversation-flow` and `/create-agent`, no `/v2`.
Only `/v2/create-web-call` (which the backend calls, not you) carries the prefix.

### The agent reads `{{speak_text}}` out loud, literally

That means static text does not substitute variables in your account. Change the `speak` and
`finish` nodes from:

```json
"instruction": { "type": "static_text", "text": "{{speak_text}}" }
```

to:

```json
"instruction": { "type": "prompt", "text": "Say exactly this, word for word, adding nothing and removing nothing: {{speak_text}}" }
```

This is the only place a model touches our words, which is why it is the fallback and not the
default.

### `language: en-AU` is rejected

It is not — `create-agent` accepted it on this account. If a future change rejects it, `en-US` in
`agent.json` costs you the accent and nothing else.

---

## After it works

Export the flow and commit the export over `conversation-flow.json`:

```bash
curl -s "https://api.retellai.com/get-conversation-flow/YOUR_FLOW_ID" \
  -H "authorization: Bearer $RETELL_KEY" > retell/conversation-flow.json
```

The export is Retell's own shape, so from then on this file is exact rather than reconstructed from
their docs.

---

## What each node does

```
greeting  ──▶  turn  ──[ is_done == "true" ]──▶  finish
            ▲   │
            │   └──[ else ]──▶  speak
            └─────────────────┘
```

- **greeting** — one fixed opening line, then listens.
- **turn** — `function` node, calls our backend. Waits for the answer (`wait_for_result: true`) and
  says "One moment." while it waits, because the final turn does real work. It branches on the
  result itself; there is no separate routing node.
- **speak** — reads `{{speak_text}}` exactly, listens, loops back.
- **finish** — reads the last `{{speak_text}}` and hangs up.

### `speak_after_execution` must be explicitly `false`

Leave it out and Retell defaults it **on**, which hands the model the microphone the moment the tool
returns. It reads our words — and then keeps going, inventing the next question, and the next,
because nothing has told it to stop. The call that proved this ran 128 seconds and reached our
backend exactly once; every question after the first was written by Retell's model, not by us. All
speaking belongs to the **speak** node, which reads `{{speak_text}}` and nothing else.

### The `turn` node's exits are `edges` / `else_edge`

Not `success_edge` / `failure_edge`. Those two validate — the API stores them without complaint —
and then the flow engine finds no exit it recognises and the call never leaves the node. Nothing
errors: the model simply carries on talking, sounding perfectly fine, using none of our questions.

So read a call's own log rather than trusting a transcript. `get-call` returns a `public_log_url`,
and one `Transitioning from node … to node …` line per customer turn is what a healthy call looks
like:

```bash
curl -s "https://api.retellai.com/v2/get-call/CALL_ID" -H "authorization: Bearer $RETELL_KEY" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["public_log_url"])'
```

### The filler is the only sentence the model writes

The `turn` node's instruction is a **prompt**, not static text, so the wait is filled with "Righto."
or "Timber it is." rather than "One sec." on every single turn, which is what made the call sound
like a machine. It is the one generated sentence in the product, and it is fenced in twice: the node
prompt forbids any fact, number, price or name, and the flow's **global prompt carries the same
carve-out in its own paragraph**.

Both places, deliberately. A rule that lives only in the node contradicts a global prompt that says
the agent may say nothing of its own — and when those two conflict, the prompt wins and the node is
ignored. That has already cost this project a working agent once.

### The `is_done` edge is an equation, not a prompt

Whether a call ends is a fact our backend already decided; letting a model judge it gives you calls
that hang up mid-sentence, or never hang up at all.

---

Sources for the schema used here: [Create Conversation Flow](https://docs.retellai.com/api-references/create-conversation-flow) ·
[Create Agent](https://docs.retellai.com/api-references/create-agent) ·
[Create Web Call](https://docs.retellai.com/api-references/create-web-call) ·
[Conversation flow nodes](https://docs.retellai.com/build/conversation-flow/node)
