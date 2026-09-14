import { describe, expect, it } from 'vitest';
import { quoteDecking, type DeckingBrief } from '../../src/client/pricing/decking.js';
import type { DeckingVerifiedPricing } from '../../src/verify/index.js';
import type { MatchedBusiness } from '../../src/client/matcher.js';

/**
 * What a decking quote is made of, and the one thing no other trade in the product has to do:
 * multiply THREE different quantities into one total.
 *
 *   the deck        square metres of floor        x the board's rate
 *   the balustrade  linear metres along its edge  x the balustrade's rate
 *   the stairs      flights                       x the price of a flight
 *
 * Every number below is checked by hand in the test that uses it, because the failure this file
 * guards against is arithmetic that looks right.
 */

const business: MatchedBusiness = {
  uid: 'deck-1',
  businessName: 'Berwick Decks',
  suburb: 'Berwick, VIC 3806',
  distanceKm: 0,
  rating: 4.9,
  reviewCount: 78,
  autoAcceptsAi: true,
  isAutoAcceptEnabled: false,
} as unknown as MatchedBusiness;

const pricing = (overrides: Partial<DeckingVerifiedPricing> = {}): DeckingVerifiedPricing =>
  ({
    gstIncluded: true,
    enabledDeckMaterials: ['treated_pine', 'merbau', 'composite'],
    enabledDeckHeights: ['ground_level', 'elevated'],
    rates: {
      ground_level: [
        { material: 'treated_pine', pricePerSqm: 280 },
        { material: 'merbau', pricePerSqm: 420 },
        { material: 'composite', pricePerSqm: 520 },
      ],
      elevated: [
        { material: 'treated_pine', pricePerSqm: 390 },
        { material: 'merbau', pricePerSqm: 540 },
      ],
    },
    balustrades: [
      { type: 'timber', price: 220, unit: 'per_metre' },
      { type: 'glass', price: 520, unit: 'per_metre' },
    ],
    stairs: [
      { grade: 'timber', label: 'Standard timber flight up to 5 steps', price: 950, unit: 'per_job' },
      { grade: 'hardwood', label: 'Hardwood flight up to 5 steps', price: 1350, unit: 'per_job' },
      { grade: null, label: 'Each additional step above five', price: 140, unit: 'per_item' },
    ],
    screens: [],
    removals: [
      { removes: 'timber_deck', price: 85, unit: 'per_sqm' },
      { removes: 'composite_deck', price: 95, unit: 'per_sqm' },
    ],
    siteConditions: [
      { condition: 'restricted_access', price: 450, percent: null, unit: 'per_job' },
      { condition: 'rock', price: 180, percent: null, unit: 'per_hour' },
    ],
    extras: [],
    serviceArea: { baseLocation: 'Berwick', resolved: null, radiusKm: 20, excludedAreas: [] },
    minimumCharge: 1200,
    siteInspectionFee: null,
    designFee: null,
    travelFee: 90,
    ...overrides,
  }) as DeckingVerifiedPricing;

const brief = (overrides: Partial<DeckingBrief> = {}): DeckingBrief => ({
  deckHeight: 'ground_level',
  material: 'merbau',
  areaSqm: 25,
  balustrade: null,
  balustradeLm: 0,
  stairs: null,
  stairFlights: 0,
  removal: null,
  conditions: [],
  ...overrides,
});

const quote = (p: DeckingVerifiedPricing, b: DeckingBrief) => quoteDecking(business, p, b);

describe('which rate a decking quote may use', () => {
  it('reads the table the height names, then the board inside it', () => {
    // 420 x 25 = 10,500
    expect(quote(pricing(), brief())).toMatchObject({ ratePerUnit: 420, total: 10500 });
    // The same board a storey up is a different build: 540 x 25 = 13,500.
    expect(quote(pricing(), brief({ deckHeight: 'elevated' }))).toMatchObject({ ratePerUnit: 540, total: 13500 });
  });

  it('tells a height nobody builds at apart from a board nobody lays', () => {
    /* Two different sentences for the customer, and getting it wrong sends them to change something
       that was never the problem. */
    expect(quote(pricing(), brief({ deckHeight: 'high_level' }))).toEqual({ blocked: 'deckHeight' });
    expect(quote(pricing(), brief({ deckHeight: 'elevated', material: 'composite' }))).toEqual({ blocked: 'material' });
  });
});

