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
  /** The checklist field holding how much of it there is: `lengthMeters`, `areaSqm`, a count. */
  quantityField: string;
  /**
   * What that quantity is measured in. Wording only - the arithmetic does not care - but it is
   * what stops a square-metre trade being read back to a customer as "$85 a metre".
   */
  unit: QuantityUnit;
  /** The checklist answers that find a rate, outermost key first. */
  rateKeys: string[];
  /** Whether the trade's businesses publish a floor under a small job. */
  minimumCharge: boolean;
}

export const TRADE_PRICING: Record<Trade, PricingSpec> = {
  fencing: {
    quantityField: 'lengthMeters',
    unit: 'm',
    // pricing.rates is { material: { "1.8m": rate } } - the same two answers, nested.
    rateKeys: ['material', 'heightKey'],
    minimumCharge: true,
  },
  tiling: {
    quantityField: 'areaSqm',
    unit: 'm2',
    /* pricing.rates is { jobType: [ { tileType, price, unit } ] }. The second key is nullable on a
       row - a rate published for any tile - so the lookup prefers a named tile and falls back to
       the general one, the same way a fencing gate prefers its own material's price. */
    rateKeys: ['jobType', 'tileType'],
    minimumCharge: true,
  },
};
