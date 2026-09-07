import type { MatchedBusiness } from '../matcher.js';
import { slug } from '../fuzzyMatch.js';
import type { TileRate, TilingVerifiedPricing } from '../../verify/index.js';
import { quoteTotal } from './total.js';

/**
 * One business, one tiling job.
 *
 * The shape of the sum is the same as every other trade's (`total.ts`); what is particular here is
 * that the business may have published the rate either way. "Standard floor tiling $65/m²" is
 * priced by the area; "Complete bathroom package $4,850" is one price for the job. The unit on the
 * row decides which, and everything else - removal, tile supply, surcharges - is worked out from
 * the area either way.
 *
 * A per-job rate therefore takes its area-based extras as a single per-unit figure against a
 * quantity of one. That is not a trick: it means a percentage surcharge loads the whole job the way
 * it loads a per-metre one, rather than skipping the parts that happened to be measured.
 */

export interface TilingBrief {
  jobType: string;
  tileType: string;
  areaSqm: number;
  /** What is being taken up, or null when there is nothing. `any` means "they did not say which". */
  removal: string | null;
  /** Which wet area needs it, or null. */
  waterproofing: string | null;
  conditions: string[];
  /** `supply_and_install` means the business's own tile price is part of the quote. */
  supply: string;
}

export type TilingBlocked = 'jobType' | 'tileType' | 'removal';

export interface TilingQuote {
  rateKey: string;
  tileKey: string;
  /** The all-in figure per square metre, for showing beside the total. */
  ratePerUnit: number;
  total: number;
  badges: string[];
}

/**
 * The rate this business publishes for this job, preferring one written for this exact tile.
 *
 * Identical in spirit to fencing's gate lookup, where a gate priced against a material beats one
 * priced for anything: a business that names porcelain has told us more than one that did not, and
 * the general row is the fallback rather than the answer.
 */
function findRate(rows: TileRate[], tileType: string): TileRate | undefined {
  return rows.find((row) => row.tileType && slug(row.tileType) === tileType) ?? rows.find((row) => !row.tileType);
}

export function quoteTiling(
  business: MatchedBusiness,
  pricing: TilingVerifiedPricing,
  brief: TilingBrief,
): TilingQuote | { blocked: TilingBlocked } {
  const rateKey = Object.keys(pricing.rates).find((key) => slug(key) === brief.jobType);
  if (!rateKey) return { blocked: 'jobType' };

  const rate = findRate(pricing.rates[rateKey] ?? [], brief.tileType);
  if (!rate) return { blocked: 'tileType' };

  const area = brief.areaSqm > 0 ? brief.areaSqm : 0;

  // Taking up what is there, priced by what it is - and by the dearest they publish when the
  // customer only said "yes", for the same reason fencing does it: the one number nobody may be
  // shown is a total lower than what they will actually be charged.
  let removalPerSqm = 0;
  if (brief.removal) {
    const published =
      pricing.removals.find((row) => slug(row.removes) === brief.removal) ??
      pricing.removals.find((row) => slug(row.removes) === 'any');
    const dearest =
      brief.removal === 'any' && pricing.removals.length
        ? pricing.removals.reduce((worst, row) => (row.pricePerSqm > worst.pricePerSqm ? row : worst))
        : undefined;
    const entry = published ?? dearest;
    // They cannot take the old tiles up, so they cannot do this job.
    if (!entry) return { blocked: 'removal' };
    removalPerSqm = entry.pricePerSqm;
  }

  /* The tiles themselves, when the business is supplying them. Their own published price and never
     a figure from anywhere else - a searched material price is a market guide beside a quote, never
     part of one (`budget.ts`). The dearest of their range is used when the customer has not picked
     a tile, so the number shown is not one they will be charged more than. */
  let tilePerSqm = 0;
  if (brief.supply === 'supply_and_install' && pricing.tileSupply.length) {
    const named = pricing.tileSupply.filter((row) => row.tileType && slug(row.tileType) === brief.tileType);
    const from = named.length ? named : pricing.tileSupply;
    tilePerSqm = from.reduce((worst, row) => (row.pricePerSqm > worst.pricePerSqm ? row : worst)).pricePerSqm;
  }

  // Named surcharges, not a difficulty flag - a business that never listed a condition simply does
  // not charge extra for it, which is not a reason to drop them.
  let conditionPerSqm = 0;
  let conditionPercent = 0;
  for (const wanted of brief.conditions) {
    const entry = pricing.siteConditions.find((row) => slug(row.condition) === slug(wanted));
    if (!entry) continue;
    conditionPerSqm += entry.extraPerSqm ?? 0;
    conditionPercent += entry.extraPercent ?? 0;
  }

  // Priced per wet area, so it is a fixed item however the tiling itself was priced.
  let waterproofing = 0;
  if (brief.waterproofing) {
    const entry = pricing.waterproofing.find((row) => slug(row.area) === brief.waterproofing);
    // Not blocking: a business that does not waterproof can still lay the tiles, and the customer
    // is told what is not included rather than hidden from a business that could do the rest.
    waterproofing = entry?.price ?? 0;
  }

  const perSqmExtras = removalPerSqm + tilePerSqm + conditionPerSqm;
  const byArea = rate.unit === 'per_sqm';

  const gstIncluded = pricing.gstIncluded === true;
  const { perUnit, total } = quoteTotal({
    rate: rate.price,
    perUnitExtras: byArea ? perSqmExtras : perSqmExtras * area,
    percentExtras: conditionPercent,
    quantity: byArea ? area : 1,
    fixedItems: waterproofing + (pricing.callOutFee ?? 0),
    minimumCharge: pricing.minimumCharge,
    gstIncluded,
  });

  const badges: string[] = [];
  badges.push(gstIncluded ? 'incl. GST' : 'incl. GST (added)');
  badges.push(business.distanceKm > 0 ? business.distanceKm + ' km away' : 'In your suburb');
  if (business.rating) badges.push(business.reviewCount ? business.rating + '★ (' + business.reviewCount + ')' : business.rating + '★');
  if (!byArea) badges.push('Fixed price for the job');
  if (removalPerSqm > 0) badges.push('Old tiles removed');
  if (tilePerSqm > 0) badges.push('Tiles supplied');
  if (brief.supply === 'labour_only') badges.push('You supply the tiles');
  if (waterproofing > 0) badges.push('Waterproofing included');
  else if (brief.waterproofing) badges.push('Waterproofing not included');
  if (conditionPerSqm > 0 || conditionPercent > 0) badges.push('Site conditions included');
  if (pricing.callOutFee) badges.push('Includes $' + pricing.callOutFee + ' inspection');
  if (business.isAutoAcceptEnabled) badges.push('Instant accept');

  return {
    rateKey,
    tileKey: rate.tileType ?? brief.tileType,
    /* Per square metre either way, so two businesses can be compared even when one published a
       package price and the other a rate. With no area given there is nothing to divide by, and a
       rate of zero is better than one invented from a quantity nobody stated. */
    ratePerUnit: byArea ? perUnit : area > 0 ? Math.round(total / area) : 0,
    total,
    badges,
  };
}
