import type { MatchedBusiness } from '../matcher.js';
import { slug } from '../fuzzyMatch.js';
import type { DeckRate, DeckingVerifiedPricing } from '../../verify/index.js';
import { quoteTotal } from './total.js';

/**
 * One business, one deck.
 *
 * The sum is the same as every other trade's (`total.ts`) and the quantity is square metres, as
 * tiling's is. What is particular here, and particular to this trade alone, is that a decking quote
 * multiplies THREE DIFFERENT QUANTITIES:
 *
 *   the deck        square metres of floor       x the board's rate
 *   the balustrade  linear metres along its edge x the balustrade's rate
 *   the stairs      flights                      x the price of a flight
 *
 * `quoteTotal` takes one quantity, so the second and third are multiplied out here and handed over
 * as `fixedItems`. That is not a workaround - it is the same thing `pricing/retainingWall.ts` does
 * for a per-post removal, and nothing is added to the shared formula.
 *
 * Getting it wrong has one obvious shape and it is expensive: a balustrade charged against the deck
 * AREA rather than its edge. Twelve metres of railing on a 40m² deck is 12 x the rate, not 40 x it,
 * and the wrong reading more than triples that line.
 */

export interface DeckingBrief {
  /** Which rate table to read - the coarser of the two keys. */
  deckHeight: string;
  material: string;
  areaSqm: number;
  /** Which balustrade they want, or null when they said none. */
  balustrade: string | null;
  /** How many metres of it. Only ever set when `balustrade` is. */
  balustradeLm: number;
  /** Which grade of stairs they want, or null when they said none. */
  stairs: string | null;
  /** How many flights. Only ever set when `stairs` is. */
  stairFlights: number;
  /** What is coming out, or null when there is nothing. `any` means "they did not say what". */
  removal: string | null;
  conditions: string[];
}

export type DeckingBlocked = 'material' | 'deckHeight' | 'removal';

export interface DeckingQuote {
  rateKey: string;
  materialKey: string;
  /** The all-in price per square metre of DECK, for showing beside the total and ranking ties. */
  ratePerUnit: number;
  total: number;
  badges: string[];
}

