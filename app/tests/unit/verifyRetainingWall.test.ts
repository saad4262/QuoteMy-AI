import { describe, expect, it } from 'vitest';
import {
  verifyExtraction,
  isFencingPricing,
  isKitchenPricing,
  isRetainingWallPricing,
  isTilingPricing,
  type RetainingWallVerifiedResult,
} from '../../src/verify/index.js';
import type { RetainingWallExtraction } from '../../src/schemas.js';

/**
 * Retaining wall's verifier, driven against Berwick Retaining Wall's own words.
 *
 * The text below is quoted from `SOPS/Retaining-wall.pdf`, and that matters more here than it looks:
 * gate 2 string-matches every number against what the business actually wrote, so a fixture written
 * in tidied-up prose would pass tests that a real submission fails. Every `sourceQuote` in these
 * fixtures appears in `TEXT` character for character, because that is the only way this file is
 * testing the thing it claims to test.
 */

const TEXT = [
  'Berwick Retaining Wall specialises in the construction and installation of retaining walls for residential',
  'and small commercial properties.',
  'Standard service radius: 30 km',
  'Minimum installation charge: $650',
  'Site inspection and measure: $150',
  'Travel outside standard service area: $95',
  'Timber Sleeper Installation Price: $145 per linear metre',
  'Concrete Sleeper Installation Price: $185 per linear metre',
  'Steel Post Retaining Wall Installation Price: $195 per linear metre',
  'Timber Retaining Wall Supply + Installation Price: $285 per linear metre',
  'Concrete Sleeper Supply + Installation Price: $395 per linear metre',
  'Tiered Wall Construction Price: $450 per linear metre',
  'Ag-Pipe Installation Price: $55 per linear metre',
  'Complete Standard Drainage Package Price: $650',
  'Timber Retaining Wall Removal Price: $85 per linear metre',
  'Concrete Sleeper Wall Removal Price: $125 per linear metre',
  'Steel Post Removal Price: $95 per post',
  'Manual Excavation Price: $95 per hour',
  'Standard Post-Hole Excavation Price: $75 per post',
  'Restricted Access Surcharge Price: $450',
  'Engineering and approval costs are excluded unless specifically included in the quotation.',
  'All prices include GST.',
].join('\n');

const base: RetainingWallExtraction = {
  businessName: 'Berwick Retaining Wall',
  gstIncluded: true,
  gstSourceQuote: 'All prices include GST.',
  serviceArea: {
    baseLocation: 'Berwick',
    radiusKm: 30,
    radiusSourceQuote: 'Standard service radius: 30 km',
    excludedAreas: [],
  },
  minimumCharge: 650,
  minimumChargeSourceQuote: 'Minimum installation charge: $650',
  siteInspectionFee: 150,
  siteInspectionFeeSourceQuote: 'Site inspection and measure: $150',
  travelFee: 95,
  travelFeeSourceQuote: 'Travel outside standard service area: $95',
  rates: [
    { wallType: 'timber_sleeper', supply: 'labour_only', heightM: null, pricePerMetre: 145, sourceQuote: 'Timber Sleeper Installation Price: $145 per linear metre' },
    { wallType: 'concrete_sleeper', supply: 'labour_only', heightM: null, pricePerMetre: 185, sourceQuote: 'Concrete Sleeper Installation Price: $185 per linear metre' },
    { wallType: 'steel_post', supply: 'labour_only', heightM: null, pricePerMetre: 195, sourceQuote: 'Steel Post Retaining Wall Installation Price: $195 per linear metre' },
    { wallType: 'timber_sleeper', supply: 'supply_and_install', heightM: null, pricePerMetre: 285, sourceQuote: 'Timber Retaining Wall Supply + Installation Price: $285 per linear metre' },
    { wallType: 'concrete_sleeper', supply: 'supply_and_install', heightM: null, pricePerMetre: 395, sourceQuote: 'Concrete Sleeper Supply + Installation Price: $395 per linear metre' },
    { wallType: 'tiered', supply: 'supply_and_install', heightM: null, pricePerMetre: 450, sourceQuote: 'Tiered Wall Construction Price: $450 per linear metre' },
  ],
  supplyModels: ['supply_and_install', 'labour_only'],
  drainage: [
    { type: 'ag_pipe', price: 55, unit: 'per_metre', sourceQuote: 'Ag-Pipe Installation Price: $55 per linear metre' },
    { type: 'full_package', price: 650, unit: 'per_job', sourceQuote: 'Complete Standard Drainage Package Price: $650' },
  ],
  removals: [
    { removes: 'timber_wall', price: 85, unit: 'per_metre', sourceQuote: 'Timber Retaining Wall Removal Price: $85 per linear metre' },
    { removes: 'concrete_sleeper_wall', price: 125, unit: 'per_metre', sourceQuote: 'Concrete Sleeper Wall Removal Price: $125 per linear metre' },
    { removes: 'steel_post', price: 95, unit: 'per_item', sourceQuote: 'Steel Post Removal Price: $95 per post' },
  ],
  groundworks: [
    { type: 'excavation', price: 95, unit: 'per_hour', sourceQuote: 'Manual Excavation Price: $95 per hour' },
    { type: 'post_holes', price: 75, unit: 'per_item', sourceQuote: 'Standard Post-Hole Excavation Price: $75 per post' },
  ],
  siteConditions: [
    { condition: 'restricted_access', price: 450, percent: null, unit: 'per_job', sourceQuote: 'Restricted Access Surcharge Price: $450' },
  ],
  engineering: {
    text: 'Engineering and approval costs are excluded unless specifically included in the quotation.',
    price: null,
    isFromPrice: false,
    sourceQuote: 'Engineering and approval costs are excluded unless specifically included in the quotation.',
  },
  extras: [],
  warranty: { text: null, sourceQuote: null },
  inclusions: [],
  exclusions: [],
  tags: [],
  otherOfferings: [],
  couldNotUse: [],
};

