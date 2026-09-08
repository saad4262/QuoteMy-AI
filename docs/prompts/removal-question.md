# Prompt — the "old fence / old tiles" question is now yes-or-no

Paste everything below the line into your editor / AI assistant.

---

You are working on the **customer-facing quote chat** of QuoteMy AI (React).

## What changed

The question about removing what is already there — *"Is there an old fence to remove?"* on fencing,
*"Are there old tiles to take up?"* on tiling — used to open with a **type** as its first choice:

```
Is there an old fence to remove?     [Timber fence]   [Nothing to remove]   [Other]
Are there old tiles to take up?      [Ceramic tiles]  [Nothing to take up]  [Other]
```

The answer to the question was not among the choices. It now opens with the answer:

```
Is there an old fence to remove?     [Yes, take it away]   [Nothing to remove]   [Other]
Are there old tiles to take up?      [Yes, take them up]   [Nothing to take up]  [Other]
```

**This is a backend change and it is already live.** The values are `any` and `none`.

## What you have to do

Most likely **nothing**. The chips come down the wire as `options`, and if you render that array you
already have the new behaviour — reload the page and start a fresh conversation to see it (a
conversation already in progress carries its old state).

Two things to check, and one to fix if you find it:

1. **Nothing in the chat components may name `timber`, `metal`, `ceramic`, `porcelain`, or the label
   "Timber fence".** If any of those is written into a component, a hardcoded list is being rendered
   instead of the server's, and every future change to any question will silently miss you.
2. **`Other` (`value: "__other__"`) stays.** It is not a real answer — it opens your free-text box, as
   it does on every other question. Do not filter it out, and do not send `__other__` back as an
   answer.
3. **Do not add client-side validation to this question.** A customer typing "the old timber one" or
   "yeah there's tiles under it" into the free-text box is resolved server-side. Send the words
   through unchanged.

## Why the types still exist behind the box

A customer who knows what is there gets a better price. Businesses publish removal rates **per type**
— timber vs metal, ceramic vs porcelain — and when the customer only says "yes", the quote uses that
business's **dearest** removal rate, because the one number nobody may be shown is a total below what
they will actually be charged. Naming the type gets them their own rate instead.

So the two chips are the fast path, and the free-text box is where a customer who knows more can say
so. Do not build a UI that makes the types unreachable.

## How to check it

Run one conversation per trade to that question:

| Trade | Say | Expect |
|---|---|---|
| Fencing | "I need a fence quote" → yes → a suburb → colorbond → 1.8m → 20 | `[Yes, take it away] [Nothing to remove] [Other]` |
| Tiling | "I need my bathroom tiled" → yes → a suburb → bathroom → ceramic → 8 → who supplies | `[Yes, take them up] [Nothing to take up] [Other]` |

If you still see `[Timber fence]` or `[Ceramic tiles]` first: it is a stale conversation or a cached
page, not a bug. Start a new one and hard-refresh.

## Acceptance

- Both trades open that question with the yes-answer first.
- Tapping it records the answer and the conversation moves on.
- The free-text box still accepts "the old timber one" and it is understood.
- No component in the chat names a removal type.
