import type { Trade } from '../../vocab.js';

/** What a quantity is measured in. `m2` is not a formatting detail - see `UNIT_WORDS`. */
export type QuantityUnit = 'm' | 'm2' | 'item';

/**
 * How a unit is written and said.
 *
 * Here rather than inline anywhere, because a market guide read off a web page, a rate on a result
 * card and a number read out loud must all agree: quoting a tiler's $65 a square metre back as
 * "$65 a metre" is off by the width of the room.
 */
export const UNIT_WORDS: Record<QuantityUnit, { short: string; long: string; spoken: string }> = {
  m: { short: 'm', long: 'a metre', spoken: 'metres' },
  m2: { short: 'm²', long: 'a square metre', spoken: 'square metres' },
  item: { short: '', long: 'each', spoken: 'each' },
};

/**
 * Which checklist answers a trade's price is calculated from.
 *
 * The formula is one function (`total.ts`); what differs between trades is which answer supplies
 * the quantity, which answers key the rate table, and what unit the whole thing is quoted in. All
 * three are data, so a trade that prices the same way as another needs no new code - and a trade
 * that genuinely prices differently gets a new model in code rather than a formula in a document.
 * The model never writes a formula (`CLAUDE.md` non-negotiable #4).
 */
export interface PricingSpec {
  /**
   * The checklist field holding how much of it there is: `lengthMeters`, `areaSqm`, a count.
   *
   * NULL when the trade has no such number. A kitchen fitter does not sell metres or square
   * metres - they sell one whole kitchen at a price set by its size - so there is no quantity to
   * name and the formula runs at a quantity of one. That is not a special case in the arithmetic:
   * `quoteTotal` is `(rate + perUnit) x (1 + pct) x qty + fixed`, and one is a perfectly good qty.
   */
  quantityField: string | null;
  /**
   * What that quantity is measured in. Wording only - the arithmetic does not care - but it is
   * what stops a square-metre trade being read back to a customer as "$85 a metre".
   */
  unit: QuantityUnit;
  /** The checklist answers that find a rate, outermost key first. */
  rateKeys: string[];
  /** Whether the trade's businesses publish a floor under a small job. */
  minimumCharge: boolean;
  /**
   * Which checklist answer the quote is headlined by - the thing a customer picked that a result
   * card names. Fencing's is the material; tiling's is the tile. It is how the labels for a result
   * are found, so it must be a field with a `labelGroup`.
   */
  headlineField: string;
  /**
   * How the two halves of a rate are read out in a sentence, when nothing matched the brief and the
   * nearest things a business does publish are offered instead.
   *
   * The trades want opposite orders. A fence is named by its material and qualified by a height -
   * "Colorbond at 1.8m". A tiling job is named by the ROOM and qualified by the tile - "kitchen
   * splashback in Porcelain" - because the room is the job and the tile is the choice within it.
   * `lowerOther` because a room mid-sentence is not a proper noun; "1.8m" has no case to lose.
   */
  rateSentence: { order: 'headline-first' | 'other-first'; joiner: string; lowerOther?: boolean };
}

