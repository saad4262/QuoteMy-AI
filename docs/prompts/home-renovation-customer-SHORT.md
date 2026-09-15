# Add "Home Renovation" — customer side (short)

We've added a **sixth trade** to the backend: home renovation. It works exactly like the five you
already built.

**If your chat renders questions, options and the brief panel from what the server sends, this costs
you almost nothing** — the trade appears by itself, asks its own questions, and quotes.

## 1. The picker

`GET /api/v1/client/trades` now returns six. Read the picker from it — don't hardcode the array.

```jsonc
{ "trade": "home_renovation", "label": "home renovation" }
```

The chat also routes to it from the customer's own words — *"I need a renovation quote"*,
*"renovate my bathroom"*, *"bedroom renovation in Berwick"* — with no `trade` sent.

## 2. ⚠ One heads-up: a room being RENOVATED now goes to the renovator

This is the only thing that changes for trades you already have. Nothing to code — just so it
doesn't surprise you:

| customer says | used to go to | now goes to |
|---|---|---|
| "I want a bathroom renovation" | tiling | **home renovation** |
| "renovate my bathroom" | tiling | **home renovation** |
| "kitchen renovation" | kitchen fitting | **home renovation** |
| "retile the bathroom" | tiling | tiling — *unchanged* |
| "I need a new kitchen" | kitchen fitting | kitchen fitting — *unchanged* |

The word *renovate / renovation / remodel / reno* wins over the room name. If any demo or test script
of yours opens with "bathroom renovation", it will now ask different questions.

## 3. The quote card — two things

- **`unit` is `"item"`** → print the total, never append `/m`. `ratePerMeter` carries the whole job
  price here because there's no unit to divide by. Kitchen fitting already works this way; if you
  handle that, you're done.
- **Show every badge, don't truncate.** Two badges appear that no other trade produces:

  > *"Floor tiling measured on site, not in this price"*
  > *"Carpentry charged by the hour on site, not in this price"*

  A renovator sells work by the m² and by the hour as well as by the room. We never ask the customer
  for an area or for hours, so those can't be totalled — the badge is how they're told. If a
  customer asked for tiling, sees no mention of it, and assumes it's in the price, that's the UI
  hiding it, not the quote.

## 4. Questions it asks

Seven, all server-driven — you don't need to know them:

```
suburb → room → jobType → supply → removal → extras → conditions
```

Two notes for the brief panel: there is **no quantity** (no length, no area — a renovator prices the
room, same as kitchen fitting), and **`removal` is conditional** — if the customer picks "just strip
it out", that question is never asked, so don't leave a gap waiting for it.

## Test

1. Picker shows six trades, read from the endpoint.
2. *"I want to renovate my bathroom in Berwick"* reaches home renovation.
3. A finished quote shows a total with no `/m` anywhere.
4. All badges visible, including the two "not in this price" ones.
