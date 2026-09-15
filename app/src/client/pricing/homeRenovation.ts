import type { MatchedBusiness } from '../matcher.js';
import { slug } from '../fuzzyMatch.js';
import type { RenoRate, HomeRenovationVerifiedPricing } from '../../verify/index.js';
import { quoteTotal } from './total.js';

/**
 * One business, one renovated room.
 *
 * The sum is the same as every other trade's (`total.ts`), and what is particular here is that
 * there is NO QUANTITY. A fencer sells metres and a tiler sells square metres; a renovator sells a
 * ROOM at a flat price, and then itemises everything else. So the quantity is one and every
 * addition - the strip-out, the materials package, the extras, the fees - is a fixed item.
 *
 * That is not a special case in the arithmetic. `quoteTotal` is
 * `(rate + perUnit) x (1 + pct) x qty + fixed`, and this trade is that with `perUnit` and `pct`
 * empty and `qty` one. Nothing was added to the formula to make renovations fit it. Kitchen got
 * there first and this is the same shape.
 *
 * WHAT THIS MODULE MOSTLY DOES IS REFUSE TO ADD THINGS UP. A renovator's list carries work sold by
 * the square metre, work sold each, and work sold by the hour, and none of the three may reach a
 * total: this conversation asks for no area, no count and no duration, so every one of them would
 * have to be multiplied by a number nobody gave us. They become badges instead - the treatment
 * `retainingWall.ts` already gives rock excavation, after "$180 per hour" was once added to a total
 * as though rocky ground were an hour's work.
 */

export interface RenoBrief {
  room: string;
  jobType: string;
  /** `supply_and_install` means the business's own materials price is part of the quote. */
  supply: string;
  /** What is coming out, or null when there is nothing. `any` means "they did not say how much". */
  removal: string | null;
  extras: string[];
}

export type RenoBlocked = 'room' | 'jobType' | 'removal';

export interface RenoQuote {
  roomKey: string;
  jobKey: string;
  /** The all-in figure for the job, for showing beside the total. This trade has no per-unit price. */
  ratePerUnit: number;
  total: number;
  badges: string[];
}

/**
 * The rate this business publishes for this room and job, preferring one written for this exact
 * supply model.
 *
 * Identical in spirit to tiling's tile lookup, kitchen's size lookup and a retaining wall's height
 * band: a row that names the supply model has told us more than one that did not, and the null row
 * is the fallback rather than the answer. Most renovators publish one labour price and say once, at
 * the top, that materials are extra - so the null row is the common case here, not the exception.
 *
 * Only `per_job` rows are eligible. A per-square-metre or per-item row cannot quote a room without
 * an area or a count, and this conversation deliberately never asks for either. Those rows stay in
 * the data and are shown on the business's own screen; they simply cannot be the basis of a quote.
 */
function findRate(rows: RenoRate[], jobType: string, supply: string): RenoRate | undefined {
  /* Compared RAW, never slugged, and this is the one mistake that silently breaks this whole trade.
     `slug` here turns an underscore into a HYPHEN - `full_renovation` becomes `full-renovation` -
     and these are closed vocabulary values used as keys, so a slugged comparison matches nothing at
     all. The quote then falls through to the alternatives loop, which offers the customer the exact
     job they just asked for as though it were the nearest available substitute.
     The same note sits on `deckingBrief` and on kitchen's supply, for the same reason. */
  const forJob = rows.filter((row) => row.unit === 'per_job' && row.jobType === jobType);
  return forJob.find((row) => row.supply && row.supply === supply) ?? forJob.find((row) => !row.supply);
}

