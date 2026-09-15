import { describe, expect, it } from 'vitest';
import { quoteHomeRenovation, type RenoBrief } from '../../src/client/pricing/homeRenovation.js';
import type { HomeRenovationVerifiedPricing } from '../../src/verify/index.js';
import type { MatchedBusiness } from '../../src/client/matcher.js';

/**
 * The renovation quote, and what it refuses to add up.
 *
 * Every figure here is Berwick Home Renovations' own. The sums are deliberately written out in the
 * assertions rather than as one total, because the thing worth checking is WHICH lines went in.
 */

const business = {
  uid: 'reno-1',
  businessName: 'Berwick Home Renovations',
  suburb: 'Berwick',
  distanceKm: 0,
  autoAcceptsAi: true,
  isAutoAcceptEnabled: false,
  rating: 4.8,
  reviewCount: 64,
} as unknown as MatchedBusiness;

const pricing = {
  gstIncluded: true,
  supplyModels: ['labour_only', 'supply_and_install'],
  enabledRooms: ['bathroom', 'kitchen', 'bedroom'],
  rates: {
    bathroom: [
      { jobType: 'full_renovation', supply: null, price: 6850, unit: 'per_job' },
      { jobType: 'demolition_only', supply: null, price: 1450, unit: 'per_job' },
    ],
    kitchen: [{ jobType: 'full_renovation', supply: null, price: 4850, unit: 'per_job' }],
    bedroom: [{ jobType: 'full_renovation', supply: null, price: 2850, unit: 'per_job' }],
  },
  materialPackages: [{ label: 'Kitchen cabinetry package', price: 8950, unit: 'per_job' }],
  removals: [
    { removes: 'bathroom_strip', price: 1450 },
    { removes: 'kitchen_strip', price: 1650 },
  ],
  extras: [
    { type: 'waterproofing', label: 'Bathroom waterproofing', price: 950, unit: 'per_job', isFromPrice: false },
    /* Priced per square metre. Real, published, askable for - and unquotable, because this
       conversation asks for no area. */
    { type: 'tiling', label: 'Floor tiling', price: 75, unit: 'per_sqm', isFromPrice: false },
  ],
  surfaces: [{ label: 'Standard wall plastering', pricePerSqm: 65 }],
  perItem: [{ label: 'Internal door installation', price: 280 }],
  hourly: [{ label: 'General carpentry', price: 95, unit: 'per_hour' }],
  serviceArea: { baseLocation: 'Berwick', resolved: null, radiusKm: 30, excludedAreas: [] },
  minimumCharge: 450,
  siteInspectionFee: 150,
  consultationFee: 180,
  travelFee: 95,
} as unknown as HomeRenovationVerifiedPricing;

const brief = (over: Partial<RenoBrief> = {}): RenoBrief => ({
  room: 'bathroom',
  jobType: 'full_renovation',
  supply: 'labour_only',
  removal: null,
  extras: [],
  ...over,
});

const quote = (over: Partial<RenoBrief> = {}) => {
  const q = quoteHomeRenovation(business, pricing, brief(over));
  if ('blocked' in q) throw new Error('blocked on ' + q.blocked);
  return q;
};

