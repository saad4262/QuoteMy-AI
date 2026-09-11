# Adding a trade

Everything a new trade needs, in the order it needs it. Fencing and tiling are the two worked
examples throughout: **fencing is the simpler shape, tiling is the one with a labour/material
split.** A trade whose businesses sell materials as well as fitting them copies tiling.

The list below is not a search. `TRADES` is a closed union and there are **sixteen per-trade tables
across eight files**, nearly all `Record<Trade, …>` — so **the compiler hands you most of this
checklist itself**: add the trade to `TRADES`, run `npm run typecheck`, and every table that now has
a hole is an error with a file and a line.

What the compiler cannot see is marked ⚠. Those are the ones to be careful about, because nothing
fails when they are wrong. They fail quietly, in front of a customer.

```
cd app
npm run typecheck     # the checklist, generated
npm test              # the goldens are the safety net
```

To re-derive the table list at any time:

```
grep -rn "Record<Trade" app/src/          # 15 one-line matches
grep -n  "Record<$" app/src/messages.ts   # TRADE_WORDS wraps, so the grep above misses it
```

---

## 0. Before any code: decide the shape

Three questions settle most of the work. Answer them from the trade's real price lists, not from
what would be tidy.

| | Fencing | Tiling | Kitchen |
|---|---|---|---|
| What is the job measured in? | linear metres | square metres | **nothing — one price for the job** |
| Which two answers find a rate? | material × height | job type × tile type | job type × kitchen size |
| Do the businesses sell materials too? | **no** — one combined rate | **yes** — fitting and tile supply are separate | **yes** — cabinetry packages |

If the answer to the third is **yes**, you are copying tiling. See §7.

Fill this row in before writing a line of code. All three answers propagate into `vocab.ts`,
`fieldSpec.ts` and `pricing/spec.ts`, and changing one afterwards means changing the vocabulary,
which is a schema migration.

---

## 1. `src/vocab.ts` — the closed lists

**The highest-risk file in the repo.** Every list is closed: the model picks a value from it or the
line goes to `unmapped`. It is never allowed to invent one, because vocabulary drift is the only
failure here that is silent and permanent — `treatedPinePaling` for one business and `timber_pine`
for the next makes both invisible to customer search, with no error raised anywhere.

Add the trade's own lists under its own names. **Do not add values to fencing's lists.** `gateTypes`
is not a concept tiling has and `surfaces` is not one fencing has:

```ts
export const DECK_MATERIALS = ['merbau', 'treated_pine', 'composite', 'spotted_gum'] as const;
export const DECK_JOB_TYPES = ['ground_level', 'raised', 'stairs', 'pergola'] as const;
export const DECKING_BOUNDS = { pricePerSqm: { min: 0, max: 2000 }, price: { min: 0, max: 100_000 } };

export const DECKING_VOCAB: TradeVocab = {
  core: { materials: DECK_MATERIALS, jobTypes: DECK_JOB_TYPES, units: UNITS, tags: DECK_TAGS },
  bounds: DECKING_BOUNDS,
};
```

Then two edits the compiler will demand:

```ts
export const TRADES = ['fencing', 'tiling', 'kitchen', 'decking'] as const;
export const TRADE_VOCAB: Record<Trade, TradeVocab> = { …, decking: DECKING_VOCAB };
```

Kitchen's own lists are the third real worked example, and the one to copy for a trade with no
per-unit rate: `KITCHEN_SIZES` is a rate KEY rather than a quantity, and `KITCHEN_BOUNDS` has a
`price` and no `pricePerMetre` or `pricePerSqm` at all, because every figure in the trade is a price
for a thing.

Adding a value to one of these later is a **schema migration**, in both the extraction schema and
the verifier. Treat it as one.

---

## 2. `src/messages.ts` — seven tables

Six are `Record<Trade, …>` on one line; `TRADE_WORDS` wraps, so a one-line grep misses it. All seven
are compiler-enforced.

