import { describe, expect, it } from 'vitest';
import { quoteRetainingWall, type RetainingWallBrief } from '../../src/client/pricing/retainingWall.js';
import type { RetainingWallVerifiedPricing } from '../../src/verify/index.js';
import type { MatchedBusiness } from '../../src/client/matcher.js';

/**
 * Which rate a retaining wall quote may use, and what gets added to it.
 *
 * The two things worth pinning here are the ones no other trade has: `supply` selects a whole rate
 * TABLE rather than adding a material price on top, and `heightBand` is a third, nullable key that
 * has to prefer a banded row and fall back to the general one.
 */

const business: MatchedBusiness = {
  uid: 'wall-1',
  businessName: 'Berwick Retaining Wall',
  suburb: 'Berwick, VIC 3806',
  distanceKm: 0,
  rating: 4.8,
  reviewCount: 52,
  autoAcceptsAi: true,
  isAutoAcceptEnabled: false,
} as unknown as MatchedBusiness;

const pricing = (overrides: Partial<RetainingWallVerifiedPricing> = {}): RetainingWallVerifiedPricing =>
  ({
    gstIncluded: true,
    supplyModels: ['supply_and_install', 'labour_only'],
    enabledWallTypes: ['timber_sleeper', 'concrete_sleeper'],
    rates: {
      labour_only: [
        { wallType: 'timber_sleeper', heightBand: null, pricePerMetre: 145 },
        { wallType: 'concrete_sleeper', heightBand: null, pricePerMetre: 185 },
      ],
      supply_and_install: [
        { wallType: 'timber_sleeper', heightBand: null, pricePerMetre: 285 },
        { wallType: 'concrete_sleeper', heightBand: null, pricePerMetre: 395 },
      ],
    },
    drainage: [
      { type: 'full_package', price: 650, unit: 'per_job' },
      { type: 'ag_pipe', price: 55, unit: 'per_metre' },
    ],
    removals: [
      { removes: 'timber_wall', price: 85, unit: 'per_metre' },
      { removes: 'concrete_sleeper_wall', price: 125, unit: 'per_metre' },
      { removes: 'steel_post', price: 95, unit: 'per_item' },
    ],
    groundworks: [{ type: 'excavation', price: 95, unit: 'per_hour' }],
    siteConditions: [{ condition: 'restricted_access', price: 450, percent: null, unit: 'per_job' }],
    extras: [],
    serviceArea: { baseLocation: 'Berwick', resolved: null, radiusKm: 30, excludedAreas: [] },
    minimumCharge: 650,
    siteInspectionFee: null,
    travelFee: 95,
    ...overrides,
  }) as RetainingWallVerifiedPricing;

const brief = (overrides: Partial<RetainingWallBrief> = {}): RetainingWallBrief => ({
  wallType: 'concrete_sleeper',
  supply: 'labour_only',
  heightKey: null,
  lengthMeters: 20,
  removal: null,
  drainage: null,
  conditions: [],
  ...overrides,
});

const quote = (p: RetainingWallVerifiedPricing, b: RetainingWallBrief) => quoteRetainingWall(business, p, b);

describe('which rate a retaining wall quote may use', () => {
  it('reads the table the supply model names, not one with a material price added on', () => {
    const cheap = quote(pricing(), brief({ supply: 'labour_only' }));
    const dear = quote(pricing(), brief({ supply: 'supply_and_install' }));

    expect(cheap).toMatchObject({ ratePerUnit: 185, total: 3700 });
    /* The whole difference between the two is the rate itself. If this ever comes back as 185 plus
       a separately-added material price, the trade has been made to copy tiling and the sleepers
       are being counted twice. */
    expect(dear).toMatchObject({ ratePerUnit: 395, total: 7900 });
  });

  it('says which supply model the quote is for, because it is most of the price', () => {
    expect(quote(pricing(), brief({ supply: 'labour_only' })))
      .toMatchObject({ badges: expect.arrayContaining(['You supply the materials']) });
    expect(quote(pricing(), brief({ supply: 'supply_and_install' })))
      .toMatchObject({ badges: expect.arrayContaining(['Materials supplied']) });
  });

  it('prefers a rate banded at the height asked for', () => {
    const banded = pricing({
      rates: {
        supply_and_install: [
          { wallType: 'concrete_sleeper', heightBand: '0.6m', pricePerMetre: 340 },
          { wallType: 'concrete_sleeper', heightBand: '0.9m', pricePerMetre: 395 },
          { wallType: 'concrete_sleeper', heightBand: '1.2m', pricePerMetre: 465 },
        ],
      },
    });

    expect(quote(banded, brief({ supply: 'supply_and_install', heightKey: '0.6m' }))).toMatchObject({ ratePerUnit: 340 });
    expect(quote(banded, brief({ supply: 'supply_and_install', heightKey: '1.2m' }))).toMatchObject({ ratePerUnit: 465 });
  });

  it('falls back to the unbanded rate, which is the common case', () => {
    /* Most builders publish one rate per system covering every height they build, so a customer
       answering "0.9m" against a list with no bands must still get a quote rather than a dead end. */
    expect(quote(pricing(), brief({ heightKey: '0.9m' }))).toMatchObject({ ratePerUnit: 185 });
  });

  it('falls back to the DEAREST band, never the nearest, when the height is past every one', () => {
    const banded = pricing({
      rates: {
        labour_only: [
          { wallType: 'concrete_sleeper', heightBand: '0.6m', pricePerMetre: 160 },
          { wallType: 'concrete_sleeper', heightBand: '0.9m', pricePerMetre: 185 },
        ],
      },
    });

    /* 1.5m is more wall than anything published. The nearest band is 0.9m at $185, and quoting it
       would show a total below what they will actually be charged - the one number nobody may be
       shown. The dearest published stands in instead. */
    expect(quote(banded, brief({ heightKey: '1.5m' }))).toMatchObject({ ratePerUnit: 185 });

    const inverted = pricing({
      rates: {
        labour_only: [
          { wallType: 'concrete_sleeper', heightBand: '0.6m', pricePerMetre: 210 },
          { wallType: 'concrete_sleeper', heightBand: '0.9m', pricePerMetre: 185 },
        ],
      },
    });
    // Dearest, not tallest - the rule is about the number, not about the band.
    expect(quote(inverted, brief({ heightKey: '1.5m' }))).toMatchObject({ ratePerUnit: 210 });
  });

  it('tells a missing wall system apart from a missing supply model', () => {
    /* Two different sentences for the customer, and getting it wrong sends them to change something
       that was never the problem. */
    expect(quote(pricing(), brief({ wallType: 'tiered' }))).toEqual({ blocked: 'wallType' });
    expect(quote(pricing({ rates: { labour_only: [{ wallType: 'concrete_sleeper', heightBand: null, pricePerMetre: 185 }] } }), brief({ supply: 'supply_and_install' })))
      .toEqual({ blocked: 'supply' });
  });
});

