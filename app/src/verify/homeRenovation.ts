import {
  HOME_RENOVATION_BOUNDS,
  RENO_CONDITIONS,
  RENO_EXTRAS,
  RENO_JOB_TYPES,
  RENO_REMOVES,
  RENO_ROOMS,
  RENO_SUPPLY,
  RENO_TAGS,
  UNITS,
  type RenoExtra,
  type RenoJobType,
  type RenoRemoves,
  type RenoRoom,
  type RenoSupply,
  type Trade,
  type Unit,
} from '../vocab.js';
import type { HomeRenovationExtraction } from '../schemas.js';
import { slugify } from '../vocabulary.js';
import { makeChecks, MAX_ENTRIES, type VerifiedServiceArea } from './shared.js';

/**
 * Home renovation's shape, and the vocabulary gate that goes with it.
 *
 * What a renovation price list IS: a CATALOGUE OF FLAT PRICES. A fencer sells metres and a tiler
 * sells square metres; a renovator sells a ROOM - "bathroom renovation labour $6,850" - and then
 * itemises everything else. So like kitchen there is no per-unit core rate, and the quote uses a
 * quantity of one.
 *
 * Where it differs from kitchen, and the reason this file is not a copy of that one: a renovator's
 * list also carries work sold by the square metre, work sold each, and work sold by the hour. All
 * three are real and all three are kept - in `surfaces`, `perItem` and `hourly`, which are separate
 * fields precisely so that none of them can be mistaken for a core rate and multiplied by a quantity
 * this conversation never asked for.
 *
 * The quote and bounds gates are shared with every other trade and live in `shared.ts`.
 */

export type RenoRateUnit = 'per_job' | 'per_sqm' | 'per_item';
export type RenoHourlyUnit = 'per_hour' | 'per_day';

export interface RenoRate {
  jobType: RenoJobType;
  /** Null means the price covers either supply model - a named one beats it when quoting. */
  supply: RenoSupply | null;
  price: number;
  unit: RenoRateUnit;
}

export interface HomeRenovationVerifiedPricing {
  gstIncluded: boolean | null;
  /** Which of the two models they work under. Empty means they never said. */
  supplyModels: RenoSupply[];
  /**
   * What they will actually quote, computed from what survived - never from what they claimed.
   * The field no other trade's shape has, which is what `isHomeRenovationPricing` narrows on.
   *
   * `enabledRooms` and NOT `enabledMaterials`, `enabledJobTypes` or any of the other four. A
   * renovation has job types exactly as tiling does, and reusing that name would make every
   * renovation document answer true to `isTilingPricing` and be priced per square metre.
   */
  enabledRooms: RenoRoom[];
  /** Keyed by room. A room with no price is not a key - there is no `general` bucket in this trade. */
  rates: Record<string, RenoRate[]>;
  /** Materials they SELL. Only ever their own published prices, never a figure off a website. */
  materialPackages: { label: string; price: number; unit: 'per_job' | 'per_item' }[];
  removals: { removes: RenoRemoves; price: number }[];
  /** Most of a renovation quote. `type` is null for a priced line the vocabulary has no home for. */
  extras: { type: RenoExtra | null; label: string; price: number | null; unit: Unit | null; isFromPrice: boolean }[];
  /** Work sold by the square metre. Kept and shown; never totalled - no area is ever asked for. */
  surfaces: { label: string; pricePerSqm: number }[];
  /** Work sold each. Kept and shown; never totalled - no count is ever asked for. */
  perItem: { label: string; price: number }[];
  /**
   * Work sold by time, and the one list in this file that may never reach a customer's total.
   *
   * Stored so the business's own screen is complete and so a customer can be told the work is
   * available. The hours are not knowable before somebody stands on the site, and this codebase has
   * already added "$180 per hour" to one total as though rocky ground were an hour's work.
   */
  hourly: { label: string; price: number; unit: RenoHourlyUnit }[];
  serviceArea: VerifiedServiceArea;
  minimumCharge: number | null;
  siteInspectionFee: number | null;
  consultationFee: number | null;
  travelFee: number | null;
}

