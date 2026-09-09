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
};
