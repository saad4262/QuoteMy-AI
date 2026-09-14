import { describe, expect, it } from 'vitest';
import {
  verifyExtraction,
  isDeckingPricing,
  isFencingPricing,
  isKitchenPricing,
  isRetainingWallPricing,
  isTilingPricing,
  type DeckingVerifiedResult,
} from '../../src/verify/index.js';
import type { DeckingExtraction } from '../../src/schemas.js';
import { TRADES, TRADE_VOCAB } from '../../src/vocab.js';
import { TRADE_FIELDS } from '../../src/client/fieldSpec.js';

/**
 * Decking's verifier, driven against Berwick Decks' own words.
 *
 * The text below is quoted from `tests/fixtures/description-COMPLETE-decking.txt`, and that matters
 * more here than it looks: gate 2 string-matches every number against what the business actually
 * wrote, so a fixture written in tidied-up prose would pass tests that a real submission fails.
 */

const TEXT = [
  'Berwick Decks — deck design, supply and installation, Berwick VIC 3806. 20 years.',
  'Based in Berwick, we travel 20km.',
  'Minimum charge $1,200.',
  'Site inspection and measure $150.',
  'Design $450.',
  'Travel outside our standard service area $90.',
  'All prices include GST.',
  'Treated pine $280 per square metre.',
  'Merbau $420 per square metre.',
  'Composite $520 per square metre.',
  'Merbau $540 per square metre.',
  'Timber balustrade $220 per linear metre.',
  'Glass balustrade $520 per linear metre.',
  'Standard timber flight up to 5 steps $950.',
  'Each additional step above five $140.',
  'Timber batten screen $340 per square metre.',
  'Timber deck removal $85 per square metre.',
  'Restricted access surcharge $450.',
  'Rock excavation $180 per hour.',
  'We arrange engineering from $890 and the building permit application from $650.',
  'Ten year workmanship warranty on our own work.',
].join('\n');

const base: DeckingExtraction = {
  businessName: 'Berwick Decks',
  gstIncluded: true,
  gstSourceQuote: 'All prices include GST.',
  serviceArea: {
    baseLocation: 'Berwick',
    radiusKm: 20,
    radiusSourceQuote: 'Based in Berwick, we travel 20km.',
    excludedAreas: [],
  },
  minimumCharge: 1200,
  minimumChargeSourceQuote: 'Minimum charge $1,200.',
  siteInspectionFee: 150,
  siteInspectionFeeSourceQuote: 'Site inspection and measure $150.',
  designFee: 450,
  designFeeSourceQuote: 'Design $450.',
  travelFee: 90,
  travelFeeSourceQuote: 'Travel outside our standard service area $90.',
  rates: [
    { deckHeight: 'ground_level', material: 'treated_pine', pricePerSqm: 280, sourceQuote: 'Treated pine $280 per square metre.' },
    { deckHeight: 'ground_level', material: 'merbau', pricePerSqm: 420, sourceQuote: 'Merbau $420 per square metre.' },
    { deckHeight: 'ground_level', material: 'composite', pricePerSqm: 520, sourceQuote: 'Composite $520 per square metre.' },
    { deckHeight: 'elevated', material: 'merbau', pricePerSqm: 540, sourceQuote: 'Merbau $540 per square metre.' },
  ],
  balustrades: [
    { type: 'timber', price: 220, unit: 'per_metre', sourceQuote: 'Timber balustrade $220 per linear metre.' },
    { type: 'glass', price: 520, unit: 'per_metre', sourceQuote: 'Glass balustrade $520 per linear metre.' },
  ],
  stairs: [
    { grade: 'timber', label: 'Standard timber flight up to 5 steps', price: 950, unit: 'per_job', sourceQuote: 'Standard timber flight up to 5 steps $950.' },
    { grade: null, label: 'Each additional step above five', price: 140, unit: 'per_item', sourceQuote: 'Each additional step above five $140.' },
  ],
  screens: [{ type: 'timber_batten', price: 340, unit: 'per_sqm', sourceQuote: 'Timber batten screen $340 per square metre.' }],
  removals: [{ removes: 'timber_deck', price: 85, unit: 'per_sqm', sourceQuote: 'Timber deck removal $85 per square metre.' }],
  siteConditions: [
    { condition: 'restricted_access', price: 450, percent: null, unit: 'per_job', sourceQuote: 'Restricted access surcharge $450.' },
    { condition: 'rock', price: 180, percent: null, unit: 'per_hour', sourceQuote: 'Rock excavation $180 per hour.' },
  ],
  engineering: {
    text: 'We arrange engineering from $890 and the building permit application from $650.',
    price: 890,
    isFromPrice: true,
    sourceQuote: 'We arrange engineering from $890 and the building permit application from $650.',
  },
  extras: [],
  warranty: { text: 'Ten year workmanship warranty on our own work.', sourceQuote: 'Ten year workmanship warranty on our own work.' },
  inclusions: [],
  exclusions: [],
  tags: [],
  otherOfferings: [],
  couldNotUse: [],
};