| Table | What it is | Gets it wrong how |
|---|---|---|
| `CUSTOMER_CORE` | what the chat may **offer**, per trade, **in the order it offers them** | a customer-facing order is a customer-facing decision — not the vocabulary's order |
| `CUSTOMER_LABELS` | slug → the word a **customer** sees | — |
| `TRADE_LABELS` | slug → the word a **business** sees, flattened | a tiler's screen renders raw slugs |
| `TRADE_QUESTIONS` | field → the question asked | fencing's wording reaches a kitchen customer |
| `TRADE_WORDS` | `{ trade, noun, mentions, article, tradesperson }` | *"a fencer will be able to tell you"*, said to somebody having a kitchen fitted |
| `NO_MATCH_MESSAGES` | what to say when nobody can quote this part of the brief | a dead end instead of "want to try without it?" |
| `WHAT_TO_SEND` | what a business must send: `{ need, helpful, example }` | an empty form with no shape of a right answer |

Three things worth copying rather than inventing:

- **`CUSTOMER_CORE` is not `TRADE_VOCAB`**, even for fencing. `removes` leads with the wildcard
  `any` because the question is a yes/no one, while the vocabulary lists it last. Three choices show
  at a time, so the three commonest go first.
- **`TRADE_LABELS` order matters when slugs repeat across groups.** Tiling's `bathroom` is both a job
  type and a wet area; `ceramic` is both a tile and something being taken up. Flattening loses that,
  so the factual naming is assigned **last**, overwriting the customer-chat phrasing — a business
  screen should read "Bathroom", never "Yes, the bathroom".
- **`WHAT_TO_SEND.need` and the SOP must agree.** The business reading the form and the reviewer
  judging the submission have to be working from one list, or a business sends exactly what it was
  asked for and gets rejected for it.

---

## 3. `src/prompts/` — three markdown files, plus one paragraph

Prompts are **data**, not code. Nothing carries them into a build unless something copies them, so
`npm run build` does (`rm -rf dist && tsc && cp -r src/prompts dist/prompts`).

```
src/prompts/sop/{trade}/rules.md    what a publishable price list must contain   (review stage)
src/prompts/extraction.{trade}.md   how to read that list into the vocabulary    (extraction stage)
src/prompts/chat/{trade}.md         the customer-chat agent's briefing
```

Register all three in `src/prompts.ts` — `tradeRules`, `tradeChat`, `tradeExtraction`, each a
`Record<Trade, string>`, so the compiler asks. The fourth piece is `TRADE_GUIDANCE` in
`src/client/askAbout.ts`; see §10.

**Budgets are checked at boot, not on next month's bill.** `assertPromptBudgets()` runs over every
trade and throws if any is over:

```ts
export const PROMPT_TOKEN_BUDGET = { review: 8000, extraction: 4000, transcribe: 1500 } as const;
```

Fencing's review prompt sits at ~7,266 tokens and tiling's at ~7,481. A trade whose SOP is much
bigger fails CI rather than turning up on a bill.

See **[SOP-TEMPLATE.md](SOP-TEMPLATE.md)** for what `rules.md` has to contain and why.

---

## 4. `src/schemas.ts` — the extraction schema

One zod schema per trade, registered in `TRADE_EXTRACTION: Record<Trade, z.ZodType<AnyExtraction>>`.

Non-negotiables that apply here (`CLAUDE.md` §7):

1. Strict `json_schema`, never `json_object`.
2. **Every extracted number carries its exact source sentence.** A code step string-matches it
   against the raw text and drops the field if it does not match.
3. Every enum comes from `vocab.ts`. Never re-typed here.
4. There is always an `unmapped` outlet. The model is never forced to guess or silently drop.

---

## 5. `src/verify/{trade}.ts` — the gate

The largest piece of work, and deliberately not shared. `verify/index.ts` says why:

> *A union rather than a common interface, because the shapes genuinely differ and pretending
> otherwise is how a tiling rate ends up being read as a fencing one.*

Write `verify{Trade}()` and add it to the switch in `verify/index.ts`. The switch is exhaustive, so
**a trade in `TRADES` with no verifier is a compile error, not a submission that reaches a customer
half-checked.**

Three gates, all from `verify/shared.ts`:

1. **Vocabulary** — re-checked here even though the schema enforced it. The redundancy is
   deliberate: every other failure is loud, vocabulary drift is silent. It also reports gracefully —
   *"we could not file a rate under that"* — rather than throwing.