export function quoteHomeRenovation(
  business: MatchedBusiness,
  pricing: HomeRenovationVerifiedPricing,
  brief: RenoBrief,
): RenoQuote | { blocked: RenoBlocked } {
  const rows = pricing.rates[brief.room] ?? [];
  /* Two different failures, told apart, because the customer's next move differs. A renovator with
     nothing at all for this room cannot do it and the answer is a different room; one who renovates
     the room but does not strip it out is a different sentence and a different question. Tiling
     makes the same distinction for the same reason. */
  if (!rows.length) return { blocked: 'room' };

  const rate = findRate(rows, brief.jobType, brief.supply);
  if (!rate) return { blocked: 'jobType' };

  /* Stripping the old one out, priced by what is coming out - and by the dearest they publish when
     the customer only said "yes", for the same reason every other trade does it: the one number
     nobody may be shown is a total lower than what they will actually be charged. */
  let removal = 0;
  /* The strip-out is not added when the strip-out IS the job. One line on a renovator's list -
     "Bathroom demolition $1,450" - is legitimately both a `demolition_only` rate and a removal, and
     a customer who asked for nothing but the demolition would otherwise be charged for it twice.
     `fieldSpec.ts` stops the question being asked; this stops the sum, because the field can be
     filled off an attached document without anybody being asked anything. */
  if (brief.removal && brief.jobType !== 'demolition_only') {
    const published =
      pricing.removals.find((row) => slug(row.removes) === brief.removal) ??
      pricing.removals.find((row) => slug(row.removes) === 'any');
    const dearest =
      brief.removal === 'any' && pricing.removals.length
        ? pricing.removals.reduce((worst, row) => (row.price > worst.price ? row : worst))
        : undefined;
    const entry = published ?? dearest;
    // They cannot strip the old one out, so they cannot do this job.
    if (!entry) return { blocked: 'removal' };
    removal = entry.price;
  }

  /* The materials, when the business is supplying them. Their own published price and never a figure
     from anywhere else - a searched material price is a market guide beside a quote, never part of
     one (`budget.ts`). The dearest of their range is used, because a customer choosing "they supply
     the materials" has not chosen WHICH materials, and the number shown must not be one they will
     be charged more than.

     Note what this deliberately does NOT do: it does not refuse the quote when the business
     publishes no package. Most renovators who supply materials quote them per job after a
     selection appointment, and hiding them from a customer who ticked "supply and install" would
     cost that customer a business that can do the work. They get a badge saying so instead. */
  let materials = 0;
  if (brief.supply === 'supply_and_install' && pricing.materialPackages.length) {
    const packages = pricing.materialPackages.filter((row) => row.unit === 'per_job');
    const from = packages.length ? packages : pricing.materialPackages;
    materials = from.reduce((worst, row) => (row.price > worst.price ? row : worst)).price;
  }

  /* The extras the customer asked for, each priced once. An extra this business does not price is
     silently skipped rather than blocking - the same treatment fencing gives a site condition
     nobody charges for.

     A PRICED EXTRA WITH A UNIT ON IT IS SKIPPED TOO, and that is the important half. "Floor tiling
     $75/m2" is a real price for a real thing the customer asked for, and adding 75 to the total
     would quote them one square metre of it. Only a flat, per-job extra can be summed here; the
     rest become the badge below. */
  let extras = 0;
  const extrasPriced: string[] = [];
  const extrasOnSite: string[] = [];
  for (const wanted of brief.extras) {
    const entry = pricing.extras.find((row) => row.type && slug(row.type) === slug(wanted) && row.price !== null);
    if (!entry?.price) continue;
    if (entry.unit && entry.unit !== 'per_job') {
      /* The BUSINESS's own label, not the vocabulary slug. "Floor tiling measured on site" is a
         sentence; "waste_disposal measured on site" is a database key on a customer's screen. */
      extrasOnSite.push(entry.label);
      continue;
    }
    extras += entry.price;
    extrasPriced.push(wanted);
  }

  const gstIncluded = pricing.gstIncluded === true;
  const { total } = quoteTotal({
    rate: rate.price,
    /* Nothing is charged per unit in this trade, and there is no unit to charge it against. Every
       addition is a fixed item, which is exactly what they are on a renovator's own quotation. */
    perUnitExtras: 0,
    percentExtras: 0,
    quantity: 1,
    fixedItems: removal + materials + extras + (pricing.siteInspectionFee ?? 0),
    minimumCharge: pricing.minimumCharge,
    gstIncluded,
  });

  const badges: string[] = [];
  badges.push(gstIncluded ? 'incl. GST' : 'incl. GST (added)');
  badges.push(business.distanceKm > 0 ? business.distanceKm + ' km away' : 'In your suburb');
  if (business.rating) badges.push(business.reviewCount ? business.rating + '★ (' + business.reviewCount + ')' : business.rating + '★');
  /* Said plainly, because it changes what the number covers and it is the biggest single difference
     between two renovators' quotes. A customer comparing them needs to know who is buying the
     vanity, the tiles and the tapware. */
  if (materials > 0) badges.push('Materials supplied');
  else if (brief.supply === 'supply_and_install') badges.push('Materials quoted separately');
  else badges.push('You supply the materials');
  if (removal > 0) badges.push('Old one stripped out');
  if (extrasPriced.length) badges.push(extrasPriced.length + ' extra' + (extrasPriced.length > 1 ? 's' : '') + ' included');
  /* The three things this trade sells that cannot be totalled. Named rather than hidden, because a
     customer who asked for tiling and sees no mention of it assumes it is in the number. */
  if (extrasOnSite.length) badges.push(extrasOnSite.join(' and ') + ' measured on site, not in this price');
  if (pricing.hourly.length) badges.push('Carpentry charged by the hour on site, not in this price');
  if (pricing.siteInspectionFee) badges.push('Includes $' + pricing.siteInspectionFee + ' site inspection');
  if (business.isAutoAcceptEnabled) badges.push('Instant accept');

  return {
    roomKey: brief.room,
    jobKey: rate.jobType,
    /* The whole job, since there is no unit to divide by. Kept as its own field so the results
       screen and the ranking can read every trade's quote the same way. */
    ratePerUnit: total,
    total,
    badges,
  };
}
