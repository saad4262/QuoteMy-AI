import { describe, expect, it } from 'vitest';
import { verifyExtraction, isKitchenPricing, type KitchenVerifiedResult } from '../../src/verify/index.js';
import type { KitchenExtraction } from '../../src/schemas.js';

/**
 * Kitchen's verifier, driven against Beky Kitchens' own words.
 *
 * The text below is quoted from `SOPS/kitchen.pdf`, and that matters more here than it looks: gate
 * 2 string-matches every number against what the business actually wrote, so a fixture written in
 * tidied-up prose would pass tests that a real submission fails. Every `sourceQuote` in these
 * fixtures appears in `TEXT` character for character, because that is the only way this file is
 * testing the thing it claims to test.
 */

const TEXT = [
  'Beky Kitchens is a kitchen construction and installation business based in Pakenham, Victoria 3810,',
  'servicing customers primarily within a 30 km radius.',
  'Minimum installation charge: $450',
  'Site measure and consultation: $120',
  'Travel fee outside standard service area: $85',
  'Small Kitchen Installation Price: $1,950',
  'Medium Kitchen Installation Price: $2,850',
  'Large Kitchen Installation Price: $4,250',
  'Base Cabinet Installation Price: $180 each',
  'Standard Custom Kitchen Cabinet Package: $8,950',
  'Full Kitchen Demolition Price: $1,650',
  'Kitchen Cabinet Removal Price: $950',
  'Laminate Benchtop Installation Price: $850',
  'Stone Benchtop Installation Price: $1,250',
  'Minor Wall Preparation Price: $350',
  'Standard Island Installation Price: $650',
  'Cabinet Handle Installation Price: $35 each',
  'All prices listed below include GST.',
  'Beky Kitchens then charges for installation and any agreed preparation work.',
].join('\n');

const base: KitchenExtraction = {
  businessName: 'Beky Kitchens',
  gstIncluded: true,
  gstSourceQuote: 'All prices listed below include GST.',
  serviceArea: {
    baseLocation: 'Pakenham',
    radiusKm: 30,
    radiusSourceQuote: 'servicing customers primarily within a 30 km radius.',
    excludedAreas: [],
  },
  minimumCharge: 450,
  minimumChargeSourceQuote: 'Minimum installation charge: $450',
  siteMeasureFee: 120,
  siteMeasureFeeSourceQuote: 'Site measure and consultation: $120',
  travelFee: 85,
  travelFeeSourceQuote: 'Travel fee outside standard service area: $85',
  rates: [
    { jobType: null, size: 'small', label: null, price: 1950, unit: 'per_job', sourceQuote: 'Small Kitchen Installation Price: $1,950' },
    { jobType: null, size: 'standard', label: null, price: 2850, unit: 'per_job', sourceQuote: 'Medium Kitchen Installation Price: $2,850' },
    { jobType: null, size: 'large', label: null, price: 4250, unit: 'per_job', sourceQuote: 'Large Kitchen Installation Price: $4,250' },
    { jobType: null, size: null, label: 'Base cabinet installation', price: 180, unit: 'per_item', sourceQuote: 'Base Cabinet Installation Price: $180 each' },
  ],
  cabinetSupply: [
    { label: 'Standard Custom Kitchen Cabinet Package', price: 8950, unit: 'per_job', sourceQuote: 'Standard Custom Kitchen Cabinet Package: $8,950' },
  ],
  supplyModels: ['supply_and_install', 'labour_only'],
  benchtops: [
    { material: 'laminate', price: 850, sourceQuote: 'Laminate Benchtop Installation Price: $850' },
    { material: 'stone', price: 1250, sourceQuote: 'Stone Benchtop Installation Price: $1,250' },
  ],
  removals: [
    { removes: 'full_demolition', price: 1650, sourceQuote: 'Full Kitchen Demolition Price: $1,650' },
    { removes: 'cabinets_only', price: 950, sourceQuote: 'Kitchen Cabinet Removal Price: $950' },
  ],
  prep: [{ type: 'wall_prep', price: 350, unit: 'per_job', sourceQuote: 'Minor Wall Preparation Price: $350' }],
  extras: [
    { type: 'island', label: 'Standard island installation', price: 650, unit: 'per_item', isFromPrice: false, sourceQuote: 'Standard Island Installation Price: $650' },
    { type: null, label: 'Cabinet handle installation', price: 35, unit: 'per_item', isFromPrice: false, sourceQuote: 'Cabinet Handle Installation Price: $35 each' },
  ],
  warranty: { text: null, sourceQuote: null },
  inclusions: [],
  exclusions: [],
  tags: [],
  otherOfferings: [],
  couldNotUse: [],
};

const run = (over: Partial<KitchenExtraction> = {}): KitchenVerifiedResult =>
  verifyExtraction({ ...base, ...over }, TEXT, 'kitchen') as KitchenVerifiedResult;