const run = (x: DeckingExtraction) => verifyExtraction(x, TEXT, 'decking') as DeckingVerifiedResult;

describe('the decking verifier', () => {
  it('files every rate under the height it was written for', () => {
    const { pricing, ratesKept, status } = run(base);

    expect(status).toBe('verified');
    expect(ratesKept).toBe(4);
    /* The same board at two heights, kept apart. Collapsing these loses $120 a square metre, which
       on a 25m2 deck is $3,000 - and the posts and bracing that justify it. */
    expect(pricing.rates['ground_level']).toContainEqual({ material: 'merbau', pricePerSqm: 420 });
    expect(pricing.rates['elevated']).toContainEqual({ material: 'merbau', pricePerSqm: 540 });
    expect(pricing.enabledDeckHeights).toEqual(['ground_level', 'elevated']);
  });

  it('refuses a rate whose height was never stated, rather than guessing one', () => {
    /* The gate this trade has and no other: height is not a finish, it is what is under the deck.
       Picking either end invents most of the structure. */
    const { ratesKept, couldNotUse } = run({
      ...base,
      rates: [{ ...base.rates[0]!, deckHeight: 'unstated' as never }],
    });

    expect(ratesKept).toBe(0);
    expect(couldNotUse.join(' ')).toContain('could not tell what deck height');
  });

  it('refuses an invented board gracefully rather than throwing', () => {
    const { ratesKept, status, couldNotUse } = run({
      ...base,
      rates: [{ ...base.rates[0]!, material: 'bambooDecking' as never }],
    });

    expect(ratesKept).toBe(0);
    expect(status).toBe('unverified');
    expect(couldNotUse.join(' ')).toContain('not a decking board we hold');
  });

  it('drops a rate whose source sentence is not in the text', () => {
    const { ratesKept, couldNotUse } = run({
      ...base,
      rates: [{ ...base.rates[0]!, pricePerSqm: 999, sourceQuote: 'Treated pine $999 per square metre.' }],
    });

    expect(ratesKept).toBe(0);
    expect(couldNotUse.join(' ')).toContain('could not find that figure in your description');
  });

  it('flags a rate that looks like a board price rather than a built deck', () => {
    /* $48 of boards and $280 of finished deck are the same sentence to a regex and the whole job to
       a customer. Flagged and not dropped - a cheap ground-level pine deck is a real thing. */
    const { ratesKept, couldNotUse } = run({
      ...base,
      rates: [{ ...base.rates[0]!, pricePerSqm: 48, sourceQuote: 'Treated pine $280 per square metre.' }],
    });

    expect(ratesKept).toBe(1);
    expect(couldNotUse.join(' ')).toContain('nearer a board price than a built deck');
  });

  it('flags a deck that costs less the further off the ground it is', () => {
    const { ratesKept, couldNotUse } = run({
      ...base,
      rates: [
        { deckHeight: 'ground_level', material: 'merbau', pricePerSqm: 540, sourceQuote: 'Merbau $540 per square metre.' },
        { deckHeight: 'elevated', material: 'merbau', pricePerSqm: 420, sourceQuote: 'Merbau $420 per square metre.' },
      ],
    });

    // Flagged, not dropped - a builder may be clearing stock, and that is theirs to decide.
    expect(ratesKept).toBe(2);
    expect(couldNotUse.join(' ')).toContain('the higher deck costs less');
  });

  it('refuses a balustrade priced by the square metre, and says why', () => {
    /* The trap this trade sets and no other can. A balustrade runs along the deck's EDGE; priced by
       area it is charged against the floor behind it, which on a 40m2 deck is several times the
       railing that exists. */
    const { pricing, couldNotUse } = run({
      ...base,
      balustrades: [{ type: 'timber', price: 180, unit: 'per_sqm' as never, sourceQuote: 'Timber balustrade $220 per linear metre.' }],
    });

    expect(pricing.balustrades).toHaveLength(0);
    expect(couldNotUse.join(' ')).toContain('priced per LINEAR metre along the deck edge');
  });

  it('keeps a per-step stair row without letting it pass as a flight', () => {
    const { pricing } = run(base);

    expect(pricing.stairs).toContainEqual({ grade: 'timber', label: 'Standard timber flight up to 5 steps', price: 950, unit: 'per_job' });
    /* Stored, shown, and never quotable: "each additional step" is an add-on to a flight, and a
       reader that treats it as one quotes a whole staircase at $140. `pricingDecking.test.ts`
       asserts the other half of that. */
    expect(pricing.stairs).toContainEqual({ grade: null, label: 'Each additional step above five', price: 140, unit: 'per_item' });
  });

  it('keeps an hourly site charge without letting it near a rate', () => {
    const { pricing } = run(base);

    expect(pricing.siteConditions).toContainEqual({ condition: 'rock', price: 180, percent: null, unit: 'per_hour' });
    expect(Object.values(pricing.rates).flat()).toHaveLength(4);
  });

  it('is never mistaken for another trade when read back out of Firestore', () => {
    /* The discriminant, and the reason this list is `enabledDeckMaterials` and not
       `enabledMaterials`: a deck is built of timber exactly as a fence is, so fencing's name was the
       obvious one - and every decking document carrying it would have been priced per linear metre
       of fencing. */
    const { pricing } = run(base);

    expect(isDeckingPricing(pricing)).toBe(true);
    expect(isFencingPricing(pricing)).toBe(false);
    expect(isTilingPricing(pricing)).toBe(false);
    expect(isKitchenPricing(pricing)).toBe(false);
    expect(isRetainingWallPricing(pricing)).toBe(false);
  });

  it('marks a submission with no surviving rate unverified rather than verified', () => {
    const { status, couldNotUse } = run({ ...base, rates: [] });

    expect(status).toBe('unverified');
    expect(couldNotUse.join(' ')).toContain('No usable rates could be read');
  });
});