export interface HomeRenovationVerifiedCapabilities {
  businessName: string | null;
  warranty: { text: string | null };
  tags: string[];
  inclusions: string[];
  /**
   * What the price does NOT cover, and the one capability field this trade treats as load-bearing.
   * Permits, engineering, electrical, plumbing, gas and asbestos are all normally excluded and all
   * expensive; a renovation quote silent about them is the one a customer reads as all-inclusive.
   */
  exclusions: string[];
}

export interface HomeRenovationVerifiedOffering {
  slug: string;
  label: string;
  price: number | null;
  unit: Unit | null;
}

export interface HomeRenovationVerifiedResult {
  trade: Trade;
  status: 'verified' | 'unverified';
  pricing: HomeRenovationVerifiedPricing;
  capabilities: HomeRenovationVerifiedCapabilities;
  otherOfferings: HomeRenovationVerifiedOffering[];
  couldNotUse: string[];
  ratesKept: number;
  coverage: Record<string, number>;
}

/**
 * A whole-room renovation price this low is a component price on a line that names a room.
 *
 * Not dropped - a renovator's cheapest real room is a $1,850 hallway and a repair can be less - but
 * a full_renovation under this is almost certainly a vanity, a door or a single fixture that has
 * been read as the whole room. Said out loud rather than guessed at, the same treatment kitchen
 * gives a suspiciously cheap installation and tiling a suspiciously dear square metre.
 */
const SUSPICIOUS_ROOM_PRICE = 800;

