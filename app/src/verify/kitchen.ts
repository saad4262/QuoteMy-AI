import {
  KITCHEN_BENCHTOPS,
  KITCHEN_BOUNDS,
  KITCHEN_EXTRAS,
  KITCHEN_JOB_TYPES,
  KITCHEN_PREP,
  KITCHEN_REMOVES,
  KITCHEN_SIZES,
  KITCHEN_SUPPLY,
  KITCHEN_TAGS,
  UNITS,
  type KitchenBenchtop,
  type KitchenExtra,
  type KitchenJobType,
  type KitchenPrep,
  type KitchenRemoves,
  type KitchenSize,
  type KitchenSupply,
  type Trade,
  type Unit,
} from '../vocab.js';
import type { KitchenExtraction } from '../schemas.js';
import { slugify } from '../vocabulary.js';
import { makeChecks, MAX_ENTRIES, type VerifiedServiceArea } from './shared.js';

/**
 * Kitchen's shape, and the vocabulary gate that goes with it.
 *
 * What a kitchen price list IS, and where it differs from both the others: THERE IS NO RATE PER
 * UNIT. A fencer sells metres and a tiler sells square metres; a kitchen fitter sells one whole
 * kitchen at a price set by its size - "standard installation $2,850" - and then itemises
 * everything else. So a rate carries `per_job` or `per_item` and nothing else, and the quote uses
 * a quantity of one.
 *
 * Both keys on a rate are nullable, for the reason a tiling rate's `tileType` is: a list saying
 * only "kitchen installation $2,850" has named neither the job nor the size, and that is a general
 * rate covering all three, not a missing value.
 *
 * The quote and bounds gates are shared with every other trade and live in `shared.ts`.
 */

export type KitchenRateUnit = 'per_job' | 'per_item';
export type KitchenPrepUnit = 'per_job' | 'per_hour';

export interface KitchenRate {
  /** Null means "whatever size the kitchen is" - a named size beats it when quoting. */
  size: KitchenSize | null;
  /** Which item, on a per-item rate: "base cabinet", "wall cabinet". Null on a per-job one. */
  label: string | null;
  price: number;
  unit: KitchenRateUnit;
}

export interface KitchenVerifiedPricing {
  gstIncluded: boolean | null;
  /** Which of the two models they work under. Empty means they never said. */
  supplyModels: KitchenSupply[];
  /**
   * What they will actually quote, computed from what survived - never from what they claimed.
   * The field no other trade's shape has, which is what `isKitchenPricing` narrows on.
   */
  enabledKitchenSizes: KitchenSize[];
  /**
   * Keyed by job type, with `general` for a rate that named no job. A fitter almost always
   * publishes one installation price that covers new, replacement and install-only alike, so the
   * general bucket is the common case rather than the exception.
   */
  rates: Record<string, KitchenRate[]>;
  /** Cabinetry they SELL. Only ever their own published prices, never a figure off a website. */
  cabinetSupply: { label: string; price: number; unit: KitchenRateUnit }[];
  benchtops: { material: KitchenBenchtop; price: number }[];
  removals: { removes: KitchenRemoves; price: number }[];
  prep: { type: KitchenPrep; price: number; unit: KitchenPrepUnit }[];
  /** Most of a kitchen quote. `type` is null for a priced line the vocabulary has no home for. */
  extras: { type: KitchenExtra | null; label: string; price: number | null; unit: Unit | null; isFromPrice: boolean }[];
  serviceArea: VerifiedServiceArea;
  minimumCharge: number | null;
  siteMeasureFee: number | null;
  travelFee: number | null;
}

export interface KitchenVerifiedCapabilities {
  businessName: string | null;
  /** No years demanded - and less so here than anywhere: a warranty on a cabinet the customer
      bought themselves is not the fitter's to give, and pressing for a period invites a wrong one. */
  warranty: { text: string | null };
  tags: string[];
  inclusions: string[];
  exclusions: string[];
}

export interface KitchenVerifiedOffering {
  slug: string;
  label: string;
  price: number | null;
  unit: Unit | null;
}

export interface KitchenVerifiedResult {
  trade: Trade;
  status: 'verified' | 'unverified';
  pricing: KitchenVerifiedPricing;
  capabilities: KitchenVerifiedCapabilities;
  otherOfferings: KitchenVerifiedOffering[];
  couldNotUse: string[];
  ratesKept: number;
  coverage: Record<string, number>;
}