/**
 * The collision that cost a golden conversation, generalised.
 *
 * `NOTHING` in `fuzzyMatch.ts` reads "none", "nothing", "flat", "easy", "clear" - and "standard" -
 * as an explicit no. In the `enum` branch of `mergeAndDecide` that check runs BEFORE the vocabulary
 * lookup and only when the field has a pinned "there is none of this" answer. So a value that
 * collides resolves to the pinned one and the question asks itself for ever, with nothing anywhere
 * reporting a fault.
 *
 * Decking's stair grades were `standard` and `premium` until exactly that happened. They are
 * `timber` and `hardwood` now, which is the builder's own wording anyway.
 *
 * Worth knowing and deliberately NOT failed here: `KITCHEN_SIZES` also contains `standard`. It is
 * safe only because `kitchenSize` has no pinned answer - the day one is added, every kitchen
 * customer answering "standard" would be told they have no kitchen.
 */
describe('no PINNED field may offer a value that reads as an explicit "no"', () => {
  const NOTHING_WORDS = ['none', 'no', 'nope', 'nil', 'n/a', 'na', 'nothing', 'all good', 'flat', 'easy', 'clear', 'standard'];

  it('holds for every pinned field in every trade', () => {
    const collisions: string[] = [];
    for (const trade of TRADES) {
      for (const field of TRADE_FIELDS[trade]) {
        if (!field.pinned || !field.source?.startsWith('core.')) continue;
        const group = field.source.slice('core.'.length);
        for (const value of TRADE_VOCAB[trade].core[group] ?? []) {
          if (NOTHING_WORDS.includes(value.toLowerCase())) collisions.push(`${trade}.${field.key} offers "${value}"`);
        }
      }
    }
    expect(collisions).toEqual([]);
  });
});