2. **Quote verification** — the number's source sentence must appear in the raw text.
3. **Plausibility bounds** — a source sentence can be real and the number still wrong.

Export the trade's `…VerifiedPricing` shape and add it to the `AnyVerifiedPricing` union. Give it a
field **no other trade has**, because the narrowing keys on that rather than on a stored `trade`
field:

```ts
export const isFencingPricing = (p) => Array.isArray(p.enabledMaterials);
export const isTilingPricing  = (p) => Array.isArray(p.enabledJobTypes);
```

`status` comes out as `verified` or `unverified` here. **Never `confirmed` — the pipeline never sets
`confirmedAt`.** See §11.

---

## 6. `src/client/fieldSpec.ts` — the customer's questions

`TRADE_FIELDS: Record<Trade, FieldSpec[]>`. The array **order is the order the questions are asked.**

A minimal field:

```ts
{
  key: 'finish',
  type: 'enum',
  title: 'Finish',                  // the brief panel
  question: KITCHEN_QUESTIONS.finish,
  source: 'core.finishes',          // dotted path into the published trade schema
  labelGroup: 'finishes',
  pageSize: 3,
}
```

Worth knowing before you write eight of them:

- `pinned` — a "none of this" answer that is always on screen.
- `fillWhenSingle` — one published option is not a question, so fill it in. **Opt-in**, because a
  field with a pinned "none" still needs asking when there is one real choice.
- `optionsKeyedBy` — this field's options are a map keyed by another field's answer. Fencing heights
  differ by material, so there is no list at all until the material is known.
- `measureIn: 'm2' | 'm'` — the customer may answer in another unit and it is converted **in code**
  (`measureFrom`), never by the model. This is the one carve-out to "the model never does
  arithmetic", and only because the result is read back — *"Area: 12m². All correct?"* — before
  anything is quoted from it. **A range is still refused:** the midpoint and both ends are three
  different inventions.
- `recap` — how the answer reads in the one-line recap, or `false` to keep it out. A label that is
  right on a chip can be wrong in a sentence: *"Yes, take it away"* belongs on a chip and never after
  the words *"removing the old"*.
- `namedBy` / `aliases` — how a customer says which answer is wrong. `aliases` gets typo tolerance
  (`"lenght"` was the one that sent somebody back to an unchanged recap with no way forward), so only
  unmistakable words belong there.
- `acceptsExtras` — a value one business offers that has no slug in the vocabulary is deliberately
  absent from the choice list, but still recognised when a customer names it by hand.
- `docHints` — how an attached PDF is read for this field. Absent means never, which is the safe
  default. See §9.

---

## 7. `src/client/pricing/` — the sum, and the labour/material split

**One formula (`total.ts`) for every trade.** What differs is data:

```ts
export const TRADE_PRICING: Record<Trade, PricingSpec> = {
  kitchen: {
    quantityField: 'areaSqm',      // whichever field holds how much of it there is
    unit: 'm2',                    // wording only — but it stops "$85 a metre" on an m² trade
    rateKeys: ['jobType', 'finish'],
    minimumCharge: true,
    headlineField: 'finish',       // must be a field with a labelGroup
    rateSentence: { order: 'other-first', joiner: 'in', lowerOther: true },
  },
};
```

**A trade that measures nothing sets `quantityField: null`**, and the formula runs at a quantity of
one. Kitchen is the case: fitters publish "small $1,950, standard $2,850, large $4,250" and itemise
the rest, so the size is a rate KEY and there is no amount to multiply by. Nothing was added to
`quoteTotal` for it — `(rate + perUnit) x (1 + pct) x qty + fixed` takes a qty of one perfectly well.
Every addition then becomes a `fixedItem` rather than a per-unit extra.

`rateSentence` reads a rate back when nothing matched the brief and the nearest thing a business does
publish is offered instead. The trades want opposite orders: a fence is *"Colorbond at 1.8m"*
(headline first), a tiling job is *"kitchen splashback in Porcelain"* (other first) — because the
room is the job and the tile is the choice within it.

