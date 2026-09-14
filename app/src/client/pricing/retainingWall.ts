import type { MatchedBusiness } from '../matcher.js';
import { slug } from '../fuzzyMatch.js';
import type { RwRate, RetainingWallVerifiedPricing } from '../../verify/index.js';
import { quoteTotal } from './total.js';

/**
 * One business, one retaining wall.
 *
 * The sum is the same as every other trade's (`total.ts`) and the quantity is linear metres, as
 * fencing's is. What is particular here is the LOOKUP, and it is why this trade has a module at all
 * rather than being priced inline the way fencing is.
 *
 * A fencing rate is found by two answers in a nested map. A retaining wall rate is found by three:
 * which supply model, which wall system, and - only sometimes - which height band. The third is
 * nullable on the row, because most builders publish one rate per system covering every height they
 * build, so the search has to prefer a banded row and fall back to the general one. That is the
 * same prefer-then-fall-back shape tiling uses for a named tile and kitchen for a named size; it
 * simply cannot be expressed as two keys in `TRADE_PRICING.rateKeys`.
 *
 * The supply model is NOT a branch that adds a material price on top, the way tiling's is. It
 * selects a different rate table. Reading it the tiling way would add the sleepers to a rate that
 * already contains them.
 */

export interface RetainingWallBrief {
  wallType: string;
  /** Which rate table to read. `supply_and_install` is the builder's own materials-included rate. */
  supply: string;
  heightKey: string | null;
  lengthMeters: number;
  /** What is coming out, or null when there is nothing. `any` means "they did not say what". */
  removal: string | null;
  /** What drainage they want, or null when they said none. `full_package` is the common answer. */
  drainage: string | null;
  conditions: string[];
}

export type RetainingWallBlocked = 'wallType' | 'supply' | 'removal';

export interface RetainingWallQuote {
  rateKey: string;
  wallTypeKey: string;
  /** The all-in price per linear metre, for showing beside the total and for ranking ties. */
  ratePerUnit: number;
  total: number;
  badges: string[];
}

/**
 * The rate this business publishes for this wall, preferring one written for this exact height.
 *
 * A builder who bands their rates has told us more than one who published a single figure, so a row
 * naming the customer's height wins and the unbanded row is the fallback rather than the answer.
 *
 * When neither exists but the builder bands SOME heights, the DEAREST band is used rather than the
 * nearest. A customer asking for 1.5m from a list that stops at 1.2m is asking for more wall than
 * anything published, and the one number nobody may be shown is a total below what they will
 * actually be charged - the same rule that makes tiling and kitchen take the dearest when the
 * customer has not chosen.
 */
function findRate(rows: RwRate[], wallType: string, heightKey: string | null): RwRate | undefined {
  const forType = rows.filter((row) => slug(row.wallType) === slug(wallType));
  if (!forType.length) return undefined;

  if (heightKey) {
    const banded = forType.find((row) => row.heightBand && slug(row.heightBand) === slug(heightKey));
    if (banded) return banded;
  }

  const general = forType.find((row) => !row.heightBand);
  if (general) return general;

  return forType.reduce((worst, row) => (row.pricePerMetre > worst.pricePerMetre ? row : worst));
}

