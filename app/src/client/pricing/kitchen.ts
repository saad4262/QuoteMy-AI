import type { MatchedBusiness } from '../matcher.js';
import { slug } from '../fuzzyMatch.js';
import type { KitchenRate, KitchenVerifiedPricing } from '../../verify/index.js';
import { GENERAL_JOB } from '../../verify/kitchen.js';
import { quoteTotal } from './total.js';

/**
 * One business, one kitchen.
 *
 * The sum is the same as every other trade's (`total.ts`), and what is particular here is that
 * there is NO QUANTITY. A fencer sells metres and a tiler sells square metres; a kitchen fitter
 * sells one whole kitchen at a price set by its size, and then itemises everything else. So the
 * quantity is one and every addition - removal, cabinetry, benchtop, extras - is a fixed item.
 *
 * That is not a special case in the arithmetic. `quoteTotal` is
 * `(rate + perUnit) x (1 + pct) x qty + fixed`, and this trade is that with `perUnit` and `pct`
 * empty and `qty` one. Nothing was added to the formula to make kitchen fit it.
 */

export interface KitchenBrief {
  jobType: string;
  kitchenSize: string;
  /** What benchtop they want, or null when they have one already or do not need one. */
  benchtop: string | null;
  /** What is coming out, or null when there is nothing. `any` means "they did not say how much". */
  removal: string | null;
  extras: string[];
  /** `supply_and_install` means the business's own cabinetry price is part of the quote. */
  supply: string;
}

export type KitchenBlocked = 'kitchenSize' | 'removal';

export interface KitchenQuote {
  rateKey: string;
  sizeKey: string;
  /** The all-in figure for the job, for showing beside the total. Kitchen has no per-unit price. */
  ratePerUnit: number;
  total: number;
  badges: string[];
}

/**
 * The installation rate this business publishes for this kitchen, preferring one written for this
 * exact size.
 *
 * Identical in spirit to tiling's tile lookup and fencing's gate lookup: a business that names
 * "large" has told us more than one that published a single installation price, and the general
 * row is the fallback rather than the answer.
 *
 * Only `per_job` rows are eligible. A per-cabinet price cannot quote a kitchen without a cabinet
 * count, and this conversation deliberately never asks for one - a customer who miscounts produces
 * a wrong price rather than a missing one. Those rows stay in the data and are shown on the
 * business's own screen; they simply cannot be the basis of a quote here.
 */
function findRate(rows: KitchenRate[], size: string): KitchenRate | undefined {
  const perJob = rows.filter((row) => row.unit === 'per_job');
  return perJob.find((row) => row.size && slug(row.size) === size) ?? perJob.find((row) => !row.size);
}

/**
 * The rate for this job, falling back to the general bucket and then to any other.
 *
 * Most fitters publish one installation price that covers a new kitchen, a replacement and an
 * install-only job alike, and the verifier files that under `general`. A rate written for this
 * particular job beats it - "customer-supplied kitchen installation $2,850" is a better answer to
 * an install-only job than a general figure - which is why the job's own bucket is tried first.
 *
 * THE LAST STEP IS WHY THIS IS NOT TWO LINES. A price list is written in sections, and a section
 * heading is not a restriction: Beky Kitchens prints its three sizes under "Installation-only
 * pricing", so every rate was filed under `install_only` and a customer REPLACING a kitchen was
 * told nobody prices a kitchen that size - by the one business that prices all three. The size was
 * never the problem, which made the sentence they read untrue as well as unhelpful.
 *
 * What actually separates the three job types is already asked elsewhere: who buys the cabinets is
 * `supply`, and taking the old kitchen out is `removal`. Both are priced separately. The
 * installation labour for a large kitchen is the same job whatever the customer calls it, so a
 * published installation price is usable whatever heading it sat under.
 *
 * The DEAREST such rate, for the same reason the cabinetry package takes the dearest: the one
 * number nobody may be shown is a total below what they will actually be charged. A quote from
 * another bucket is a fallback, not a claim about what that business calls the job.
 */
function rateForJob(
  pricing: KitchenVerifiedPricing,
  jobType: string,
  size: string,
): { rate: KitchenRate; rateKey: string } | undefined {
  for (const key of [jobType, GENERAL_JOB]) {
    if (!key) continue;
    const rate = findRate(pricing.rates[key] ?? [], size);
    if (rate) return { rate, rateKey: key };
  }

  let dearest: { rate: KitchenRate; rateKey: string } | undefined;
  for (const [key, rows] of Object.entries(pricing.rates)) {
    if (key === jobType || key === GENERAL_JOB) continue;
    const rate = findRate(rows, size);
    if (rate && (!dearest || rate.price > dearest.rate.price)) dearest = { rate, rateKey: key };
  }
  return dearest;
}

