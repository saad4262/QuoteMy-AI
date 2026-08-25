# QuoteMy — what the n8n side needs from the Node.js backend

Context: the quoting workflows are moving off the old `businesses/{uid}/pricing/{trade}`
shape onto the new `businesses/{uid}/services/{trade}/jsondata/extracted` shape, and the
customer-facing MCQ questions are moving from hardcoded lists in n8n onto `/schema/{trade}`.

Two parts below: (A) things I need you to ADD, (B) things I need you to CONFIRM.

---

## A. Please add to `/schema/{trade}` (e.g. `/schema/fencing`)

Right now `core` holds bare slugs (`timber_pine`, `restricted_access`, `pedestrian_single`).
The chat has to show these to a homeowner, and `"Pool Aluminium"` auto-generated from a slug
reads badly. So the schema doc needs a display layer next to `core`:

```jsonc
/schema/fencing
{
  "core": { ...unchanged... },
  "extras": { ...unchanged... },

  "labels": {                                  // NEW — slug -> customer-facing text
    "materials": {
      "timber_pine":      "Treated pine",
      "timber_hardwood":  "Hardwood timber",
      "colorbond":        "Colorbond",
      "aluminium":        "Aluminium",
      "pool_aluminium":   "Pool fencing — aluminium",
      "pool_glass":       "Pool fencing — glass",
      "chainmesh":        "Chainmesh",
      "rural_wire":       "Rural wire"
    },
    "conditions": {
      "sloped":            "Sloped block",
      "rock":              "Rocky ground",
      "restricted_access": "Restricted access",
      "hand_dig":          "Hand dig needed"
    },
    "removes":  { "timber": "Timber fence", "metal": "Metal fence" },
    "gateTypes": {
      "pedestrian_single": "Single pedestrian gate",
      "driveway_double":   "Double driveway gate",
      "driveway_sliding":  "Sliding driveway gate",
      "motor_automation":  "Motorised / automation"
    }
  },

  "questions": {                               // NEW — the question text per checklist field
    "material":       "What type of fence are you after?",
    "heightKey":      "What height are you after?",
    "lengthMeters":   "How long is the fence?",
    "removal":        "Is there an old fence to remove?",
    "conditions":     "Anything tricky about the site?",
    "gateType":       "Do you need any gates?",
    "gateQty":        "How many of those gates?"
  }
}
```

Notes:
- `labels.removes` intentionally has no entry for `"any"`. `"any"` is a business-side wildcard
  ("we'll remove whatever is there"), not something a customer can answer, so the chat never
  offers it. If that assumption is wrong, tell me.
- Both maps are optional from n8n's point of view — I ship a fallback (slug -> Title Case, plus
  built-in default question text) so nothing breaks before you add them. The wording is just
  worse until they exist.
- Same shape will be needed for `tiling`, `decking`, `retaining-wall` when those migrate.

### Optional (nice to have, not blocking)
`core.heights` per material, e.g.
`"heights": { "colorbond": ["1.2m","1.5m","1.8m","2.1m"], "pool_glass": ["1.2m"], ... }`
aggregated across businesses. Without it, n8n derives the height choices at runtime from the
`rates` of the businesses that actually cover the customer — which works, but costs an extra
read round-trip mid-conversation. With it, that round-trip disappears.

---

## B. Please confirm (these are assumptions the n8n code is being written against)

**Service area**
1. The business ROOT doc (`businesses/{uid}`) no longer carries `serviceArea` — service area is
   per-trade, at `services/{trade}/jsondata/extracted → data.serviceArea`. Correct?
2. For a `confirmed` doc, are `data.serviceArea.resolved.lat`, `.lng` and `data.serviceArea.radiusKm`
   ALWAYS present? (If they can be missing, that business simply won't be matchable.)
3. `data.serviceArea.excludedAreas[]` — what are the elements? Plain suburb strings
   (`"Frankston"`), postcodes, or objects (`{ name, placeId }`)? I'm currently tolerating all three.
4. Old strict rule was "business's registered suburb must equal the customer's suburb". The new
   data has no placeId, so matching is now purely `distance(customer, resolved) <= radiusKm`.
   Confirmed that this is the intended behaviour?

**Status**
5. `status: "confirmed"` appears on BOTH `services/{trade}` and `services/{trade}/jsondata/extracted`.
   Which one is authoritative? Can they disagree? (n8n currently accepts the doc if either says
   confirmed — tell me if it should be stricter.)
6. What replaces the old `isComplete` flag? Is `status === "confirmed"` the only gate, or is
   `ratesSaved > 0` also meaningful?

**Rates**
7. Rate keys are strings like `"1.2m"`, `"1.35m"`, `"2.4m"`. Is the format guaranteed to be
   `<number>m` always? (n8n compares them numerically, so `"1.8m"` vs `"1.80m"` vs `"1.8"` all
   work — I just need to know it's never something like `"1800mm"` or `"low"`.)
8. Confirmed that the available heights differ per material per business (this doc: `chainmesh`
   only has 1.8m/2.4m, `pool_glass` only 1.2m) and that this is intentional, not incomplete data.
9. `enabledMaterials` vs the keys of `rates` — this doc has rates for `timber_hardwood`,
   `chainmesh`, `pool_aluminium` but those are NOT in `enabledMaterials`. Which one decides
   whether the business can be quoted for that material? (n8n currently requires BOTH.)

**Removals / conditions / gates**
10. `removals[]` — can a business have several entries (e.g. one for `timber`, one for `metal`),
    or is it always a single entry? Is `removes: "any"` meant to match every removal type?
11. `siteConditions[].extraPercent` (e.g. `sloped: 10`) — 10% of WHAT? My assumption:
    10% of (install rate + removal rate) x length, i.e. it does NOT apply to gate prices.
    Confirm or correct.
12. Can a condition have BOTH `extraPerMetre` and `extraPercent` set? (n8n adds both if so.)
13. `gates[].material: null` — does that mean the gate price applies to any fence material?
14. `isFromPrice: true` on a gate/extra — is that "starting from, final price may be higher"?
    n8n will badge it as "from $X" and still use the number in the total.

**Data quality**
15. `capabilities.warranty` on this doc says `years: 12` but `text` says "12-month warranty".
    12 years or 12 months? Looks like the extractor put months into a years field.
16. `capabilities.extras[]` (e.g. `Timber capping $5/metre`) — should these ever be added to a
    quote automatically, or are they display-only until the customer explicitly asks for them?
    (n8n currently treats them as display-only.)
17. `data.serviceArea.baseLocation` is the raw typed value (`"pkehnam"` — misspelled) while
    `resolved.suburb` is `"Pakenham"`. n8n only ever uses `resolved`. Any reason to use the raw one?

**Schema growth**
18. When a business offers something not in `core` (like `bamboo-screening`), it lands in
    `schema.{trade}.extras` with a `businessCount`. Confirmed that `extras` entries have NO
    priceable rates behind them? The chat will therefore never offer them as an MCQ choice — it
    only recognises them if the customer names one, and then says we can't price it. OK?
19. Is there (or can there be) a count of how many businesses enable each `core` material?
    Not needed today — the chat just shows the first 3 in schema order — but it would let us
    show the genuinely most common options first later.