describe('the renovation quote', () => {
  it('is the room plus the site inspection and nothing else', () => {
    // 6850 room + 150 inspection
    expect(quote().total).toBe(7000);
  });

  it('adds the strip-out when there is one', () => {
    // 6850 room + 1450 strip-out + 150 inspection
    expect(quote({ removal: 'bathroom-strip' }).total).toBe(8450);
  });

  it('adds the materials package only when the renovator is supplying them', () => {
    // 4850 kitchen + 150
    expect(quote({ room: 'kitchen', supply: 'labour_only' }).total).toBe(5000);
    // 4850 kitchen + 8950 package + 150
    expect(quote({ room: 'kitchen', supply: 'supply_and_install' }).total).toBe(13950);
  });

  it('adds a flat-priced extra the customer asked for', () => {
    // 6850 + 950 waterproofing + 150
    expect(quote({ extras: ['waterproofing'] }).total).toBe(7950);
  });

  /**
   * THE ONE THIS MODULE EXISTS FOR.
   *
   * Floor tiling is $75 per square metre and carpentry is $95 an hour. Both are real, published,
   * and askable for - and neither may enter a total, because nobody has been asked for an area or
   * for hours. A total containing 75 or 95 is this trade's worst failure: it shows a customer a
   * number far below what they will actually be charged, which is the exact fault that put the
   * `per_hour` guard into `pricing/retainingWall.ts` after rock excavation was once totalled as
   * though rocky ground were an hour's work.
   */
  it('never puts a per-square-metre extra into the total, and says so instead', () => {
    const q = quote({ extras: ['tiling'] });
    // 6850 + 150, and NOT 6850 + 75 + 150.
    expect(q.total).toBe(7000);
    expect(q.total).not.toBe(7075);
    expect(q.badges).toContain('Floor tiling measured on site, not in this price');
  });

  it('never puts an hourly rate into the total, and says so instead', () => {
    const q = quote();
    expect(q.total).toBe(7000);
    expect(q.badges).toContain('Carpentry charged by the hour on site, not in this price');
  });

  it('leaves the surfaces and per-item lists out of every total', () => {
    // 65 and 280 are published and must never appear in or shift a quote.
    expect(quote().total).toBe(7000);
    expect(quote({ extras: ['waterproofing'] }).total).toBe(7950);
  });

  /**
   * The double-charge guard. "Bathroom demolition $1,450" is ONE price on the renovator's list,
   * stored twice on purpose - as a `demolition_only` rate and as a removal - so a customer who
   * wants only the strip-out must be charged $1,450 and never $2,900.
   */
  it('does not charge the strip-out twice when the strip-out is the whole job', () => {
    const q = quote({ jobType: 'demolition_only', removal: 'bathroom-strip' });
    // 1450 + 150, not 1450 + 1450 + 150.
    expect(q.total).toBe(1600);
    expect(q.total).not.toBe(3050);
  });

  it('tells a room it cannot do apart from a job it will not do', () => {
    expect(quoteHomeRenovation(business, pricing, brief({ room: 'hallway' }))).toEqual({ blocked: 'room' });
    expect(quoteHomeRenovation(business, pricing, brief({ room: 'kitchen', jobType: 'demolition_only' }))).toEqual({
      blocked: 'jobType',
    });
  });

  /**
   * The slug trap that broke this trade's first five golden conversations.
   *
   * `slug()` turns an underscore into a HYPHEN, so a slugged `full_renovation` becomes
   * `full-renovation` and matches no rate at all - the quote then falls through to the alternatives
   * loop, which offers the customer the exact job they just asked for as its own nearest substitute.
   */
  it('matches the vocabulary value exactly, not a slugged version of it', () => {
    expect(quoteHomeRenovation(business, pricing, brief({ jobType: 'full-renovation' }))).toEqual({
      blocked: 'jobType',
    });
    expect(quoteHomeRenovation(business, pricing, brief({ room: 'living-room' }))).toEqual({ blocked: 'room' });
  });

  it('applies the minimum charge when the job comes in under it', () => {
    const cheap = {
      ...pricing,
      rates: { bathroom: [{ jobType: 'full_renovation', supply: null, price: 100, unit: 'per_job' }] },
      siteInspectionFee: null,
      hourly: [],
    } as unknown as HomeRenovationVerifiedPricing;
    const q = quoteHomeRenovation(business, cheap, brief());
    if ('blocked' in q) throw new Error('blocked');
    expect(q.total).toBe(450);
  });

  it("prefers a rate written for the customer's supply model over the general one", () => {
    const banded = {
      ...pricing,
      rates: {
        bathroom: [
          { jobType: 'full_renovation', supply: null, price: 6850, unit: 'per_job' },
          { jobType: 'full_renovation', supply: 'supply_and_install', price: 14500, unit: 'per_job' },
        ],
      },
      materialPackages: [],
    } as unknown as HomeRenovationVerifiedPricing;
    const general = quoteHomeRenovation(business, banded, brief({ supply: 'labour_only' }));
    const named = quoteHomeRenovation(business, banded, brief({ supply: 'supply_and_install' }));
    if ('blocked' in general || 'blocked' in named) throw new Error('blocked');
    expect(general.total).toBe(7000); // 6850 + 150, the null row
    expect(named.total).toBe(14650); // 14500 + 150, the row written for that model
  });
});
