import type { Trade } from '../../vocab.js';

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
  unit: 'm' | 'm2' | 'item';
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
};