export function verifyHomeRenovation(
  x: HomeRenovationExtraction,
  sourceText: string,
  trade: Trade,
  knownSlugs: readonly string[] = [],
): HomeRenovationVerifiedResult {
  const unmapped = [...x.couldNotUse];
  const { quoted, num, str, take, strList } = makeChecks(sourceText, unmapped);

  // ---- core rates -> { room: [ { jobType, supply, price, unit } ] } ----
  const rates: Record<string, RenoRate[]> = {};
  let ratesKept = 0;

  for (const r of take(x.rates, MAX_ENTRIES)) {
    if (!RENO_ROOMS.includes(r.room)) {
      unmapped.push(`Could not file a rate for a "${r.room}" - that is not a room we hold, so it was not saved.`);
      continue;
    }
    if (!RENO_JOB_TYPES.includes(r.jobType)) {
      unmapped.push(`Could not file a rate under "${r.jobType}" - that is not a job we hold, so it was not saved.`);
      continue;
    }
    if (r.supply !== null && !RENO_SUPPLY.includes(r.supply)) {
      unmapped.push(`Could not file a rate under "${r.supply}" - that is not a supply model we hold.`);
      continue;
    }
    if (!num(r.price, HOME_RENOVATION_BOUNDS.price.max)) {
      unmapped.push(`Dropped a renovation rate - ${r.price} is outside the range we accept.`);
      continue;
    }
    if (!quoted(r.sourceQuote)) {
      unmapped.push('Dropped a renovation rate - could not find that figure in your description.');
      continue;
    }

    const rows = (rates[r.room] ??= []);
    const already = rows.find((row) => row.jobType === r.jobType && row.supply === r.supply && row.unit === r.unit);

    /* The same thing priced twice. Until tiling added this check the second silently overwrote the
       first and a customer was quoted whichever happened to be last in the document. */
    if (already && already.price !== r.price) {
      unmapped.push(
        `You have priced ${r.room.replace(/_/g, ' ')} (${r.jobType.replace(/_/g, ' ')}) twice, ` +
          `at $${already.price} and $${r.price}. We kept $${already.price} - tell us which one is right.`,
      );
      continue;
    }
    if (already) continue;

    rows.push({ jobType: r.jobType, supply: r.supply, price: r.price, unit: r.unit });
    ratesKept += 1;

    if (r.jobType === 'full_renovation' && r.unit === 'per_job' && r.price < SUSPICIOUS_ROOM_PRICE) {
      unmapped.push(
        `Worth checking: renovating a ${r.room.replace(/_/g, ' ')} is $${r.price} for the whole room. ` +
          `That is low for a full renovation - if it is the price of one fitting, tell us and we will fix it.`,
      );
    }
  }

  // ---- materials they sell ----
  const materialPackages: HomeRenovationVerifiedPricing['materialPackages'] = [];
  for (const m of take(x.materialPackages, 60)) {
    const label = str(m.label);
    if (!label) continue;
    if (!num(m.price, HOME_RENOVATION_BOUNDS.price.max) || !quoted(m.sourceQuote)) {
      unmapped.push(`Dropped the price for "${label}" - could not verify that figure against your description.`);
      continue;
    }
    materialPackages.push({ label, price: m.price, unit: m.unit });
  }

  // ---- removals ----
  const removals: HomeRenovationVerifiedPricing['removals'] = [];
  for (const r of take(x.removals, 20)) {
    if (!RENO_REMOVES.includes(r.removes)) continue;
    if (!num(r.price, HOME_RENOVATION_BOUNDS.price.max) || !quoted(r.sourceQuote)) {
      unmapped.push(`Dropped a strip-out price - could not verify ${r.price} against your description.`);
      continue;
    }
    if (removals.some((row) => row.removes === r.removes)) continue;
    removals.push({ removes: r.removes, price: r.price });
  }

  /* Stripping a room out almost never costs more than renovating that same room. When it does, the
     two figures have usually been read off the wrong lines - and that error reaches a customer as a
     real quote. The same check kitchen, tiling and retaining wall all run against removal versus
     install.
     COMPARED ROOM BY ROOM, unlike those three, and that is not a refinement for its own sake: this
     trade's removals name their own room, and measuring them all against the cheapest renovation
     anywhere flags a $4,250 full-interior demolition for costing more than an $1,850 hallway. It
     should. A `full_interior` or an `any` strip-out has no single room to be compared with and is
     left alone rather than measured against an arbitrary one. */
  const ROOM_FOR_REMOVAL: Partial<Record<RenoRemoves, RenoRoom>> = {
    bathroom_strip: 'bathroom',
    kitchen_strip: 'kitchen',
    laundry_strip: 'laundry',
  };

  /* ---- ONE LINE, TWO HOMES, RECONCILED IN CODE ----
     "Bathroom demolition $1,450" is a single line on a renovator's list that this product needs to
     see two ways: as a `demolition_only` RATE, for a customer who wants nothing but the room gutted,
     and as a REMOVAL, for a customer renovating the room who also needs the old one out.

     Asking the model to write it twice does not work, and five live runs of the same fixture are
     why this block exists rather than a sentence in the prompt. It read the line as a rate three
     times out of five (13 rates, 2 removals) and as a removal the other two (10 rates, 5 removals),
     and never once as both. That is not a cosmetic wobble: in the second reading the business
     cannot be asked for a strip-out-only job at all, so the SAME price list gave a customer a
     different answer depending on which way the extraction happened to fall.

     Neither reading is wrong, so neither is corrected - both are completed. Derived rather than
     demanded, which is the same principle as `CLAUDE.md` non-negotiable #4: where the answer
     follows from what is already there, code settles it and the model is not asked to. */
  for (const [removes, room] of Object.entries(ROOM_FOR_REMOVAL) as [RenoRemoves, RenoRoom][]) {
    const rows = rates[room];
    const asRate = rows?.find((r) => r.jobType === 'demolition_only' && r.unit === 'per_job');
    const asRemoval = removals.find((r) => r.removes === removes);

    // Read as a rate only: the removal list is missing a price it already holds.
    if (asRate && !asRemoval) removals.push({ removes, price: asRate.price });

    // Read as a removal only: the room cannot be quoted for a strip-out it plainly prices.
    if (asRemoval && !asRate && rows?.length) {
      rows.push({ jobType: 'demolition_only', supply: null, price: asRemoval.price, unit: 'per_job' });
      ratesKept += 1;
    }
  }
  for (const r of removals) {
    const room = ROOM_FOR_REMOVAL[r.removes];
    if (!room) continue;
    const renovation = (rates[room] ?? []).find((row) => row.jobType === 'full_renovation' && row.unit === 'per_job');
    if (renovation && r.price > renovation.price) {
      unmapped.push(
        `Worth checking: stripping out ${r.removes.replace(/_/g, ' ')} is $${r.price}, more than renovating the ` +
          `same room at $${renovation.price}. We saved both as written.`,
      );
    }
  }

  /* ---- the extras, which in this trade are most of the quote ----
     The same high cap kitchen takes, and for the same reason: a real renovation list runs to a
     hundred priced lines, and capping at the other trades' 40 would silently drop the tail of a
     complete submission. */
  const extras: HomeRenovationVerifiedPricing['extras'] = [];
  for (const e of take(x.extras, 80)) {
    const label = str(e.label);
    if (!label) continue;
    const ok = num(e.price, HOME_RENOVATION_BOUNDS.price.max) && quoted(e.sourceQuote);
    extras.push({
      type: e.type && RENO_EXTRAS.includes(e.type) ? e.type : null,
      label,
      price: ok ? (e.price as number) : null,
      unit: e.unit && UNITS.includes(e.unit) ? e.unit : null,
      isFromPrice: e.isFromPrice === true,
    });
    if (e.price != null && !ok) {
      unmapped.push(`Kept "${label}" but not its price - could not verify that figure against your description.`);
    }
  }

  // ---- work sold by the square metre ----
  const surfaces: HomeRenovationVerifiedPricing['surfaces'] = [];
  for (const s of take(x.surfaces, 40)) {
    const label = str(s.label);
    if (!label) continue;
    if (!num(s.pricePerSqm, HOME_RENOVATION_BOUNDS.pricePerSqm.max) || !quoted(s.sourceQuote)) {
      unmapped.push(`Dropped the per-square-metre price for "${label}" - could not verify it against your description.`);
      continue;
    }
    if (surfaces.some((row) => row.label.toLowerCase() === label.toLowerCase())) continue;
    surfaces.push({ label, pricePerSqm: s.pricePerSqm });
  }

  // ---- work sold each ----
  const perItem: HomeRenovationVerifiedPricing['perItem'] = [];
  for (const p of take(x.perItem, 40)) {
    const label = str(p.label);
    if (!label) continue;
    if (!num(p.price, HOME_RENOVATION_BOUNDS.price.max) || !quoted(p.sourceQuote)) {
      unmapped.push(`Dropped the each-price for "${label}" - could not verify it against your description.`);
      continue;
    }
    if (perItem.some((row) => row.label.toLowerCase() === label.toLowerCase())) continue;
    perItem.push({ label, price: p.price });
  }

  // ---- work sold by time ----
  const hourly: HomeRenovationVerifiedPricing['hourly'] = [];
  for (const h of take(x.hourly, 20)) {
    const label = str(h.label);
    if (!label) continue;
    if (!num(h.price, HOME_RENOVATION_BOUNDS.price.max) || !quoted(h.sourceQuote)) {
      unmapped.push(`Dropped the hourly rate for "${label}" - could not verify it against your description.`);
      continue;
    }
    if (hourly.some((row) => row.label.toLowerCase() === label.toLowerCase())) continue;
    hourly.push({ label, price: h.price, unit: h.unit });
  }

  // ---- service area ----
  const sa = x.serviceArea;
  const radiusKm = num(sa.radiusKm, HOME_RENOVATION_BOUNDS.radiusKm.max) ? sa.radiusKm : null;
  if (sa.radiusKm != null && radiusKm === null) {
    unmapped.push(`Dropped the travel radius - ${sa.radiusKm}km is outside the range we accept.`);
  }

  // ---- GST ----
  let gstIncluded = typeof x.gstIncluded === 'boolean' ? x.gstIncluded : null;
  if (gstIncluded !== null && x.gstSourceQuote && !quoted(x.gstSourceQuote)) {
    unmapped.push('Could not confirm the GST wording against your description, so it was left unset.');
    gstIncluded = null;
  }

  // ---- the four fees ----
  const fee = (value: number | null, sourceQuote: string | null, name: string): number | null => {
    if (value == null) return null;
    if (!num(value, HOME_RENOVATION_BOUNDS.price.max)) {
      unmapped.push(`Dropped the ${name} - ${value} is outside the range we accept.`);
      return null;
    }
    if (!quoted(sourceQuote)) {
      unmapped.push(`Dropped the ${name} - could not find that figure in your description.`);
      return null;
    }
    return value;
  };

  const minimumCharge = fee(x.minimumCharge, x.minimumChargeSourceQuote, 'minimum attendance');
  const siteInspectionFee = fee(x.siteInspectionFee, x.siteInspectionFeeSourceQuote, 'site inspection fee');
  const consultationFee = fee(x.consultationFee, x.consultationFeeSourceQuote, 'consultation fee');
  const travelFee = fee(x.travelFee, x.travelFeeSourceQuote, 'travel charge');

  /* Which rooms can actually be quoted, from what survived. Unlike kitchen there is no general
     bucket to fall back on: a renovator who never priced a laundry cannot quote one, and listing it
     would send them customers they have to turn away. */
  const enabledRooms = (Object.keys(rates) as RenoRoom[]).filter((room) =>
    rates[room]!.some((row) => row.unit === 'per_job'),
  );

  // A price list with no surviving core rate is not something to mark verified, even though the
  // review step approved it - it would show an empty pricing screen and quote nobody.
  const status = ratesKept > 0 ? 'verified' : 'unverified';
  if (ratesKept === 0) {
    unmapped.push('No usable rates could be read from your description - please restate your prices and send again.');
  }

  const pricing: HomeRenovationVerifiedPricing = {
    gstIncluded,
    supplyModels: x.supplyModels.filter((m): m is RenoSupply => (RENO_SUPPLY as readonly string[]).includes(m)),
    enabledRooms,
    rates,
    materialPackages,
    removals,
    extras,
    surfaces,
    perItem,
    hourly,
    serviceArea: {
      baseLocation: str(sa.baseLocation),
      resolved: null, // the pipeline fills this in; verification does no network calls
      radiusKm,
      excludedAreas: strList(sa.excludedAreas, 40),
    },
    minimumCharge,
    siteInspectionFee,
    consultationFee,
    travelFee,
  };

  const capabilities: HomeRenovationVerifiedCapabilities = {
    businessName: str(x.businessName),
    warranty: { text: quoted(x.warranty?.sourceQuote) ? str(x.warranty?.text) : null },
    tags: x.tags.filter((t) => (RENO_TAGS as readonly string[]).includes(t)),
    inclusions: strList(x.inclusions, 40),
    exclusions: strList(x.exclusions, 40),
  };

  // ---- the long tail ----
  // Same gates as a core rate. Looser about WHAT can be named, never about the numbers.
  const otherOfferings: HomeRenovationVerifiedOffering[] = [];
  for (const o of take(x.otherOfferings, 40)) {
    const label = str(o.label);
    if (!label) continue;

    if (!quoted(o.sourceQuote)) {
      unmapped.push(`Could not find "${label}" in your description, so it was not saved.`);
      continue;
    }
    if (o.price != null && !num(o.price, HOME_RENOVATION_BOUNDS.price.max)) {
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
      materialPackages: materialPackages.length,
      removals: removals.length,
      extras: extras.length,
      surfaces: surfaces.length,
      perItem: perItem.length,
      hourly: hourly.length,
      tags: capabilities.tags.length,
      otherOfferings: otherOfferings.length,
      couldNotUse: unmapped.length,
    },
  };
}

/** Kept for symmetry with the other verifiers' exports. */
export type { RenoRoom, RenoJobType };

/** Re-exported so a caller validating a customer's answer does not import from two places. */
export { RENO_CONDITIONS };