const run = (x: RetainingWallExtraction) =>
  verifyExtraction(x, TEXT, 'retaining_wall') as RetainingWallVerifiedResult;

describe('the retaining wall verifier', () => {
  it('files every rate under the supply model it was written for', () => {
    const { pricing, ratesKept, status } = run(base);

    expect(status).toBe('verified');
    expect(ratesKept).toBe(6);
    /* The same wall under both models, at both prices. This is the assertion the whole trade turns
       on: collapsing these into one rate loses $140 a metre, and keeping only the last one read
       loses it in whichever direction the document happened to be written. */
    expect(pricing.rates['labour_only']).toContainEqual({ wallType: 'timber_sleeper', heightBand: null, pricePerMetre: 145 });
    expect(pricing.rates['supply_and_install']).toContainEqual({ wallType: 'timber_sleeper', heightBand: null, pricePerMetre: 285 });
    expect(pricing.supplyModels).toEqual(['supply_and_install', 'labour_only']);
  });

  it('builds the height band from the number, so the key cannot drift', () => {
    const { pricing } = run({
      ...base,
      rates: [{ ...base.rates[0]!, heightM: 0.9 }],
    });

    expect(pricing.rates['labour_only']).toEqual([{ wallType: 'timber_sleeper', heightBand: '0.9m', pricePerMetre: 145 }]);
  });

  it('drops a rate whose source sentence is not in the text', () => {
    const { pricing, ratesKept, couldNotUse } = run({
      ...base,
      rates: [
        base.rates[0]!,
        { wallType: 'concrete_sleeper', supply: 'labour_only', heightM: null, pricePerMetre: 999, sourceQuote: 'Concrete Sleeper Installation Price: $999 per linear metre' },
      ],
    });

    expect(ratesKept).toBe(1);
    expect(pricing.rates['labour_only']).toHaveLength(1);
    expect(couldNotUse.join(' ')).toContain('could not find that figure in your description');
  });

  it('drops a rate whose price is outside the bounds, even with a real sentence', () => {
    const { ratesKept, couldNotUse } = run({
      ...base,
      rates: [{ ...base.rates[0]!, pricePerMetre: 8500 }],
    });

    expect(ratesKept).toBe(0);
    expect(couldNotUse.join(' ')).toContain('outside the range we accept');
  });

  it('refuses an invented wall type gracefully rather than throwing', () => {
    /* Gate 1 exists to catch a value the schema should have made impossible, and to REPORT it
       rather than fail the submission - the same thing `verify.test.ts` checks for fencing. */
    const { ratesKept, couldNotUse, status } = run({
      ...base,
      rates: [{ ...base.rates[0]!, wallType: 'gabionBasket' as never }],
    });

    expect(ratesKept).toBe(0);
    expect(status).toBe('unverified');
    expect(couldNotUse.join(' ')).toContain('not a wall system we hold');
  });

  it('refuses a rate whose supply model is not one of the two, and says why', () => {
    const { ratesKept, couldNotUse } = run({
      ...base,
      rates: [{ ...base.rates[0]!, supply: 'unstated' as never }],
    });

    expect(ratesKept).toBe(0);
    /* Named rather than guessed. Picking either model is worth $140 a metre in one direction or the
       other, and the business is the only one who can say which column the figure came from. */
    expect(couldNotUse.join(' ')).toContain('includes the materials or is installation only');
  });

  it('keeps a rate priced twice at one figure, and reports the disagreement', () => {
    const { ratesKept, pricing, couldNotUse } = run({
      ...base,
      rates: [
        base.rates[0]!,
        { ...base.rates[0]!, pricePerMetre: 185, sourceQuote: 'Concrete Sleeper Installation Price: $185 per linear metre' },
      ],
    });

    expect(ratesKept).toBe(1);
    expect(pricing.rates['labour_only']?.[0]?.pricePerMetre).toBe(145);
    expect(couldNotUse.join(' ')).toContain('tell us which one is right');
  });

  it('flags supplying the materials costing less than not supplying them', () => {
    /* The column check. Swapped headings are the characteristic mis-read of this trade's price
       lists, and they reach a customer as a real quote that is $140 a metre wrong. */
    const { couldNotUse, ratesKept } = run({
      ...base,
      rates: [
        { wallType: 'timber_sleeper', supply: 'labour_only', heightM: null, pricePerMetre: 285, sourceQuote: 'Timber Retaining Wall Supply + Installation Price: $285 per linear metre' },
        { wallType: 'timber_sleeper', supply: 'supply_and_install', heightM: null, pricePerMetre: 145, sourceQuote: 'Timber Sleeper Installation Price: $145 per linear metre' },
      ],
    });

    // Flagged, not dropped - a clearance price is possible and it is not ours to refuse.
    expect(ratesKept).toBe(2);
    expect(couldNotUse.join(' ')).toContain('supplying costs less');
  });

  it('tells a business its claimed supply model produced no usable rate', () => {
    const { pricing, couldNotUse } = run({
      ...base,
      rates: base.rates.filter((r) => r.supply === 'labour_only'),
    });

    expect(pricing.supplyModels).toEqual(['labour_only']);
    expect(couldNotUse.join(' ')).toContain('could not read a supply-and-install rate');
  });

  it('keeps hourly and per-post groundworks without letting them near a rate', () => {
    const { pricing } = run(base);

    expect(pricing.groundworks).toContainEqual({ type: 'excavation', price: 95, unit: 'per_hour' });
    expect(pricing.groundworks).toContainEqual({ type: 'post_holes', price: 75, unit: 'per_item' });
    /* The point of the assertion: none of it reached the quotable rates, because a customer cannot
       supply hours or count posts and the model may never work them out (CLAUDE.md #4). */
    expect(Object.values(pricing.rates).flat()).toHaveLength(6);
  });

  it('is never mistaken for another trade when read back out of Firestore', () => {
    /* The discriminant, and the reason this trade's list is `enabledWallTypes` and not
       `enabledMaterials`: a wall is built of timber or concrete, so the obvious name was fencing's,
       and every retaining wall document carrying it would have been priced per metre of fence. */
    const { pricing } = run(base);

    expect(isRetainingWallPricing(pricing)).toBe(true);
    expect(isFencingPricing(pricing)).toBe(false);
    expect(isTilingPricing(pricing)).toBe(false);
    expect(isKitchenPricing(pricing)).toBe(false);
  });

  it('marks a submission with no surviving rate unverified rather than verified', () => {
    const { status, couldNotUse } = run({ ...base, rates: [] });

    expect(status).toBe('unverified');
    expect(couldNotUse.join(' ')).toContain('No usable rates could be read');
  });
});