export function quoteRetainingWall(
  business: MatchedBusiness,
  pricing: RetainingWallVerifiedPricing,
  brief: RetainingWallBrief,
): RetainingWallQuote | { blocked: RetainingWallBlocked } {
  /* Two separate failures, and telling them apart is the whole reason this returns a reason rather
     than nothing. A builder who does not build concrete sleeper walls at all is a different message
     from one who builds them but only with the customer's own materials - the first customer is
     offered another wall, the second is offered the other supply model, and answering either with
     the other's sentence sends them to change something that was never the problem. */
  const table = pricing.rates[brief.supply] ?? [];
  if (!table.length) return { blocked: 'supply' };

  const rate = findRate(table, brief.wallType, brief.heightKey);
  if (!rate) return { blocked: 'wallType' };

  /* Taking the old wall out. Per metre against the length of the wall, or as one fixed item where
     the builder prices it per post or per job - the unit on the row decides which, and a per-post
     removal cannot be multiplied by anything because nobody has counted the posts.
     The dearest published when the customer only said "yes", for the reason every trade does it. */
  let removalPerMetre = 0;
  let removalFixed = 0;
  if (brief.removal) {
    const published =
      pricing.removals.find((row) => slug(row.removes) === slug(brief.removal)) ??
      pricing.removals.find((row) => slug(row.removes) === 'any');
    const dearest =
      slug(brief.removal) === 'any' && pricing.removals.length
        ? pricing.removals.reduce((worst, row) => (row.price > worst.price ? row : worst))
        : undefined;
    const entry = published ?? dearest;
    // They cannot take the old wall out, so they cannot do this job.
    if (!entry) return { blocked: 'removal' };
    if (entry.unit === 'per_metre') removalPerMetre = entry.price;
    else removalFixed = entry.price;
  }

  /* Drainage. NOT blocking when the builder does not price it: a builder who installs the wall and
     leaves the drainage to the customer's own contractor is still doing the job, and hiding them
     would cost the customer somebody who could do the rest. They are told it is not included.
     `full_package` prefers a package row at one price and falls back to summing the per-metre
     components, because a builder publishes one or the other and almost never both. */
  let drainagePerMetre = 0;
  let drainageFixed = 0;
  let drainageQuoted = false;
  if (brief.drainage) {
    const named = pricing.drainage.find((row) => slug(row.type) === slug(brief.drainage));
    const pkg = pricing.drainage.find((row) => row.type === 'full_package');
    const wantsPackage = slug(brief.drainage) === 'full-package';
    const entry = named ?? (wantsPackage ? pkg : undefined);

    if (entry) {
      drainageQuoted = true;
      if (entry.unit === 'per_metre') drainagePerMetre = entry.price;
      else drainageFixed = entry.price;
    } else if (wantsPackage && pricing.drainage.length) {
      /* No package row, so the components they DO publish are what the drainage costs. Summed
         rather than picking the dearest, because these are not alternatives - ag-pipe, gravel and
         fabric all go into the same trench and a wall drained with one of the three is not drained.
         Only the per-metre components; an outlet priced each is a fixed item. */
      for (const row of pricing.drainage) {
        if (row.type === 'full_package') continue;
        drainageQuoted = true;
        if (row.unit === 'per_metre') drainagePerMetre += row.price;
        else drainageFixed += row.price;
      }
    }
  }

  /* Site conditions the customer named, as a surcharge each. A condition this builder does not
     charge for is silently skipped rather than blocking, exactly as fencing treats one. */
  let conditionsPerMetre = 0;
  let conditionsFixed = 0;
  let conditionsPercent = 0;
  const conditionsPriced: string[] = [];
  for (const wanted of brief.conditions) {
    const entry = pricing.siteConditions.find((row) => slug(row.condition) === slug(wanted));
    if (!entry) continue;
    if (entry.percent !== null) conditionsPercent += entry.percent;
    else if (entry.price !== null) {
      if (entry.unit === 'per_metre') conditionsPerMetre += entry.price;
      else conditionsFixed += entry.price;
    } else continue;
    conditionsPriced.push(wanted);
  }

  const gstIncluded = pricing.gstIncluded === true;
  const { perUnit, total } = quoteTotal({
    rate: rate.pricePerMetre,
    perUnitExtras: removalPerMetre + drainagePerMetre + conditionsPerMetre,
    percentExtras: conditionsPercent,
    quantity: brief.lengthMeters,
    fixedItems: removalFixed + drainageFixed + conditionsFixed + (pricing.siteInspectionFee ?? 0),
    minimumCharge: pricing.minimumCharge,
    gstIncluded,
  });

  const badges: string[] = [];
  badges.push(gstIncluded ? 'incl. GST' : 'incl. GST (added)');
  badges.push(business.distanceKm > 0 ? business.distanceKm + ' km away' : 'In your suburb');
  if (business.rating) badges.push(business.reviewCount ? business.rating + '★ (' + business.reviewCount + ')' : business.rating + '★');
  /* Said plainly and first among the job badges, because it is the difference between roughly $145
     and $285 a metre and it is the thing a customer comparing two builders most needs to see. */
  badges.push(brief.supply === 'supply_and_install' ? 'Materials supplied' : 'You supply the materials');
  if (rate.heightBand) badges.push('Rate for ' + rate.heightBand);
  if (removalPerMetre > 0 || removalFixed > 0) badges.push('Old wall removed');
  if (drainageQuoted) badges.push('Drainage included');
  else if (brief.drainage) badges.push('Drainage not included');
  if (conditionsPriced.length) badges.push(conditionsPriced.length + ' site charge' + (conditionsPriced.length > 1 ? 's' : '') + ' included');
  if (pricing.siteInspectionFee) badges.push('Includes $' + pricing.siteInspectionFee + ' site inspection');
  if (business.isAutoAcceptEnabled) badges.push('Instant accept');

  return {
    rateKey: brief.supply,
    wallTypeKey: rate.wallType,
    ratePerUnit: perUnit,
    total,
    badges,
  };
}