**A trade that prices the same way as an existing one needs no new code here.** One that does not
needs two things and nothing else: its own `pricing/{trade}.ts`, and an arm in `priceAndRank()`
beside `if (schema.trade === 'tiling')`. All the arms produce the same `Quote`, so ranking, the
comparison against a quote the customer already holds, and the results screen stay trade-blind.

### The labour/material split — copy `pricing/tiling.ts`

This is the part to get right when the business sells materials as well as fitting them.

**The customer answers a `supply` field**, asked like any other question
(`"Who's buying the tiles?"` → `labour_only` | `supply_and_install`), and the quote branches on it:

```ts
let tilePerSqm = 0;
if (brief.supply === 'supply_and_install' && pricing.tileSupply.length) {
  const named = pricing.tileSupply.filter((row) => row.tileType && slug(row.tileType) === brief.tileType);
  const from = named.length ? named : pricing.tileSupply;
  tilePerSqm = from.reduce((worst, row) => (row.pricePerSqm > worst.pricePerSqm ? row : worst)).pricePerSqm;
}
```

Four rules that survived contact with real price lists:

1. **The business's own published material price, never a figure from anywhere else.** A price found
   by web search is a market guide shown *beside* a quote, never part of one (`budget.ts`).
2. **When the customer has not chosen, use the DEAREST they publish** — for materials, for removal,
   and for a room whose surface split is unknowable. The one number nobody may be shown is a total
   below what they will actually be charged.
3. **A rate may be per-unit or per-job**, and the unit on the row decides which.
   *"Standard floor tiling $65/m²"* and *"Complete bathroom package $4,850"* are both valid. A
   per-job rate takes its area-based extras as one per-unit figure against a quantity of one, so a
   percentage surcharge loads the whole job rather than skipping the measured parts.
4. **Not every missing thing blocks a quote.** A business that does not waterproof can still lay the
   tiles — the customer is told what is not included rather than hidden from a business that could do
   the rest. A business that cannot take the old tiles up genuinely cannot do the job, and is
   blocked. Decide which of yours is which.

⚠ Also add a `JOB_SURFACES`-style map if customers ask for a **whole job** while businesses price
its **parts**. The first tiling business onboarded published only floor and wall rates, and every
customer asking for a bathroom was told nobody nearby prices that job. The map uses the **dearest**
part, never the cheapest, for rule 2's reason.

---

## 8. `src/client/routeTrade.ts` — ⚠ the words that mean this trade

```ts
export const TRADE_KEYWORDS: Record<Trade, RegExp> = { kitchen: /\b(kitchen|kitchens|…)\b/i };
```

Compiler-enforced that it exists; **not** that it is any good. Two failures to check by hand:

- **Too narrow** and the customer is asked *"fencing or tiling?"* when they said what they wanted in
  their opening sentence.
- **Overlapping another trade** and a message naming both goes to the "which one?" question.

Kitchen is the worked example, because its own noun belongs to another trade half the time: "kitchen
splashback" and "kitchen floor tiles" are TILING jobs, and tiling has published `kitchen_splashback`
as a job type since before kitchen existed. The fix is a negative lookahead on the bare noun —

```ts
kitchen: /\b(?:kitchens?\b(?!\s+(?:splash\s?backs?|floors?|walls?|tiles?|tiling|retile))|cabinetry|cabinets?|bench\s?tops?|…)\b/i
```

— so the specific nouns carry the trade on their own, and "new kitchen and retile the bathroom" still
matches both and is correctly sent to the question. **This was found by a test, not by reading.**

Write a routing test both ways: your trade's sentences reach it, and the other trades' sentences do
not.

---

## 9. `docHints` in `fieldSpec.ts` — ⚠ reading a PDF

Nothing to register: the reader is driven by the trade's `FieldSpec`. A field with `docHints` is read
off an attachment; a field without one never is.

Two shapes:

```ts
docHints: { values: [['labour_only', /\blabour\s+only\b/i], …], none?: RegExp, requires?: RegExp[] }
docHints: { quantity: [[/(\d+)\s*(?:m2|sqm)/i, 'asMetres']], refuse?: RegExp[] }
```

The rules that matter more than the regexes:

- **When in doubt, leave it out.** A field left empty gets asked. A field filled wrongly gets quoted
  at the wrong price, and nobody sees it until the job.