export function quoteKitchen(
  business: MatchedBusiness,
  pricing: KitchenVerifiedPricing,
  brief: KitchenBrief,
): KitchenQuote | { blocked: KitchenBlocked } {
  const found = rateForJob(pricing, brief.jobType, brief.kitchenSize);
  /* Unlike tiling there is only one way to fail here, and it is honest to say so plainly: a fitter
     with no per-job installation price cannot quote a kitchen of any size, so there is no second
     diagnosis to make. The customer is offered the sizes that ARE priced. */
  if (!found) return { blocked: 'kitchenSize' };
  const { rate, rateKey } = found;

  /* Taking the old kitchen out, priced by what is coming out - and by the dearest they publish when
     the customer only said "yes", for the same reason both other trades do it: the one number
     nobody may be shown is a total lower than what they will actually be charged. */
  let removal = 0;
  if (brief.removal) {
    const published =
      pricing.removals.find((row) => slug(row.removes) === brief.removal) ??
      pricing.removals.find((row) => slug(row.removes) === 'any');
    const dearest =
      brief.removal === 'any' && pricing.removals.length
        ? pricing.removals.reduce((worst, row) => (row.price > worst.price ? row : worst))
        : undefined;
    const entry = published ?? dearest;
    // They cannot take the old kitchen out, so they cannot do this job.
    if (!entry) return { blocked: 'removal' };
    removal = entry.price;
  }

  /* The cabinetry itself, when the business is supplying it. Their own published price and never a
     figure from anywhere else - a searched cabinetry price is a market guide beside a quote, never
     part of one (`budget.ts`). The dearest of their range is used, because a customer choosing
     "they supply the cabinets" has not chosen WHICH cabinets, and the number shown must not be one
     they will be charged more than. This is the single largest line in a kitchen quote. */
  let cabinetry = 0;
  if (brief.supply === 'supply_and_install' && pricing.cabinetSupply.length) {
    const packages = pricing.cabinetSupply.filter((row) => row.unit === 'per_job');
    const from = packages.length ? packages : pricing.cabinetSupply;
    cabinetry = from.reduce((worst, row) => (row.price > worst.price ? row : worst)).price;
  }

  /* The benchtop, priced by material as one item. NOT blocking when they do not install it: a
     fitter who fits the kitchen and leaves the benchtop to a stone specialist is still doing the
     job, and hiding them would cost the customer a business that could do the rest. They are told
     it is not included instead. */
  let benchtop = 0;
  if (brief.benchtop) {
    benchtop = pricing.benchtops.find((row) => slug(row.material) === brief.benchtop)?.price ?? 0;
  }

  /* The extras the customer asked for, each priced once. An extra this business does not price is
     silently skipped rather than blocking - the same treatment fencing gives a site condition
     nobody charges for. A business that never listed an island does not refuse to build one; they
     simply do not charge extra for it in a published list, and the site measure settles it. */
  let extras = 0;
  const extrasPriced: string[] = [];
  for (const wanted of brief.extras) {
    const entry = pricing.extras.find((row) => row.type && slug(row.type) === slug(wanted) && row.price !== null);
    if (!entry?.price) continue;
    extras += entry.price;
    extrasPriced.push(wanted);
  }

  const gstIncluded = pricing.gstIncluded === true;
  const { total } = quoteTotal({
    rate: rate.price,
    /* Nothing is charged per unit in this trade, and there is no unit to charge it against. Every
       addition is a fixed item, which is exactly what they are on a fitter's own quotation. */
    perUnitExtras: 0,
    percentExtras: 0,
    quantity: 1,
    fixedItems: removal + cabinetry + benchtop + extras + (pricing.siteMeasureFee ?? 0),
    minimumCharge: pricing.minimumCharge,
    gstIncluded,
  });

  const badges: string[] = [];
  badges.push(gstIncluded ? 'incl. GST' : 'incl. GST (added)');
  badges.push(business.distanceKm > 0 ? business.distanceKm + ' km away' : 'In your suburb');
  if (business.rating) badges.push(business.reviewCount ? business.rating + '★ (' + business.reviewCount + ')' : business.rating + '★');
  /* Said plainly, because it changes what the number covers and it is the biggest single line in
     the quote. A customer comparing two fitters needs to know which of them is buying the kitchen. */
  if (cabinetry > 0) badges.push('Cabinetry supplied');
  else if (brief.supply === 'labour_only') badges.push('You supply the cabinets');
  if (removal > 0) badges.push('Old kitchen removed');
  if (benchtop > 0) badges.push('Benchtop installed');
  else if (brief.benchtop) badges.push('Benchtop not included');
  if (extrasPriced.length) badges.push(extrasPriced.length + ' extra' + (extrasPriced.length > 1 ? 's' : '') + ' included');
  if (pricing.siteMeasureFee) badges.push('Includes $' + pricing.siteMeasureFee + ' site measure');
  if (business.isAutoAcceptEnabled) badges.push('Instant accept');

  return {
    rateKey,
    sizeKey: rate.size ?? brief.kitchenSize,
    /* The whole job, since there is no unit to divide by. Kept as its own field so the results
       screen and the ranking can read every trade's quote the same way. */
    ratePerUnit: total,
    total,
    badges,
  };
}