export function quoteDecking(
  business: MatchedBusiness,
  pricing: DeckingVerifiedPricing,
  brief: DeckingBrief,
): DeckingQuote | { blocked: DeckingBlocked } {
  /* Two separate failures, and telling them apart is why this returns a reason rather than nothing.
     A builder who does not build at that height at all is a different message from one who builds
     there but does not lay that board - the first customer is offered another height, the second
     another board, and answering either with the other's sentence sends them to change something
     that was never the problem. */
  const table = pricing.rates[brief.deckHeight] ?? [];
  if (!table.length) return { blocked: 'deckHeight' };

  const rate: DeckRate | undefined = table.find((row) => slug(row.material) === slug(brief.material));
  if (!rate) return { blocked: 'material' };

  /* Taking the old deck up. Per square metre against the deck's own area, or as one fixed item
     where the builder prices it as a job. The dearest published when the customer only said "yes",
     for the reason every trade does it: the one number nobody may be shown is a total below what
     they will actually be charged. */
  let removalPerSqm = 0;
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
    // They cannot take the old deck out, so they cannot do this job.
    if (!entry) return { blocked: 'removal' };
    if (entry.unit === 'per_sqm') removalPerSqm = entry.price;
    else removalFixed = entry.price;
  }

  /* THE BALUSTRADE, and the line this module exists for. Its rate is per LINEAR metre along the
     deck's edge, so it is multiplied by `balustradeLm` and handed over as a fixed item - never
     added to the per-square-metre rate, which would charge it against the deck's floor area.
     NOT blocking when the builder does not price one: a builder who lays the deck and leaves the
     railing to somebody else is still doing the job, and hiding them would cost the customer
     somebody who could do the rest. They are told it is not included. */
  let balustradeFixed = 0;
  let balustradeQuoted = false;
  if (brief.balustrade) {
    const entry = pricing.balustrades.find((row) => slug(row.type) === slug(brief.balustrade));
    if (entry) {
      balustradeQuoted = true;
      balustradeFixed = entry.unit === 'per_metre' ? entry.price * brief.balustradeLm : entry.price;
    }
  }

  /* THE STAIRS, the third quantity.
     ONLY `per_job` rows are eligible, and that filter is the whole of this block's judgement. A
     builder's stair section carries a flight at one price AND an add-on per step - "each additional
     step above five, $140" - and a reader that treats the cheapest row as a flight quotes a whole
     staircase at $140. That is the same shape of bug kitchen shipped once, where a $45 drawer
     adjustment was filed as an installation rate; here a golden conversation caught it.
     A step count is also something this conversation deliberately never asks for: almost nobody can
     say how many steps their deck needs before it is designed, and a guess produces a wrong price
     rather than a missing one. So a per-step row is stored, shown, and never quoted from.

     Between the flights that ARE eligible, the customer's own grade decides - and where the builder
     did not grade their rows, standard takes the cheapest and premium the dearest. */
  let stairsFixed = 0;
  let stairsQuoted = false;
  if (brief.stairs && brief.stairFlights > 0 && pricing.stairs.length) {
    /* A GRADED row is a flight; an ungraded one is the per-step add-on. The unit cannot be the test
       and this is why: the live model reads "standard timber flight up to 5 steps $950" as
       `per_item` - a price per flight - where the offline stand-in called it `per_job`. Both are
       defensible readings of the same line, and filtering on either one alone drops every real
       flight or lets the $140 add-on through. The grade is the field that actually says which is
       which, and it survives both readings.
       Only where nothing is graded at all does the unit decide, and then `per_job` is the safer
       half: a bare per-item stair row is far more likely to be a step than a staircase. */
    const graded = pricing.stairs.filter((row) => row.grade);
    const flights = graded.length ? graded : pricing.stairs.filter((row) => row.unit === 'per_job');
    const matching = flights.filter((row) => row.grade && slug(row.grade) === slug(brief.stairs));
    const from = matching.length ? matching : flights;
    if (from.length) {
      const wantsPremium = slug(brief.stairs) === 'premium';
      const chosen = from.reduce((best, row) =>
        wantsPremium ? (row.price > best.price ? row : best) : row.price < best.price ? row : best,
      );
      stairsQuoted = true;
      stairsFixed = chosen.price * brief.stairFlights;
    }
  }

  /* Site conditions the customer named. A condition this builder does not charge for is silently
     skipped rather than blocking, exactly as every other trade treats one.
     An HOURLY or DAILY surcharge may not enter the total - the same rule retaining wall learned the
     hard way. Nobody can say how many hours of rock there are until the ground is open, so it is
     named as not included rather than guessed at one hour. */
  let conditionsPerSqm = 0;
  let conditionsFixed = 0;
  let conditionsPercent = 0;
  const conditionsPriced: string[] = [];
  const conditionsOnSite: string[] = [];
  for (const wanted of brief.conditions) {
    const entry = pricing.siteConditions.find((row) => slug(row.condition) === slug(wanted));
    if (!entry) continue;
    if (entry.unit === 'per_hour' || entry.unit === 'per_day') {
      conditionsOnSite.push(wanted);
      continue;
    }
    if (entry.percent !== null) conditionsPercent += entry.percent;
    else if (entry.price !== null) {
      if (entry.unit === 'per_sqm') conditionsPerSqm += entry.price;
      else conditionsFixed += entry.price;
    } else continue;
    conditionsPriced.push(wanted);
  }

  const gstIncluded = pricing.gstIncluded === true;
  const { perUnit, total } = quoteTotal({
    rate: rate.pricePerSqm,
    perUnitExtras: removalPerSqm + conditionsPerSqm,
    percentExtras: conditionsPercent,
    quantity: brief.areaSqm,
    /* The balustrade and the stairs are already multiplied by their OWN quantities above. A
       percentage surcharge deliberately does not reach them: a loading for a sloping site applies
       to the work done across the deck, not to a railing priced by the metre. */
    fixedItems:
      removalFixed +
      balustradeFixed +
      stairsFixed +
      conditionsFixed +
      (pricing.siteInspectionFee ?? 0) +
      (pricing.designFee ?? 0),
    minimumCharge: pricing.minimumCharge,
    gstIncluded,
  });

  const badges: string[] = [];
  badges.push(gstIncluded ? 'incl. GST' : 'incl. GST (added)');
  badges.push(business.distanceKm > 0 ? business.distanceKm + ' km away' : 'In your suburb');
  if (business.rating) badges.push(business.reviewCount ? business.rating + '★ (' + business.reviewCount + ')' : business.rating + '★');
  if (removalPerSqm > 0 || removalFixed > 0) badges.push('Old deck removed');
  if (balustradeQuoted) badges.push(brief.balustradeLm + 'm of balustrade included');
  else if (brief.balustrade) badges.push('Balustrade not included');
  if (stairsQuoted) badges.push(brief.stairFlights > 1 ? brief.stairFlights + ' stair flights included' : 'Stairs included');
  else if (brief.stairs) badges.push('Stairs not included');
  if (conditionsPriced.length) badges.push(conditionsPriced.length + ' site charge' + (conditionsPriced.length > 1 ? 's' : '') + ' included');
  /* Said plainly, and said even though it makes this builder look dearer than one who never
     published a rock rate. A customer told "rock charged on site" can ask what it will cost; one
     shown a total with an hour of rock folded into it cannot. */
  if (conditionsOnSite.length) badges.push('Rock and difficult ground charged on site, not in this price');
  if (pricing.designFee) badges.push('Includes $' + pricing.designFee + ' design');
  if (pricing.siteInspectionFee) badges.push('Includes $' + pricing.siteInspectionFee + ' site inspection');
  if (business.isAutoAcceptEnabled) badges.push('Instant accept');

  return {
    rateKey: brief.deckHeight,
    materialKey: rate.material,
    ratePerUnit: perUnit,
    total,
    badges,
  };
}