- **A described photo is never a fact.** Photographs of a site are described so the conversation can
  acknowledge them, and `splitDocuments` skips those blocks so no regex ever reads one. A description
  is text the *model* wrote; read as a document fact it would arrive on the brief wearing the clothes
  of a figure off the customer's own quote, with the one check that might have caught it switched
  off.
- **New versus old is where this goes wrong.** *"Remove existing porcelain and lay ceramic"* must
  return `ceramic`, not `porcelain`. Tiling does it with a clause boundary, not a character distance
  — an earlier attempt using 25 characters failed because `existing` sits 23 characters from
  `porcelain`.
- **Order the patterns so the qualified statement wins.** Tiling puts `labour_only` first because
  *"supply and lay the client's own tiles"* contains the standard phrase for the other answer, and
  reading it the other way adds a material price to a quote that was only ever for fitting.

---

## 10. `src/client/askAbout.ts` — ⚠ `TRADE_GUIDANCE`

A paragraph on what a customer's question about **this trade** actually turns on. Compiler-enforced
that it exists; not that it says anything useful.

Fencing's is about the *place* — a farmer asking about treated pine has told you more in the word
"farmhouse" than in the two types they named, and answering only the named half is how this used to
give farm advice about pool fencing. Tiling's is about what the *room* does to a tile: slip rating,
water absorption and size are what usually decide it, and a customer who has not heard of them will
not ask.

The generic half of that prompt is shared and needs nothing per trade — including `WHERE THEY ARE`,
which makes an answer name the customer's suburb when **they** raised it, and the `sources` rules
that keep a guide figure to one option so it can be compared against real quotes.

---

## 11. Firestore — nothing to create

```
businesses/{uid}/services/{trade}/description/raw            what they wrote
businesses/{uid}/services/{trade}/description/lastaireview   the review the panel opens on
businesses/{uid}/services/{trade}/jsondata/extracted         status + pricing + capabilities
schema/{trade}                                               published vocabulary the chat reads
```

`seedTradeSchemas()` publishes `schema/{trade}` at boot from `TRADE_VOCAB`, so the customer side
always has a document to read **even for a trade no business has onboarded into yet.**

**`listPublishedTrades()` is what the customer sees.** A trade the code can serve but nobody has
onboarded into is never offered — offering it would match nobody.

### The status lifecycle — check this first, every time

```
pending  ──►  verified   ──►  confirmed
   ▲             ▲                ▲
frontend    the pipeline     THE BUSINESS, on their own screen
```

The matcher accepts **`confirmed` and nothing else** (`client/matcher.ts`):

```ts
if (extract.status !== 'confirmed') { dropped.notConfirmed += 1; continue; }
```

So a trade can be perfectly onboarded, approved, with every rate stored, and still return *"there
are businesses around you, but none of them have confirmed their pricing yet"* — because nobody
pressed **Confirm — go live** on the business side. That is `CLAUDE.md` non-negotiable #3 working,
not a bug.

To see it rather than guess, with `STORE=firestore` in `app/.env`:

```ts
// npx tsx this from app/. Two things it is easy to get wrong, both verified by running it:
//  - `initialize()` is what swaps the in-memory repo for Firestore. Without it every read comes
//    back empty and reads as "no businesses have onboarded", which is a different bug entirely.
//  - no top-level await: tsx compiles a standalone script as CJS and rejects it.
import { initialize } from './src/server.js';
import { getRepository } from './src/store.js';

const run = async () => {
  initialize();
  const repo = getRepository();
  for (const c of await repo.findCandidates('kitchen')) {
    const extract = await repo.getServiceExtract(c.uid, 'kitchen');
    console.log(c.businessName, '|', extract?.status, '|', extract?.pricing?.serviceArea?.resolved?.suburb);
  }
};
run().then(() => process.exit(0));
```

```
AMDY     | undefined | undefined      <- no document for this trade at all
Saadiii  | confirmed | Pakenham       <- quotable
```

`matchBusinesses()` also returns `diagnostics` — `{ candidates, errored, notConfirmed, noCoords,
outsideRadius, excluded }` — which names the drop reason without any of this.

---

## 12. Tests — where the real safety is