describe('what gets added to a retaining wall quote', () => {
  it('charges a per-metre removal along the wall and a per-post one once', () => {
    // 185 + 125 removal = 310/m x 20 = 6200
    expect(quote(pricing(), brief({ removal: 'concrete_sleeper_wall' }))).toMatchObject({ ratePerUnit: 310, total: 6200 });
    /* A per-post removal cannot be multiplied by the length - nobody has counted the posts - so it
       lands as one fixed item: 185 x 20 + 95 = 3795. */
    expect(quote(pricing(), brief({ removal: 'steel_post' }))).toMatchObject({ ratePerUnit: 185, total: 3795 });
  });

  it('takes the dearest published removal when the customer only said "yes"', () => {
    // 125 beats 85 and 95: the one number nobody may be shown is a total below what they will pay.
    expect(quote(pricing(), brief({ removal: 'any' }))).toMatchObject({ ratePerUnit: 310 });
  });

  it('blocks when they cannot take the old wall out at all', () => {
    expect(quote(pricing({ removals: [] }), brief({ removal: 'any' }))).toEqual({ blocked: 'removal' });
  });

  it('uses a drainage package at one price when there is one', () => {
    // 185 x 20 + 650 = 4350
    expect(quote(pricing(), brief({ drainage: 'full_package' }))).toMatchObject({ total: 4350, badges: expect.arrayContaining(['Drainage included']) });
  });

  it('sums the per-metre components when they publish no package', () => {
    /* Summed and not the dearest, because these are not alternatives: ag-pipe, gravel and fabric
       all go into the same trench, and a wall drained with one of the three is not drained.
       185 + 55 + 85 = 325/m x 20 = 6500. */
    const noPackage = pricing({
      drainage: [
        { type: 'ag_pipe', price: 55, unit: 'per_metre' },
        { type: 'drainage_gravel', price: 85, unit: 'per_metre' },
      ],
    });
    expect(quote(noPackage, brief({ drainage: 'full_package' }))).toMatchObject({ ratePerUnit: 325, total: 6500 });
  });

  it('quotes the job and says so when they do not price drainage at all', () => {
    /* NOT blocking. A builder who installs the wall and leaves the drainage to somebody else is
       still doing the job, and hiding them costs the customer a builder who could do the rest. */
    expect(quote(pricing({ drainage: [] }), brief({ drainage: 'full_package' })))
      .toMatchObject({ total: 3700, badges: expect.arrayContaining(['Drainage not included']) });
  });

  it('adds a site condition once, not per metre, when that is how it is published', () => {
    // 185 x 20 + 450 = 4150
    expect(quote(pricing(), brief({ conditions: ['restricted_access'] }))).toMatchObject({ total: 4150 });
  });

  it('skips a condition this builder does not charge for rather than blocking', () => {
    expect(quote(pricing(), brief({ conditions: ['rock'] }))).toMatchObject({ total: 3700 });
  });

  it('never lets an hourly groundwork rate into the total', () => {
    /* The excavation is $95 an hour and the customer has not been asked how many hours, because
       nobody could answer. It is stored and shown, and it is not in the price. */
    expect(quote(pricing(), brief())).toMatchObject({ total: 3700 });
  });

  it('raises a small job to the minimum charge', () => {
    // 185 x 2 = 370, under the $650 minimum.
    expect(quote(pricing(), brief({ lengthMeters: 2 }))).toMatchObject({ total: 650 });
  });

  it('adds GST to a list that excludes it, so two builders compare honestly', () => {
    expect(quote(pricing({ gstIncluded: false }), brief())).toMatchObject({ total: 4070 });
  });
});