export const TRADE_PRICING: Record<Trade, PricingSpec> = {
  fencing: {
    quantityField: 'lengthMeters',
    unit: 'm',
    // pricing.rates is { material: { "1.8m": rate } } - the same two answers, nested.
    rateKeys: ['material', 'heightKey'],
    minimumCharge: true,
    headlineField: 'material',
    rateSentence: { order: 'headline-first', joiner: 'at' },
  },
  tiling: {
    quantityField: 'areaSqm',
    unit: 'm2',
    /* pricing.rates is { jobType: [ { tileType, price, unit } ] }. The second key is nullable on a
       row - a rate published for any tile - so the lookup prefers a named tile and falls back to
       the general one, the same way a fencing gate prefers its own material's price. */
    rateKeys: ['jobType', 'tileType'],
    minimumCharge: true,
    headlineField: 'tileType',
    rateSentence: { order: 'other-first', joiner: 'in', lowerOther: true },
  },
  kitchen: {
    /* No quantity field at all - see the comment on `quantityField`. The whole kitchen is the
       thing being priced, and its size is a rate key rather than an amount. */
    quantityField: null,
    /* Nothing is quoted per unit here, so this only ever decides wording, and `item` is the
       honest one: a guide figure read off a web page for "a kitchen" is a price each, not a rate. */
    unit: 'item',
    /* pricing.rates is { jobType|general: [ { size, price, unit } ] }. `size` is nullable on a row -
       one installation price covering every size - so the lookup prefers a named size and falls
       back to the general one, the same way a tiling rate prefers a named tile. */
    rateKeys: ['jobType', 'kitchenSize'],
    minimumCharge: true,
    headlineField: 'kitchenSize',
    /* "a standard kitchen for a replacement" reads backwards; "replacing one, standard size" is
       what a person says. Same `other-first` shape as tiling, where the room is the job and the
       choice sits inside it. */
    rateSentence: { order: 'other-first', joiner: 'for', lowerOther: true },
  },
  retaining_wall: {
    /* Per LINEAR metre, like fencing and unlike what the trade's name suggests. A builder sells
       "concrete sleeper supply and install $395/m"; the height is a property of the wall, not a
       second dimension multiplied into a square-metre figure. Quoting one of these back as $395 a
       square metre would be out by the height of the wall. */
    quantityField: 'lengthMeters',
    unit: 'm',
    /* pricing.rates is { supply: [ { wallType, heightBand, pricePerMetre } ] }, and `supply` is the
       OUTER key because it is the coarser question - a builder who only installs customer-supplied
       materials has one bucket and that is a complete price list.
       `heightBand` is a nullable THIRD discriminator on the row, which is why this trade has its
       own pricing module: the lookup prefers a row banded at the customer's height and falls back
       to the general one, and two keys in `rateKeys` cannot express three. */
    rateKeys: ['supply', 'wallType'],
    minimumCharge: true,
    headlineField: 'wallType',
    /* "Concrete sleepers, they supply the materials" is what a person says. The other order -
       "supply and install in concrete sleepers" - reads backwards, because here the wall IS the
       choice and the supply model is the qualifier on it. Same shape as fencing's "Colorbond at
       1.8m", with a comma doing the work "at" does there - and the comma is why the builder now
       omits the space before a punctuation joiner.
       No `lowerOther`, unlike tiling and kitchen: this field's labels are written to the customer
       in the first person - "I'm buying the materials" - and lower-casing the lot turns the one
       English word that is always capitalised into "i'm", which reads as a typo in the middle of a
       sentence offering them a price. */
    rateSentence: { order: 'headline-first', joiner: ',' },
  },
  decking: {
    quantityField: 'areaSqm',
    unit: 'm2',
    /* pricing.rates is { deckHeight: [ { material, pricePerSqm } ] }, and the height is the OUTER
       key because it is the coarser question and the one a customer answers first. Both keys are
       REQUIRED on a row, unlike tiling's nullable tile or a retaining wall's nullable height band:
       a deck rate that has lost its height is a rate for a build nobody described, because the
       posts, bracing and footings under an elevated deck are most of what separates it from one on
       the ground. */
    rateKeys: ['deckHeight', 'material'],
    minimumCharge: true,
    headlineField: 'material',
    /* "Merbau at ground level" is what a person says - the board is the choice and the height
       qualifies it, exactly the shape fencing's "Colorbond at 1.8m" has. `lowerOther` because a
       height band mid-sentence is not a proper noun. */
    rateSentence: { order: 'headline-first', joiner: 'at', lowerOther: true },
  },
  home_renovation: {
    /* No quantity field at all, the same as kitchen and for the same reason: the ROOM is the thing
       being priced. A renovator's list says "bathroom renovation labour $6,850" and that one number
       is the whole job, so there is nothing for a quantity to multiply. A small bathroom and a large
       one are the same line on the list. */
    quantityField: null,
    /* Nothing is quoted per unit here, so this only ever decides wording, and `item` is the honest
       one - it tells the results screen to print the total rather than append a "/m" to it.
       This trade DOES publish per-square-metre rates, for plastering and flooring, and they are
       stored - but they never enter a total, so they never decide this field either. */
    unit: 'item',
    /* pricing.rates is { room: [ { jobType, supply, price, unit } ] }, and the room is the OUTER key
       because it is the coarser question and the one a customer answers first. `jobType` is REQUIRED
       on a row - a full bathroom renovation is $6,850 and stripping the same bathroom out is $1,450,
       so a row that has lost it is a price for nobody knows what. `supply` is the nullable third
       discriminator, which is why this trade has its own pricing module: most renovators publish one
       labour price that covers either model, and two keys in `rateKeys` cannot express three. */
    rateKeys: ['room', 'jobType'],
    minimumCharge: true,
    headlineField: 'room',
    /* "Bathroom, for the full renovation" is what a person says - the room is the job and what is
       being done to it qualifies it. Same `headline-first` shape as retaining wall, with "for"
       doing the work a comma does there. `lowerOther` because a job type mid-sentence is not a
       proper noun. */
    rateSentence: { order: 'headline-first', joiner: 'for', lowerOther: true },
  },
};
