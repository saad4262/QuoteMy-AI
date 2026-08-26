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
| Voice | `11labs-Noah` — Australian, male. Swap with any id from `list-voices` |

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
| At the suburb question it asks you to pick on screen and waits | Expected — voice cannot take a suburb, see VOICE.md |
| The call ends after the quote, and not before | The `is_done` edge is wrong — it must be the **equation**, never a prompt |

---

## When it complains

Two fields in the flow are the only ones the published schema left ambiguous. Both are one-line
fixes, and you will know immediately which one you hit.

### "must match exactly one schema in oneOf" on a node

The node validator prints every `oneOf` branch it tried, so the real cause is one line inside a wall
of noise. Three rules the published docs do not state, all learned from that wall:

- a `function` node takes `success_edge` and `failure_edge` — never `edges` / `else_edge`
- every `else_edge` needs a `transition_condition`, and its prompt must be the literal string
  `"Else"` — no other wording is accepted
- conditional routing after a function call needs its own `branch` node

All three are already correct in `conversation-flow.json`.

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
greeting  ──▶  turn  ──▶  route  ──[ is_done == "true" ]──▶  finish
                ▲                │
                │                └──[ else ]──▶  speak
                └──────────────────────────────────────┘
```

- **greeting** — one fixed opening line, then listens.
- **turn** — `function` node, calls our backend. Waits for the answer (`wait_for_result: true`) and
  says "One moment" while it waits, because the final turn does real work. It does **not** speak
  afterwards (`speak_after_execution` is absent) — we do not want a model rewriting our words.
- **route** — `branch` node, the only place the call's ending is decided.
- **speak** — reads `{{speak_text}}` exactly, listens, loops back.
- **finish** — reads the last `{{speak_text}}` and hangs up.

A `function` node cannot branch on its own result: it carries `success_edge` / `failure_edge` and
nothing else. That is why **route** exists as a separate node rather than the `turn` node holding the
`is_done` edge itself.

The `is_done` edge is an **equation**, not a prompt. Whether a call ends is a fact our backend
already decided; letting a model judge it gives you calls that hang up mid-sentence, or never hang up
at all.

---

Sources for the schema used here: [Create Conversation Flow](https://docs.retellai.com/api-references/create-conversation-flow) ·
[Create Agent](https://docs.retellai.com/api-references/create-agent) ·
[Create Web Call](https://docs.retellai.com/api-references/create-web-call) ·
[Conversation flow nodes](https://docs.retellai.com/build/conversation-flow/node)