describe('a complete kitchen submission', () => {
  it('is verified, and keeps every rate that carried its own sentence', () => {
    const result = run();
    expect(result.status).toBe('verified');
    expect(result.ratesKept).toBe(4);
    expect(result.couldNotUse).toEqual([]);
  });

  it('narrows to kitchen on a field no other trade has', () => {
    const { pricing } = run();
    expect(isKitchenPricing(pricing)).toBe(true);
    expect(pricing.enabledKitchenSizes.sort()).toEqual(['large', 'small', 'standard']);
  });

  /**
   * A fitter who publishes one installation price quotes every customer. Listing only the sizes
   * that were NAMED would hide them from all three, which is the opposite of what this field is
   * for - so a general rate enables the lot.
   */
  it('a single unsized rate still enables every size', () => {
    const { pricing } = run({
      rates: [{ jobType: null, size: null, label: null, price: 2850, unit: 'per_job', sourceQuote: 'Medium Kitchen Installation Price: $2,850' }],
    });
    expect(pricing.enabledKitchenSizes.sort()).toEqual(['large', 'small', 'standard']);
  });

  it('keeps a priced line the vocabulary has no home for, under a null type', () => {
    // A handle is real priced work and is not one of the six closed extras. Null is the answer;
    // forcing it to the nearest value is the drift the whole vocabulary exists to prevent.
    const handle = run().pricing.extras.find((e) => e.label.includes('handle'));
    expect(handle).toBeDefined();
    expect(handle!.type).toBeNull();
    expect(handle!.price).toBe(35);
  });
});

describe('the three gates', () => {
  it('drops a number whose source sentence is nowhere in the text', () => {
    const result = run({
      rates: [
        { jobType: null, size: 'standard', label: null, price: 9999, unit: 'per_job', sourceQuote: 'Standard kitchen installation $9,999' },
      ],
    });
    expect(result.ratesKept).toBe(0);
    expect(result.status).toBe('unverified');
    expect(result.couldNotUse.join(' ')).toContain('could not find that figure');
  });

  it('refuses an invented vocabulary value gracefully rather than filing it under the nearest one', () => {
    const result = run({
      rates: [
        // The schema should make this impossible; the gate exists for when it does not.
        { jobType: null, size: 'enormous' as never, label: null, price: 4250, unit: 'per_job', sourceQuote: 'Large Kitchen Installation Price: $4,250' },
      ],
    });
    expect(result.ratesKept).toBe(0);
    expect(result.couldNotUse.join(' ')).toContain('not a size we hold');
    // Reported, never thrown: the business is told what could not be filed and can fix it.
    expect(result.status).toBe('unverified');
  });

  it('drops a figure outside the bounds', () => {
    const result = run({ minimumCharge: 999_999, minimumChargeSourceQuote: 'Minimum installation charge: $450' });
    expect(result.pricing.minimumCharge).toBeNull();
    expect(result.couldNotUse.join(' ')).toContain('outside the range we accept');
  });
});

describe('the checks that catch a misread page', () => {
  /* A per_job price under $500 is almost certainly a per_item one, and read as a whole kitchen it
     quotes somebody a new kitchen for the price of one cupboard. Flagged, not dropped. */
  it('says so when a whole-kitchen price looks like a single cabinet', () => {
    const result = run({
      rates: [{ jobType: null, size: 'small', label: null, price: 180, unit: 'per_job', sourceQuote: 'Base Cabinet Installation Price: $180 each' }],
    });
    expect(result.ratesKept).toBe(1);
    expect(result.couldNotUse.join(' ')).toContain('low for a full kitchen');
  });

  it('says so when taking a kitchen out costs more than putting one in', () => {
    const result = run({
      rates: [{ jobType: null, size: 'small', label: null, price: 1950, unit: 'per_job', sourceQuote: 'Small Kitchen Installation Price: $1,950' }],
    });
    // Demolition at $1,650 is under $1,950 and is fine; nothing is said.
    expect(result.couldNotUse.join(' ')).not.toContain('more than your cheapest installation');

    const inverted = run({
      rates: [{ jobType: null, size: 'small', label: null, price: 950, unit: 'per_job', sourceQuote: 'Kitchen Cabinet Removal Price: $950' }],
    });
    expect(inverted.couldNotUse.join(' ')).toContain('more than your cheapest installation');
  });

  it('keeps the first of two prices for the same size and says which it kept', () => {
    const result = run({
      rates: [
        { jobType: null, size: 'standard', label: null, price: 2850, unit: 'per_job', sourceQuote: 'Medium Kitchen Installation Price: $2,850' },
        { jobType: null, size: 'standard', label: null, price: 4250, unit: 'per_job', sourceQuote: 'Large Kitchen Installation Price: $4,250' },
      ],
    });
    expect(result.pricing.rates.general).toHaveLength(1);
    expect(result.pricing.rates.general![0]!.price).toBe(2850);
    expect(result.couldNotUse.join(' ')).toContain('tell us which one is right');
  });
});