| | |
|---|---|
| `tests/golden/conversations.ts` | add a `KITCHEN_CONVERSATIONS` array and include it in the loop in `golden.test.ts`; whole responses snapshotted, one file per conversation |
| ⚠ `src/ai.ts` — `MockAiClient` | **a `review{Trade}` and an `extraction{Trade}`, plus the arm that picks them.** Without these the offline stand-in answers a kitchen call in fencing's shape and `call.schema.parse` throws — so there is no business-side test of the new trade at all, and nothing says so |
| ⚠ `tests/golden/business.test.ts` | a fixture in `tests/fixtures/`, a row in `SUBMISSIONS`, and a count in `FIXTURES_PER_TRADE`. **This is the only net over submission → review → extraction → verification**, and kitchen shipped without it |
| `tests/unit/publishedSchema.test.ts` | the published schema and `vocab.ts` agree |
| `tests/unit/verify.test.ts` | feed an **invented** vocabulary value on purpose and watch it be refused gracefully rather than throwing |
| `tests/unit/attachmentFacts.test.ts` | every `docHints` regex, including what it must **not** match |
| `tests/unit/routing.test.ts` | the keywords, both ways |
| `tests/unit/conversationMemory.test.ts` | history never becomes an answer |

**Read the golden diff, do not just accept it.** The snapshots are meant to be reviewed in the same
way code is. Adding a trade should add files and change nothing in the existing ones — a deletion in
fencing's or tiling's snapshot is exactly what this net exists to catch.

And read the new snapshot itself, line by line, against the source document. Kitchen's first run
came back green with two wrong figures in it: the site measure fee carried the minimum charge's
price, because the fixture put both on one line and the mock took the line's first `$`; and "drawer
adjustment $45 each" had been filed as an *installation rate*, which would have quoted a whole
kitchen at $45 for any customer whose size found no other row. Both passed every assertion. The only
thing that caught them was a person reading the file.

---

## 13. `retell/agent.json` — ⚠ `boosted_keywords`

The voice flow carries no trade content, so a new trade needs no node, no edge and no prompt there.
The one exception is `boosted_keywords`, the speech recogniser's vocabulary: without it `benchtop`,
`cabinetry` and `kickboard` come back as something else entirely, and the backend then reads a word
the customer never said.

Append the trade's own words as a block after the last one, and do not repeat a word an earlier
trade already contributed (`splashback` and `laundry` belong to tiling and serve kitchen unchanged).
Nothing else in `retell/` changes. See [`retell/README.md`](../retell/README.md).

---

## The checklist, short

```
□  0  decide the shape    unit, rate keys, and does the business sell materials
□  1  vocab.ts            closed lists, TRADES, TRADE_VOCAB
□  2  messages.ts         CUSTOMER_CORE, CUSTOMER_LABELS, TRADE_LABELS, TRADE_QUESTIONS,
                          TRADE_WORDS, NO_MATCH_MESSAGES, WHAT_TO_SEND
□  3  prompts/            sop/{trade}/rules.md, extraction.{trade}.md, chat/{trade}.md → prompts.ts
□  4  schemas.ts          TRADE_EXTRACTION — every number carrying its source sentence
□  5  verify/{trade}.ts   three gates + the switch in verify/index.ts
□  6  fieldSpec.ts        TRADE_FIELDS — the order is the order the questions are asked
□  7  pricing/spec.ts     TRADE_PRICING  (+ pricing/{trade}.ts only if the sum genuinely differs)
⚠  8  routeTrade.ts       TRADE_KEYWORDS — check the overlap by hand
⚠  9  fieldSpec docHints  how a PDF is read. When in doubt, leave it out
⚠ 10  askAbout.ts         TRADE_GUIDANCE
□ 11  Firestore           nothing to create; check `confirmed`, not `verified`
□ 12  tests               customer goldens, published schema, verify, docHints, routing
⚠ 12a ai.ts MockAiClient  review{Trade} + extraction{Trade} + the arm that picks them
⚠ 12b business.test.ts    a fixture, a SUBMISSIONS row, a FIXTURES_PER_TRADE count — then READ it
⚠ 13  retell/agent.json   boosted_keywords, appended as their own block
```

`□` the compiler will ask for. `⚠` it will not.