describe('the three quantities', () => {
  it('charges the balustrade by its OWN length, never by the deck area', () => {
    /* THE assertion this trade exists for. 12 metres of railing on a 25m2 deck is 12 x $220 = $2,640.
       Multiplied by the deck area instead it would be 25 x $220 = $5,500 - more than double, and it
       would look like a plausible number the whole way to the customer. */
    const q = quote(pricing(), brief({ balustrade: 'timber', balustradeLm: 12 }));
    expect(q).toMatchObject({ total: 10500 + 2640 });
    expect(q).not.toMatchObject({ total: 10500 + 25 * 220 });
  });

  it('leaves the per-square-metre rate alone when a balustrade is added', () => {
    // The balustrade is a fixed item, so the rate shown beside the total must not move.
    expect(quote(pricing(), brief({ balustrade: 'timber', balustradeLm: 12 }))).toMatchObject({ ratePerUnit: 420 });
  });

  it('charges stairs by the flight, and never from a per-step row', () => {
    /* The bug a golden conversation caught. The cheapest eligible row IS $140 - "each additional
       step above five" - and treating it as a flight quotes a whole staircase at $140. What tells
       them apart is the GRADE, not the unit - see the last describe in this file. */
    expect(quote(pricing(), brief({ stairs: 'timber', stairFlights: 1 }))).toMatchObject({ total: 10500 + 950 });
    expect(quote(pricing(), brief({ stairs: 'timber', stairFlights: 2 }))).toMatchObject({ total: 10500 + 1900 });
  });

  it('reads the grade the customer asked for', () => {
    expect(quote(pricing(), brief({ stairs: 'hardwood', stairFlights: 1 }))).toMatchObject({ total: 10500 + 1350 });
  });

  it('adds all three together, each against its own quantity', () => {
    /* The worked total: an elevated merbau deck of 25m2, with an old timber deck coming up, 12
       linear metres of timber balustrade and one standard flight.
         (540 + 85) x 25 = 15,625
         12 x 220        =  2,640
         1 x 950         =    950
                           ------
                           19,215                                                                */
    const q = quote(
      pricing(),
      brief({ deckHeight: 'elevated', removal: 'timber_deck', balustrade: 'timber', balustradeLm: 12, stairs: 'timber', stairFlights: 1 }),
    );
    expect(q).toMatchObject({ ratePerUnit: 625, total: 19215 });
  });
});

describe('what else reaches the total, and what may not', () => {
  it('charges a per-square-metre removal against the deck area', () => {
    // 420 + 85 = 505 x 25 = 12,625
    expect(quote(pricing(), brief({ removal: 'timber_deck' }))).toMatchObject({ ratePerUnit: 505, total: 12625 });
  });

  it('takes the dearest published removal when the customer only said "yes"', () => {
    // 95 beats 85: nobody may be shown a total below what they will actually be charged.
    expect(quote(pricing(), brief({ removal: 'any' }))).toMatchObject({ ratePerUnit: 515 });
  });

  it('blocks when they cannot take the old deck up at all', () => {
    expect(quote(pricing({ removals: [] }), brief({ removal: 'any' }))).toEqual({ blocked: 'removal' });
  });

  it('quotes the job and says so when they do not fit balustrades', () => {
    /* NOT blocking. A builder who lays the deck and leaves the railing to somebody else is still
       doing the job, and hiding them costs the customer a builder who could do the rest. */
    expect(quote(pricing({ balustrades: [] }), brief({ balustrade: 'timber', balustradeLm: 12 })))
      .toMatchObject({ total: 10500, badges: expect.arrayContaining(['Balustrade not included']) });
  });

  it('keeps an hourly site charge out of the total and names it', () => {
    /* The rule retaining wall learned the hard way. Nobody knows how many hours of rock there are
       until the ground is open, so an hourly surcharge added once is a total below what they will
       be charged. */
    const q = quote(pricing(), brief({ conditions: ['rock'] })) as { total: number; badges: string[] };
    expect(q.total).toBe(10500);
    expect(q.badges).toEqual(expect.arrayContaining([expect.stringContaining('charged on site')]));
  });

  it('still charges a surcharge published as one price', () => {
    expect(quote(pricing(), brief({ conditions: ['restricted_access'] }))).toMatchObject({ total: 10950 });
  });

  it('raises a small job to the minimum charge', () => {
    // 420 x 2 = 840, under the $1,200 minimum.
    expect(quote(pricing(), brief({ areaSqm: 2 }))).toMatchObject({ total: 1200 });
  });

  it('adds GST to a list that excludes it, so two builders compare honestly', () => {
    expect(quote(pricing({ gstIncluded: false }), brief())).toMatchObject({ total: 11550 });
  });
});

describe('a flight is told from a per-step add-on by its GRADE, not its unit', () => {
  /* Found against the live model, which reads "standard timber flight up to 5 steps $950" as
     `per_item` - a price per flight - where the offline stand-in called it `per_job`. Both are
     defensible readings of the same line, so the unit cannot be the test: filtering on `per_job`
     alone drops every real flight on live data, and filtering on nothing lets the $140 per-step
     add-on price a whole staircase. */
  const liveShape = pricing({
    stairs: [
      { grade: 'timber', label: 'Standard timber flight up to 5 steps', price: 950, unit: 'per_item' },
      { grade: 'hardwood', label: 'Hardwood flight up to 5 steps', price: 1350, unit: 'per_item' },
      { grade: null, label: 'Each additional step above five', price: 140, unit: 'per_item' },
    ],
  });

  it('quotes the flight when every row came back per_item', () => {
    expect(quote(liveShape, brief({ stairs: 'timber', stairFlights: 1 }))).toMatchObject({ total: 10500 + 950 });
    expect(quote(liveShape, brief({ stairs: 'hardwood', stairFlights: 1 }))).toMatchObject({ total: 10500 + 1350 });
  });

  it('still never quotes the ungraded per-step row as a staircase', () => {
    expect(quote(liveShape, brief({ stairs: 'timber', stairFlights: 1 }))).not.toMatchObject({ total: 10500 + 140 });
  });

  it('falls back to the unit only when the builder graded nothing', () => {
    const ungraded = pricing({
      stairs: [
        { grade: null, label: 'Deck stairs', price: 980, unit: 'per_job' },
        { grade: null, label: 'Each additional step', price: 140, unit: 'per_item' },
      ],
    });
    expect(quote(ungraded, brief({ stairs: 'timber', stairFlights: 1 }))).toMatchObject({ total: 10500 + 980 });
  });
});
