# Test descriptions

Two fencing businesses, both writing a lot of detail. One is genuinely publishable, the other only
looks like it is — that difference is the whole point of the review agent.

## Running them

```bash
# workflow open in the editor + "Execute workflow" clicked → use /webhook-test/
./n8n/send.sh http://localhost:5678/webhook-test/business-onboarding-fencing \
    tests/fixtures/description-GOOD-southeast-fencing.txt

# workflow activated → use /webhook/
./n8n/send.sh http://localhost:5678/webhook/business-onboarding-fencing \
    tests/fixtures/description-BAD-daves-fencing.txt test-biz-2
```

Pass a different `businessUid` (3rd argument) per run so the two don't overwrite each other's
Firestore docs.

## `description-GOOD-southeast-fencing.txt` — should be APPROVED

Has everything the blocking rules ask for: a per-metre rate for every type at every height it
offers, GST stated once and clearly, service area with a centre *and* a 30km radius, a $850 minimum,
removal priced separately per metre, gates priced per gate, site surcharges with real numbers, and
the pool compliance certificate explicitly excluded and priced.

Expect `status: "verified"`, `fixes: []`, and 20 core rate entries surviving quote verification
across pine, merbau, colorbond, aluminium, pool, chainmesh and rural.

**The line to watch:** *"So a 30 metre 1.8m pine fence replacing an old timber one is $85 per metre
plus $18 per metre for the removal."* Two rates in one sentence. Extraction must keep them separate —
85 as the pine rate, 18 as removal. If it returns 103, or files 18 as a fence rate, the extraction
prompt needs work. This is exactly the failure `CONTEXT.md` §7.2 was written about.

Also worth checking: `couldNotUnderstand` should pick up things with no home in the pricing spine —
the rural 100m minimum run, the "no extra charge for colour choice" note, the exclusions list.

## `description-BAD-daves-fencing.txt` — should be REJECTED

This is the important test, because it is *longer and friendlier* than the good one. 27 years of
experience, awards, five-star reviews, a family story, genuine detail about footing depth and
materials. A lenient reviewer approves it. It contains almost no usable price.

Expect `status: "unverified"`, `approved: false`, and `missingItems` naming most of these:

| Problem in the text | Rule broken |
|---|---|
| `$80 to $130 per metre` for timber | range, not a rate (Rule 4) |
| Colorbond `POA` | named, not priced (Rule 1) |
| Aluminium `starts from about $150ish` | "from" on a core rate (Rule 4) |
| Glass pool fencing `POA` | named, not priced (Rule 1) |
| Chainmesh `from $50` | "from" on a core rate (Rule 4) |
| Rural `call for pricing` | named, not priced (Rule 1) |
| Picket, post and rail, privacy screens, retaining walls named | no rates at all (Rule 1) |
| "900 right up to 2400", one price band | heights not priced individually (Rule F2) |
| "6ft or 1.8, same thing" / "1.2 or 1500" | mixed units (Rule F7) |
| Gates "extra of course, depends" | no per-gate price (Rule F3) |
| Old fence removal offered | mentioned, never priced (Rule F4) |
| Steep/rocky "does cost a bit more" | surcharge with no figure (Rule F5) |
| Glass pool fencing offered | compliance position never stated (Rule F6) |
| GST never mentioned | Rule 5 |
| No minimum charge | Rule 7 |
| "All over Melbourne and surrounds" | no centre + radius (Rule 6) |

If this one gets approved, the review prompt is too soft — that's the signal to tighten it, and it's
better to find that here than after a business has published a price list nobody can quote from.

## The false-rejection this file already caught

First run, this file was **rejected** over one line: `Gate motor supply and install — from $1,250`.
The reviewer treated it as a core rate breaking the no-"from" rule.

That was a genuine prompt defect, not a defect in the submission. A gate motor is an optional
add-on — it never enters `rate × length`, it lives in `capabilities/{trade}.extras`, which
`CONTEXT.md` §4 says never enters the price formula. The general rules already permitted "from"
pricing on extras, but the permission was buried in a trailing parenthetical on Rule 4 while the
agent's own prompt said flatly that `from $80/m` is "the absence of a rate". The agent followed the
prompt.

Fixed in three places: the prompt now draws the core-rate/extra distinction explicitly, Rule 4's
exception was promoted into its own **Rule 4a**, and F3 states that gate motors are an add-on rather
than a gate type. The line in this file was also changed to a firm `$1,450` so the fixture is
unambiguous.

Worth keeping in mind when writing new rules: an exception in a parenthetical will be ignored. If a
rule has a carve-out, give the carve-out its own heading.

Two more false-rejection risks were fixed at the same time, before they could bite:
- **F2 read as "must offer every height band."** Merbau and aluminium in this file legitimately start
  at 1.5m and 1.2m. F2 now says a business may offer any subset, and never to report a height they
  never claimed to install.
- **Missing extras treated as blocking.** Now explicitly non-blocking on their own.

## A third case worth trying by hand

Take the good file and change one rate to a number that appears nowhere else, or edit a rate after
the fact so no sentence supports it. Quote verification should drop that specific rate and report it
in `couldNotUnderstand`, while every other rate survives. That's the hallucination guard doing its
job, and it's cheap to verify manually.
