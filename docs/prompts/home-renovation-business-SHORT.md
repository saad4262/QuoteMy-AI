# Add "Home Renovation" — business side (short)

We've added a **sixth trade** to the backend: home renovation. It works exactly like the five you
already built (fencing, tiling, kitchen, retaining wall, decking). Same endpoint, same flow, same
screens — it just needs to exist in the picker.

**Slug: `home_renovation`**

## 1. Trade picker

Read the list from `GET /api/v1/client/trades` instead of a hardcoded array — it already returns six.
Send `trade` on all three actions:

```jsonc
{ "action": "submit",  "businessUid": "...", "trade": "home_renovation", "text": "..." }
{ "action": "profile", "businessUid": "...", "trade": "home_renovation" }
{ "action": "confirm", "businessUid": "...", "trade": "home_renovation" }
```

`trade` defaults to `"fencing"` if you leave it out, so it would silently write the wrong document.

## 2. ⚠ `services_provided` — the ONE thing that must be exact

This is the only real trap. Write the slug **exactly**:

```
home_renovation   ✓         renovation       ✗
home-renovation   ✓         renovations      ✗
                            home renovation  ✗   (space)
```

Anything else and the business gets approved, presses Confirm, goes live — **and is still invisible
to every customer.** This already happened once with `retaining_wall` (was written as
`retaining-wall`).

## 3. Confirm screen — two small differences

Everything renders like the other trades, with two things to know:

- **Room prices have NO unit, and that's correct.** "Bathroom renovation labour $6,850" is a complete
  rate. Don't append "per job", don't show a warning icon. A flat price per room IS this trade's
  unit. (Kitchen fitting is the same.)
- **There are three extra lists to display:** `surfaces` (per m²), `perItem` (each), `hourly`
  (per hour). Show them under their own headings with something like *"Shown on your profile, quoted
  on site"*. They're real published prices — just never part of a customer quote, because we never
  ask a customer for an area, a count or a number of hours.

`rates` is keyed by room:

```jsonc
"rates": { "bathroom": [ { "jobType": "full_renovation", "price": 6850, "unit": "per_job" },
                         { "jobType": "demolition_only", "price": 1450, "unit": "per_job" } ] }
```

## 4. Labels

Use the label map that comes down with the trade — never render a raw slug.
`full_renovation` → "Full renovation", `labour_only` → "Installation only".

## Test

A renovation business submits → approved → confirms → **appears in a customer search.**
That last step is what `services_provided` breaks.
