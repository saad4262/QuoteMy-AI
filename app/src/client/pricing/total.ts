/**
 * What a job costs, once the lookups are done.
 *
 * `DYNAMIC-SCHEMA-PLAN.md` step 19 expected three pricing models - `linear` for fencing, `area`
 * for tiling and decking, `perItem` for the rest - because fencing sells by the metre and tiling by
 * the square metre. Written out, that turns out not to be a difference in the arithmetic at all:
 *
 *     total = (rate + per-unit extras) x (1 + percent extras) x quantity + fixed items
 *
 * A fence is that with quantity in metres and a gate as a fixed item; a tiled floor is that with
 * quantity in square metres and waterproofing as a per-unit extra. The unit changes what the
 * customer is asked and how the number is read back to them, and it does not change this function.
 * So there is one formula here, parameterised, rather than three that would have to be kept in
 * step with each other - and the trade's `PricingSpec` says which checklist field the quantity
 * comes from.
 *
 * Nothing in here knows what a fence or a tile is. The lookups - which rate, which surcharges,
 * which fixed items - are the trade's own shape and stay with the trade's verifier output.
 */

/** Every figure shown or compared is what the customer would actually pay - an exclusive rate looks 10% cheaper than it is. */
const GST_MULTIPLIER = 1.1;

export const payable = (amount: number, gstIncluded: boolean): number =>
  gstIncluded ? Math.round(amount) : Math.round(amount * GST_MULTIPLIER);

export interface QuoteInput {
  /** The published rate for what they asked for, per unit of `quantity`. */
  rate: number;
  /** Surcharges charged per unit alongside the rate - removal, site conditions, surface prep. */
  perUnitExtras: number;
  /** Surcharges charged as a loading on the per-unit price. 10 means 10%. */
  percentExtras: number;
  quantity: number;
  /** Priced once each, not by the unit: a gate, a callout, a compliance certificate. */
  fixedItems: number;
  minimumCharge: number | null;
  gstIncluded: boolean;
}

export interface QuoteTotal {
  /** The all-in per-unit figure, for showing beside the total and for ranking equal quotes. */
  perUnit: number;
  total: number;
}

export function quoteTotal(input: QuoteInput): QuoteTotal {
  /* The percentage is a loading on the work done along the run or across the floor, so it applies
     to the rate and the per-unit surcharges and not to a fixed item, which is one price either
     way. */
  const perUnit = (input.rate + input.perUnitExtras) * (1 + input.percentExtras / 100);
  const subtotal = perUnit * input.quantity + input.fixedItems;

  const floor = payable(input.minimumCharge ?? 0, input.gstIncluded);
  return {
    perUnit: payable(perUnit, input.gstIncluded),
    total: Math.max(payable(subtotal, input.gstIncluded), floor),
  };
}
