import { describe, expect, it } from 'vitest';
import {
  verifyExtraction,
  isDeckingPricing,
  isFencingPricing,
  isHomeRenovationPricing,
  isKitchenPricing,
  isRetainingWallPricing,
  isTilingPricing,
  type HomeRenovationVerifiedResult,
} from '../../src/verify/index.js';
import type { HomeRenovationExtraction } from '../../src/schemas.js';
import { TRADES, TRADE_VOCAB } from '../../src/vocab.js';
import { TRADE_FIELDS } from '../../src/client/fieldSpec.js';

/**
 * Home renovation's verifier, driven against Berwick Home Renovations' own words.
 *
 * The text below is quoted from `tests/fixtures/description-COMPLETE-renovation.txt`, and that
 * matters more here than it looks: gate 2 string-matches every number against what the business
 * actually wrote, so a fixture written in tidied-up prose would pass tests that a real submission
 * fails.
 */

const TEXT = [
  'Berwick Home Renovations — residential renovation, building and installation, Berwick VIC 3806. 20 years.',
  'Based in Berwick, we travel 30km.',
  'All prices include GST.',
  'Minimum renovation attendance $450.',
  'Site inspection $150.',
  'Design consultation $180.',
  'Travel outside our service area $95.',
  'Bathroom renovation labour $6,850.',
  'Ensuite renovation labour $5,950.',
  'Kitchen renovation labour $4,850.',
  'Hallway renovation labour $1,850.',
  'Bathroom demolition $1,450.',
  'Kitchen demolition $1,650.',
  'Kitchen cabinetry package $8,950.',
  'Bathroom waterproofing $950.',
  'Standard wall plastering $65/m2.',
  'Timber flooring $95/m2.',
  'Internal door installation $280 each.',
  'General carpentry $95 per hour.',
  'Ten year workmanship warranty.',
].join('\n');

const base: HomeRenovationExtraction = {
  businessName: 'Berwick Home Renovations',
  gstIncluded: true,
  gstSourceQuote: 'All prices include GST.',
  serviceArea: {
    baseLocation: 'Berwick VIC 3806',
    radiusKm: 30,
    radiusSourceQuote: 'Based in Berwick, we travel 30km.',
    excludedAreas: [],
  },
  minimumCharge: 450,
  minimumChargeSourceQuote: 'Minimum renovation attendance $450.',
  siteInspectionFee: 150,
  siteInspectionFeeSourceQuote: 'Site inspection $150.',
  consultationFee: 180,
  consultationFeeSourceQuote: 'Design consultation $180.',
  travelFee: 95,
  travelFeeSourceQuote: 'Travel outside our service area $95.',
  rates: [
    { room: 'bathroom', jobType: 'full_renovation', supply: null, price: 6850, unit: 'per_job', sourceQuote: 'Bathroom renovation labour $6,850.' },
    { room: 'ensuite', jobType: 'full_renovation', supply: null, price: 5950, unit: 'per_job', sourceQuote: 'Ensuite renovation labour $5,950.' },
    { room: 'kitchen', jobType: 'full_renovation', supply: null, price: 4850, unit: 'per_job', sourceQuote: 'Kitchen renovation labour $4,850.' },
    { room: 'bathroom', jobType: 'demolition_only', supply: null, price: 1450, unit: 'per_job', sourceQuote: 'Bathroom demolition $1,450.' },
  ],
  supplyModels: ['labour_only', 'supply_and_install'],
  materialPackages: [{ label: 'Kitchen cabinetry package', price: 8950, unit: 'per_job', sourceQuote: 'Kitchen cabinetry package $8,950.' }],
  removals: [
    { removes: 'bathroom_strip', price: 1450, sourceQuote: 'Bathroom demolition $1,450.' },
    { removes: 'kitchen_strip', price: 1650, sourceQuote: 'Kitchen demolition $1,650.' },
  ],
  extras: [
    { type: 'waterproofing', label: 'Bathroom waterproofing', price: 950, unit: 'per_job', isFromPrice: false, sourceQuote: 'Bathroom waterproofing $950.' },
  ],
  surfaces: [
    { label: 'Standard wall plastering', pricePerSqm: 65, sourceQuote: 'Standard wall plastering $65/m2.' },
    { label: 'Timber flooring', pricePerSqm: 95, sourceQuote: 'Timber flooring $95/m2.' },
  ],
  perItem: [{ label: 'Internal door installation', price: 280, sourceQuote: 'Internal door installation $280 each.' }],
  hourly: [{ label: 'General carpentry', price: 95, unit: 'per_hour', sourceQuote: 'General carpentry $95 per hour.' }],
  warranty: { text: 'Ten year workmanship warranty', sourceQuote: 'Ten year workmanship warranty.' },
  inclusions: [],
  exclusions: ['Building permits, engineering and council fees'],
  tags: ['supply-and-install', 'installation-only'],
  otherOfferings: [],
  couldNotUse: [],
};

const run = (x: HomeRenovationExtraction, text = TEXT) =>
  verifyExtraction(x, text, 'home_renovation') as HomeRenovationVerifiedResult;