/** Where a rate that named no job type is filed. Not a `KitchenJobType`, deliberately. */
export const GENERAL_JOB = 'general';

/**
 * An installation price this low is a single cabinet on a line that says "kitchen".
 *
 * Not dropped - a fitter's cheapest real per-cabinet line is $165 and that is a legitimate rate -
 * but a per_job price under this is almost certainly a per_item one, and read as a whole kitchen it
 * quotes somebody a new kitchen for the price of one wall cupboard. Said out loud rather than
 * guessed at, the same treatment tiling gives a suspiciously high per-square-metre rate.
 */
const SUSPICIOUS_PER_JOB = 500;

export function verifyKitchen(
  x: KitchenExtraction,
  sourceText: string,
  trade: Trade,
  knownSlugs: readonly string[] = [],
): KitchenVerifiedResult {
  const unmapped = [...x.couldNotUse];
  const { quoted, num, str, take, strList } = makeChecks(sourceText, unmapped);

  // ---- core rates -> { jobType|general: [ { size, price, unit } ] } ----
  const rates: Record<string, KitchenRate[]> = {};
  let ratesKept = 0;

  for (const r of take(x.rates, MAX_ENTRIES)) {
    if (r.jobType !== null && !KITCHEN_JOB_TYPES.includes(r.jobType)) {
      unmapped.push(`Could not file a rate under "${r.jobType}" - that is not a job we hold, so it was not saved.`);
      continue;
    }
    if (r.size !== null && !KITCHEN_SIZES.includes(r.size)) {
      unmapped.push(`Could not file a rate for a "${r.size}" kitchen - that is not a size we hold, so it was not saved.`);
      continue;
    }
    if (!num(r.price, KITCHEN_BOUNDS.price.max)) {
      unmapped.push(`Dropped an installation rate - ${r.price} is outside the range we accept.`);
      continue;
    }
    if (!quoted(r.sourceQuote)) {
      unmapped.push('Dropped an installation rate - could not find that figure in your description.');
      continue;
    }

    const key = r.jobType ?? GENERAL_JOB;
    const rows = (rates[key] ??= []);
    const label = str(r.label);
    /* The label is part of what makes a per-item row unique, and leaving it out of this comparison
       was a real bug on a real submission: "base $180, wall $165, tall $280, drawer $190" collapsed
       into one rate priced four times, three prices dropped and the business told its own list
       contradicted itself. A per-job row has no label and is still keyed by its size alone. */
    const already = rows.find((row) => row.size === r.size && row.unit === r.unit && row.label === label);

    /* The same thing priced twice. Until tiling added this check the second silently overwrote the
       first and a customer was quoted whichever happened to be last in the document. */
    if (already && already.price !== r.price) {
      const named = label ?? (r.size ? `${r.size} kitchen` : 'kitchen installation');
      unmapped.push(
        `You have priced ${named} twice, at $${already.price} and $${r.price}. ` +
          `We kept $${already.price} - tell us which one is right.`,
      );
      continue;
    }
    if (already) continue;

    rows.push({ size: r.size, label, price: r.price, unit: r.unit });
    ratesKept += 1;

    if (r.unit === 'per_job' && r.price < SUSPICIOUS_PER_JOB) {
      unmapped.push(
        `Worth checking: ${r.size ? r.size + ' kitchen' : 'kitchen'} installation is $${r.price} for the whole job. ` +
          `That is low for a full kitchen - if it is a price per cabinet, tell us and we will fix it.`,
      );
    }
  }

  // ---- cabinetry they sell ----
  const cabinetSupply: KitchenVerifiedPricing['cabinetSupply'] = [];
  for (const c of take(x.cabinetSupply, 60)) {
    const label = str(c.label);
    if (!label) continue;
    if (!num(c.price, KITCHEN_BOUNDS.price.max) || !quoted(c.sourceQuote)) {
      unmapped.push(`Dropped the price for "${label}" - could not verify that figure against your description.`);
      continue;
    }
    cabinetSupply.push({ label, price: c.price, unit: c.unit });
  }

  // ---- benchtops ----
  const benchtops: KitchenVerifiedPricing['benchtops'] = [];
  for (const b of take(x.benchtops, 20)) {
    if (!KITCHEN_BENCHTOPS.includes(b.material)) continue;
    if (!num(b.price, KITCHEN_BOUNDS.price.max) || !quoted(b.sourceQuote)) {
      unmapped.push(`Dropped the ${b.material} benchtop price - could not verify it against your description.`);
      continue;
    }
    if (benchtops.some((row) => row.material === b.material)) continue;
    benchtops.push({ material: b.material, price: b.price });
  }

  // ---- removals ----
  const removals: KitchenVerifiedPricing['removals'] = [];
  for (const r of take(x.removals, 20)) {
    if (!KITCHEN_REMOVES.includes(r.removes)) continue;
    if (!num(r.price, KITCHEN_BOUNDS.price.max) || !quoted(r.sourceQuote)) {
      unmapped.push(`Dropped a removal price - could not verify ${r.price} against your description.`);
      continue;
    }
    if (removals.some((row) => row.removes === r.removes)) continue;
    removals.push({ removes: r.removes, price: r.price });
  }

  /* Taking a kitchen out almost never costs more than putting one in. When it does, the two
     figures have usually been read off the wrong lines - and that error reaches a customer as a
     real quote. Same check both other trades run against removal versus install. */
  const cheapestInstall = Math.min(
    ...Object.values(rates).flatMap((rows) => rows.filter((row) => row.unit === 'per_job').map((row) => row.price)),
    Number.POSITIVE_INFINITY,
  );
  for (const r of removals) {
    if (Number.isFinite(cheapestInstall) && r.price > cheapestInstall) {
      unmapped.push(
        `Worth checking: removal of ${r.removes} is $${r.price}, more than your cheapest installation ` +
          `at $${cheapestInstall}. We saved both as written.`,
      );
    }
  }

  // ---- preparation ----
  const prep: KitchenVerifiedPricing['prep'] = [];
  for (const p of take(x.prep, 30)) {
    if (!KITCHEN_PREP.includes(p.type)) continue;
    if (!num(p.price, KITCHEN_BOUNDS.price.max) || !quoted(p.sourceQuote)) {
      unmapped.push(`Dropped a ${p.type} price - could not verify ${p.price} against your description.`);
      continue;
    }
    if (prep.some((row) => row.type === p.type)) continue;
    prep.push({ type: p.type, price: p.price, unit: p.unit });
  }

  /* ---- the extras, which in this trade are most of the quote ----
     A higher cap than the other trades give their extras, and deliberately: a real kitchen list
     runs to forty priced lines - islands, pantries, cut-outs, handles, adjustments, accessories -
     and capping at the other trades' 40 would silently drop the tail of a complete submission. */
  const extras: KitchenVerifiedPricing['extras'] = [];
  for (const e of take(x.extras, 80)) {
    const label = str(e.label);
    if (!label) continue;
    const ok = num(e.price, KITCHEN_BOUNDS.price.max) && quoted(e.sourceQuote);
    extras.push({
      type: e.type && KITCHEN_EXTRAS.includes(e.type) ? e.type : null,
      label,
      price: ok ? (e.price as number) : null,
      unit: e.unit && UNITS.includes(e.unit) ? e.unit : null,
      isFromPrice: e.isFromPrice === true,
    });
    if (e.price != null && !ok) {
      unmapped.push(`Kept "${label}" but not its price - could not verify that figure against your description.`);
    }
  }

  // ---- service area ----
  const sa = x.serviceArea;
  const radiusKm = num(sa.radiusKm, KITCHEN_BOUNDS.radiusKm.max) ? sa.radiusKm : null;
  if (sa.radiusKm != null && radiusKm === null) {
    unmapped.push(`Dropped the travel radius - ${sa.radiusKm}km is outside the range we accept.`);
  }

  // ---- GST ----
  let gstIncluded = typeof x.gstIncluded === 'boolean' ? x.gstIncluded : null;
  if (gstIncluded !== null && x.gstSourceQuote && !quoted(x.gstSourceQuote)) {
    unmapped.push('Could not confirm the GST wording against your description, so it was left unset.');
    gstIncluded = null;
  }

  // ---- the three fees ----
  const fee = (value: number | null, sourceQuote: string | null, name: string): number | null => {
    if (value == null) return null;
    if (!num(value, KITCHEN_BOUNDS.price.max)) {
      unmapped.push(`Dropped the ${name} - ${value} is outside the range we accept.`);
      return null;
    }
    if (!quoted(sourceQuote)) {
      unmapped.push(`Dropped the ${name} - could not find that figure in your description.`);
      return null;
    }
    return value;
  };

  const minimumCharge = fee(x.minimumCharge, x.minimumChargeSourceQuote, 'minimum charge');
  const siteMeasureFee = fee(x.siteMeasureFee, x.siteMeasureFeeSourceQuote, 'site measure fee');
  const travelFee = fee(x.travelFee, x.travelFeeSourceQuote, 'travel charge');

  /* Which sizes can actually be quoted, from what survived. A general rate covers all three, which
     is why this is not simply the set of sizes that were named: a fitter with one installation
     price quotes every customer, and listing no sizes would hide them from all of them. */
  const named = new Set<KitchenSize>();
  let hasGeneral = false;
  for (const rows of Object.values(rates)) {
    for (const row of rows) {
      if (row.unit !== 'per_job') continue;
      if (row.size) named.add(row.size);
      else hasGeneral = true;
    }
  }
  const enabledKitchenSizes = hasGeneral ? [...KITCHEN_SIZES] : [...named];

  // A price list with no surviving core rate is not something to mark verified, even though the
  // review step approved it - it would show an empty pricing screen and quote nobody.
  const status = ratesKept > 0 ? 'verified' : 'unverified';
  if (ratesKept === 0) {
    unmapped.push('No usable rates could be read from your description - please restate your prices and send again.');
  }

  const pricing: KitchenVerifiedPricing = {
    gstIncluded,
    supplyModels: x.supplyModels.filter((m): m is KitchenSupply => (KITCHEN_SUPPLY as readonly string[]).includes(m)),
    enabledKitchenSizes,
    rates,
    cabinetSupply,
    benchtops,
    removals,
    prep,
    extras,
    serviceArea: {
      baseLocation: str(sa.baseLocation),
      resolved: null, // the pipeline fills this in; verification does no network calls
      radiusKm,
      excludedAreas: strList(sa.excludedAreas, 40),
    },
    minimumCharge,
    siteMeasureFee,
    travelFee,
  };

  const capabilities: KitchenVerifiedCapabilities = {
    businessName: str(x.businessName),
    warranty: { text: quoted(x.warranty?.sourceQuote) ? str(x.warranty?.text) : null },
    tags: x.tags.filter((t) => (KITCHEN_TAGS as readonly string[]).includes(t)),
    inclusions: strList(x.inclusions, 40),
    exclusions: strList(x.exclusions, 40),
  };

  // ---- the long tail ----
  // Same gates as a core rate. Looser about WHAT can be named, never about the numbers.
  const otherOfferings: KitchenVerifiedOffering[] = [];
  for (const o of take(x.otherOfferings, 40)) {
    const label = str(o.label);
    if (!label) continue;

    if (!quoted(o.sourceQuote)) {
      unmapped.push(`Could not find "${label}" in your description, so it was not saved.`);
      continue;
    }
    if (o.price != null && !num(o.price, KITCHEN_BOUNDS.price.max)) {
      unmapped.push(`Dropped the ${label} price - ${o.price} is outside the range we accept.`);
      continue;
    }

    // The model may only reuse a slug it was actually shown; anything else is built here from the
    // label, so a slug can never be something the model made up.
    const slug = o.slug && knownSlugs.includes(o.slug) ? o.slug : slugify(label);

    otherOfferings.push({
      slug,
      label,
      price: o.price ?? null,
      unit: o.unit && UNITS.includes(o.unit) ? o.unit : null,
    });
  }

  return {
    trade,
    status,
    pricing,
    capabilities,
    otherOfferings,
    couldNotUse: unmapped,
    ratesKept,
    coverage: {
      rates: ratesKept,
      cabinetSupply: cabinetSupply.length,
      benchtops: benchtops.length,
      removals: removals.length,
      prep: prep.length,
      extras: extras.length,
      tags: capabilities.tags.length,
      otherOfferings: otherOfferings.length,
      couldNotUse: unmapped.length,
    },
  };
}

/** Kept for symmetry with the other verifiers' exports; the job keys are not a closed list. */
export type { KitchenJobType };