describe('the home renovation verifier', () => {
  it('keeps a complete price list', () => {
    const r = run(base);
    expect(r.status).toBe('verified');
    /* Five, not the four that were extracted: the kitchen has a strip-out price in `removals` and
       no `demolition_only` rate, so one is derived. See the reconciliation test below. */
    expect(r.ratesKept).toBe(5);
    expect(r.pricing.rates.bathroom).toHaveLength(2);
    expect(r.pricing.rates.bathroom?.[0]).toEqual({
      jobType: 'full_renovation',
      supply: null,
      price: 6850,
      unit: 'per_job',
    });
  });

  /**
   * THE HIGHEST-RISK UNENFORCED THING IN THIS REPO, and the reason this test exists.
   *
   * The five guards in `verify/index.ts` key on a FIELD NAME, not on a stored trade, because they
   * read documents back out of Firestore where a document can be older than the code. A renovation
   * has job types exactly as tiling does, and `enabledJobTypes` was the obvious name for this list -
   * the same trap retaining wall nearly fell into with `enabledMaterials`, and decking with
   * `enabledMaterials` again.
   *
   * Had it been reused, every renovation document would have answered true to `isTilingPricing` and
   * been priced per square metre against a tile that does not exist. Nothing would have thrown.
   */
  it('is not mistaken for any of the five trades before it', () => {
    const p = run(base).pricing;
    expect(isHomeRenovationPricing(p)).toBe(true);
    expect(isFencingPricing(p)).toBe(false);
    expect(isTilingPricing(p)).toBe(false);
    expect(isKitchenPricing(p)).toBe(false);
    expect(isRetainingWallPricing(p)).toBe(false);
    expect(isDeckingPricing(p)).toBe(false);
  });

  it('quarantines the three units that can never be quoted, and keeps them all', () => {
    const p = run(base).pricing;
    // Stored and shown - a renovator's profile is incomplete without them.
    expect(p.surfaces).toHaveLength(2);
    expect(p.perItem).toHaveLength(1);
    expect(p.hourly).toEqual([{ label: 'General carpentry', price: 95, unit: 'per_hour' }]);
    /* And kept OUT of the rate table, which is the half that matters. A $95 hourly rate filed as a
       room quotes a whole renovation for ninety-five dollars. */
    const everyRate = Object.values(p.rates).flat();
    expect(everyRate.map((r) => r.price)).not.toContain(95);
    expect(everyRate.every((r) => r.unit === 'per_job')).toBe(true);
  });

  /**
   * ONE LINE, TWO HOMES - and the reason this is settled in code rather than asked of the model.
   *
   * "Bathroom demolition $1,450" has to be seen two ways: as a `demolition_only` RATE for somebody
   * who wants the room gutted and nothing else, and as a REMOVAL for somebody renovating the room
   * who also needs the old one out.
   *
   * Five live runs of the same fixture read it as a rate three times (13 rates, 2 removals) and as
   * a removal twice (10 rates, 5 removals), and never once as both. In the second reading the
   * business could not be offered for a strip-out job at all - so the same price list gave a
   * customer a different answer depending on which way the extraction fell. Both readings are now
   * completed rather than corrected.
   */
  it('completes a strip-out price whichever of its two homes the model put it in', () => {
    // Read as a RATE only - the removal is derived from it.
    const asRate = run({ ...base, removals: [] });
    expect(asRate.pricing.removals).toEqual([{ removes: 'bathroom_strip', price: 1450 }]);

    // Read as a REMOVAL only - the rate is derived from it, and the room becomes quotable for it.
    const asRemoval = run({ ...base, rates: base.rates.filter((r) => r.jobType !== 'demolition_only') });
    expect(asRemoval.pricing.rates.bathroom).toContainEqual({
      jobType: 'demolition_only',
      supply: null,
      price: 1450,
      unit: 'per_job',
    });
    expect(asRemoval.pricing.rates.kitchen).toContainEqual({
      jobType: 'demolition_only',
      supply: null,
      price: 1650,
      unit: 'per_job',
    });

    /* Both readings of the SAME line land on the same stored shape, which is the whole point.
       Compared on one room, because the two scenarios above differ in more than one place. */
    const onlyBathroom = base.rates.filter((r) => r.room === 'bathroom');
    const readAsRate = run({ ...base, rates: onlyBathroom, removals: [] });
    const readAsRemoval = run({
      ...base,
      rates: onlyBathroom.filter((r) => r.jobType !== 'demolition_only'),
      removals: [{ removes: 'bathroom_strip', price: 1450, sourceQuote: 'Bathroom demolition $1,450.' }],
    });
    expect(readAsRate.pricing.rates).toEqual(readAsRemoval.pricing.rates);
    expect(readAsRate.pricing.removals).toEqual(readAsRemoval.pricing.removals);
    expect(readAsRate.pricing.enabledRooms).toEqual(readAsRemoval.pricing.enabledRooms);
  });

  /** A strip-out for a room the renovator does not renovate at all cannot become a rate. */
  it('does not invent a room from a strip-out price alone', () => {
    const r = run({
      ...base,
      rates: base.rates.filter((x) => x.room === 'ensuite'),
      removals: [{ removes: 'laundry_strip', price: 750, sourceQuote: 'Kitchen demolition $1,650.' }],
    });
    expect(r.pricing.rates.laundry).toBeUndefined();
    expect(r.pricing.enabledRooms).toEqual(['ensuite']);
  });

  it('computes enabledRooms from what survived, not from what was claimed', () => {
    const r = run(base);
    // Four rates across three rooms - the bathroom has two, and the room is listed once.
    expect(r.pricing.enabledRooms.sort()).toEqual(['bathroom', 'ensuite', 'kitchen']);
  });

  /** Gate 1: a value the schema should have made impossible is reported, never forced to the nearest. */
  it('refuses a room that is not in the vocabulary and says so', () => {
    const r = run({
      ...base,
      rates: [{ ...base.rates[0]!, room: 'granny_flat' as never }],
    });
    expect(r.ratesKept).toBe(0);
    expect(r.status).toBe('unverified');
    expect(r.couldNotUse.join(' ')).toMatch(/granny_flat/);
  });

  /** Gate 2: a number that cannot be found in what the business wrote is dropped, not stored. */
  it('drops a rate whose source sentence is not in the description', () => {
    const r = run({
      ...base,
      rates: [{ ...base.rates[0]!, price: 9999, sourceQuote: 'Bathroom renovation labour $9,999.' }],
    });
    expect(r.ratesKept).toBe(0);
    expect(r.couldNotUse.join(' ')).toMatch(/could not find that figure/i);
  });

  it('flags a whole-room price low enough to be a single fitting, and keeps it', () => {
    const r = run(
      { ...base, rates: [{ ...base.rates[0]!, price: 450, sourceQuote: 'Bathroom renovation labour $450.' }] },
      TEXT + '\nBathroom renovation labour $450.',
    );
    // Two: the $450 room, plus the bathroom strip-out derived from `removals`.
    expect(r.ratesKept).toBe(2);
    expect(r.couldNotUse.join(' ')).toMatch(/Worth checking/i);
  });

  /**
   * The room-by-room comparison, and the false positive it was written to avoid.
   *
   * A full-interior demolition costing more than a hallway renovation is not a mistake - it is a
   * bigger job. Only a strip-out dearer than renovating THE SAME ROOM is worth saying out loud.
   */
  it('compares a strip-out against its own room and not against the cheapest room anywhere', () => {
    const quiet = run({
      ...base,
      rates: [...base.rates, { room: 'hallway', jobType: 'full_renovation', supply: null, price: 1850, unit: 'per_job', sourceQuote: 'Hallway renovation labour $1,850.' }],
    });
    // The kitchen strip-out ($1,650) is dearer than the hallway ($1,850)? No - and nothing is said.
    expect(quiet.couldNotUse.join(' ')).not.toMatch(/stripping out/i);

    const loud = run({
      ...base,
      removals: [{ removes: 'bathroom_strip', price: 6850, sourceQuote: 'Bathroom renovation labour $6,850.' }],
    });
    expect(loud.couldNotUse.join(' ')).not.toMatch(/stripping out/i); // equal, not dearer

    const louder = run(
      { ...base, rates: [base.rates[2]!], removals: [{ removes: 'kitchen_strip', price: 8950, sourceQuote: 'Kitchen cabinetry package $8,950.' }] },
    );
    expect(louder.couldNotUse.join(' ')).toMatch(/stripping out kitchen strip is \$8950, more than renovating the same room at \$4850/i);
  });

  it('is registered everywhere a trade has to be', () => {
    expect(TRADES).toContain('home_renovation');
    expect(Object.keys(TRADE_VOCAB.home_renovation.core)).toContain('rooms');
    expect(TRADE_FIELDS.home_renovation.map((f) => f.key)).toEqual([
      'suburb',
      'room',
      'jobType',
      'supply',
      'removal',
      'extras',
      'conditions',
      'existingPrice',
    ]);
  });

  /**
   * The vocabulary landmine that cost decking a golden conversation that would not finish.
   *
   * `NOTHING` in `fuzzyMatch.ts` reads "none", "nothing", "flat", "easy", "clear" and STANDARD as an
   * explicit no. Any option value colliding with it resolves to the pinned "none of this" answer and
   * the question asks itself for ever. It is why this trade's job type is `full_renovation` rather
   * than the `standard` a renovator's own list calls it.
   */
  it('has no option value that reads as an explicit no', () => {
    const NOTHING = /^\s*(none|no|nope|nil|n\/?a|nothing|flat|easy|clear|standard)\b/i;
    for (const [group, values] of Object.entries(TRADE_VOCAB.home_renovation.core)) {
      for (const value of values) {
        expect(NOTHING.test(value), `${group}.${value} collides with the "nothing" pattern`).toBe(false);
      }
    }
  });
});
