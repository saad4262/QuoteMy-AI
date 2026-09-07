import {
  TILE_CONDITIONS,
  TILE_JOB_TYPES,
  TILE_PREP,
  TILE_REMOVES,
  TILE_SUPPLY,
  TILE_TAGS,
  TILE_TYPES,
  TILE_WATERPROOF,
  TILING_BOUNDS,
  UNITS,
  type TileCondition,
  type TileJobType,
  type TilePrep,
  type TileRemoves,
  type TileSupply,
  type TileType,
  type TileWaterproof,
  type Trade,
  type Unit,
} from '../vocab.js';
import type { TilingExtraction } from '../schemas.js';
import { slugify } from '../vocabulary.js';
import type { ResolvedLocation } from '../geocode.js';
import { makeChecks, MAX_ENTRIES, type VerifiedServiceArea } from './shared.js';

/**
 * Tiling's shape, and the vocabulary gate that goes with it.
 *
 * What a tiling price list IS, and where it differs from fencing: the same job is sold two ways.
 * "Standard floor tiling $65/m²" is priced by the area; "Complete bathroom package $4,850" is
 * priced once. Both are core rates. So a rate here carries its own `unit`, and the quote decides
 * the quantity from that rather than from the trade.
 *
 * `tileType` on a rate is nullable for the same reason a fencing gate's `material` is: "Standard
 * floor tiling" then "Porcelain floor tiling" is a general rate and a specific one, not two rates.
 *
 * The quote and bounds gates are shared with every other trade and live in `shared.ts`.
 */

export type TileRateUnit = 'per_sqm' | 'per_job';
export type TilePrepUnit = 'per_sqm' | 'per_job' | 'per_hour';

export interface TileRate {
  /** Null means "whatever tile they use" - a named type beats it when quoting. */
  tileType: TileType | null;
  price: number;
  unit: TileRateUnit;
}

export interface TilingVerifiedPricing {
  gstIncluded: boolean | null;
  /** Which of the two models they work under. Empty means they never said. */
  supplyModels: TileSupply[];
  /** What they will actually quote, computed from what survived - never from what they claimed. */
  enabledJobTypes: TileJobType[];
  rates: Record<string, TileRate[]>;
  /** Tiles they SELL. Only ever their own published prices, never a figure off a website. */
  tileSupply: { label: string; tileType: TileType | null; pricePerSqm: number }[];
  prep: { type: TilePrep; price: number; unit: TilePrepUnit }[];
  removals: { removes: TileRemoves; pricePerSqm: number }[];
  waterproofing: { area: TileWaterproof; price: number }[];
  siteConditions: { condition: TileCondition; extraPerSqm: number | null; extraPercent: number | null }[];
  serviceArea: VerifiedServiceArea;
  minimumCharge: number | null;
  callOutFee: number | null;
  travelFee: number | null;
}

export interface TilingVerifiedCapabilities {
  businessName: string | null;
  /** No years demanded. The SOP says a business must not invent a warranty period, and pressing
      for one would be asking them to break their own rule to satisfy ours. */
  warranty: { text: string | null };
  tags: string[];
  extras: { label: string; price: number | null; unit: Unit | null; isFromPrice: boolean }[];
  inclusions: string[];
  exclusions: string[];
}

export interface TilingVerifiedOffering {
  slug: string;
  label: string;
  price: number | null;
  unit: Unit | null;
}

export interface TilingVerifiedResult {
  trade: Trade;
  status: 'verified' | 'unverified';
  pricing: TilingVerifiedPricing;
  capabilities: TilingVerifiedCapabilities;
  otherOfferings: TilingVerifiedOffering[];
  couldNotUse: string[];
  ratesKept: number;
  coverage: Record<string, number>;
}

/**
 * A per-square-metre rate this high is almost always a room price on a line that says m².
 *
 * Not dropped - a complex feature mosaic genuinely runs to $155/m² and stone higher - but this
 * document type mixes the two units on the same page, so a misread is likely enough to say out
 * loud. Same treatment as fencing's "taller fence, lower price": kept as written, and flagged.
 */
const SUSPICIOUS_PER_SQM = 500;

export function verifyTiling(
  x: TilingExtraction,
  sourceText: string,
  trade: Trade,
  knownSlugs: readonly string[] = [],
): TilingVerifiedResult {
  const unmapped = [...x.couldNotUse];
  const { quoted, num, str, take, strList } = makeChecks(sourceText, unmapped);

  // ---- core rates -> { jobType: [ { tileType, price, unit } ] } ----
  const rates: Record<string, TileRate[]> = {};
  let ratesKept = 0;

  for (const r of take(x.rates, MAX_ENTRIES)) {
    if (!TILE_JOB_TYPES.includes(r.jobType)) {
      unmapped.push(`Could not file a rate under "${r.jobType}" - that is not a job we hold, so it was not saved.`);
      continue;
    }
    if (r.tileType !== null && !TILE_TYPES.includes(r.tileType)) {
      unmapped.push(`Could not file a rate for "${r.tileType}" - that is not a tile type we hold, so it was not saved.`);
      continue;
    }
    const ceiling = r.unit === 'per_sqm' ? TILING_BOUNDS.pricePerSqm.max : TILING_BOUNDS.price.max;
    if (!num(r.price, ceiling)) {
      unmapped.push(
        `Dropped the ${r.jobType} rate - ${r.price} ${r.unit === 'per_sqm' ? 'per square metre' : 'per job'} is outside the range we accept.`,
      );
      continue;
    }
    if (!quoted(r.sourceQuote)) {
      unmapped.push(`Dropped a ${r.jobType} rate - could not find that figure in your description.`);
      continue;
    }

    const rows = (rates[r.jobType] ??= []);
    const already = rows.find((row) => row.tileType === r.tileType);

    // The same job and tile priced twice. Until this check the second silently overwrote the first
    // and a customer was quoted whichever happened to be last in the document.
    if (already && already.price !== r.price) {
      const named = r.tileType ?? 'any tile';
      unmapped.push(
        `You have priced ${r.jobType} for ${named} twice, at $${already.price} and $${r.price}. ` +
          `We kept $${already.price} - tell us which one is right.`,
      );
      continue;
    }
    if (already) continue;

    rows.push({ tileType: r.tileType, price: r.price, unit: r.unit });
    ratesKept += 1;

    if (r.unit === 'per_sqm' && r.price > SUSPICIOUS_PER_SQM) {
      unmapped.push(
        `Worth checking: ${r.jobType}${r.tileType ? ' in ' + r.tileType : ''} is $${r.price} per square metre. ` +
          `That is high for a per-metre rate - if it is a price for the whole job, tell us and we will fix it.`,
      );
    }
  }

  // ---- tiles they sell ----
  const tileSupply: TilingVerifiedPricing['tileSupply'] = [];
  for (const t of take(x.tileSupply, 60)) {
    const label = str(t.label);
    if (!label) continue;
    if (!num(t.pricePerSqm, TILING_BOUNDS.pricePerSqm.max) || !quoted(t.sourceQuote)) {
      unmapped.push(`Dropped the price for "${label}" - could not verify that figure against your description.`);
      continue;
    }
    tileSupply.push({
      label,
      tileType: t.tileType && TILE_TYPES.includes(t.tileType) ? t.tileType : null,
      pricePerSqm: t.pricePerSqm,
    });
  }

  // ---- preparation ----
  const prep: TilingVerifiedPricing['prep'] = [];
  for (const p of take(x.prep, 30)) {
    if (!TILE_PREP.includes(p.type)) continue;
    const ceiling = p.unit === 'per_sqm' ? TILING_BOUNDS.pricePerSqm.max : TILING_BOUNDS.price.max;
    if (!num(p.price, ceiling) || !quoted(p.sourceQuote)) {
      unmapped.push(`Dropped a ${p.type} price - could not verify ${p.price} against your description.`);
      continue;
    }
    if (prep.some((row) => row.type === p.type)) continue;
    prep.push({ type: p.type, price: p.price, unit: p.unit });
  }

  // ---- removals ----
  const removals: TilingVerifiedPricing['removals'] = [];
  for (const r of take(x.removals, 20)) {
    if (!TILE_REMOVES.includes(r.removes)) continue;
    if (!num(r.pricePerSqm, TILING_BOUNDS.pricePerSqm.max) || !quoted(r.sourceQuote)) {
      unmapped.push(`Dropped a removal price - could not verify ${r.pricePerSqm} per square metre against your description.`);
      continue;
    }
    if (removals.some((row) => row.removes === r.removes)) continue;
    removals.push({ removes: r.removes, pricePerSqm: r.pricePerSqm });
  }

  /* Taking tiles up almost never costs more per square metre than laying them. When it does, the
     two rates have usually been read off the wrong lines - and that error reaches a customer as a
     real quote. Same check fencing runs against removal versus install. */
  const cheapestLay = Math.min(
    ...Object.values(rates).flatMap((rows) => rows.filter((row) => row.unit === 'per_sqm').map((row) => row.price)),
    Number.POSITIVE_INFINITY,
  );
  for (const r of removals) {
    if (Number.isFinite(cheapestLay) && r.pricePerSqm > cheapestLay) {
      unmapped.push(
        `Worth checking: removing ${r.removes} is $${r.pricePerSqm} per square metre, more than your cheapest ` +
          `tiling at $${cheapestLay} per square metre. We saved both as written.`,
      );
    }
  }

  // ---- waterproofing ----
  const waterproofing: TilingVerifiedPricing['waterproofing'] = [];
  for (const w of take(x.waterproofing, 20)) {
    if (!TILE_WATERPROOF.includes(w.area)) continue;
    if (!num(w.price, TILING_BOUNDS.price.max) || !quoted(w.sourceQuote)) {
      unmapped.push(`Dropped the ${w.area} waterproofing price - could not verify it against your description.`);
      continue;
    }
    if (waterproofing.some((row) => row.area === w.area)) continue;
    waterproofing.push({ area: w.area, price: w.price });
  }

  // ---- site condition surcharges ----
  const siteConditions: TilingVerifiedPricing['siteConditions'] = [];
  for (const s of take(x.siteConditions, 20)) {
    if (!TILE_CONDITIONS.includes(s.condition)) continue;

    const perSqm = num(s.extraPerSqm, TILING_BOUNDS.pricePerSqm.max) ? s.extraPerSqm : null;
    // A surcharge over 100% is a misread, not a business decision.
    const percent = num(s.extraPercent, 100) ? s.extraPercent : null;

    if ((perSqm === null && percent === null) || !quoted(s.sourceQuote)) {
      unmapped.push(`Dropped the ${s.condition} surcharge - could not verify it against your description.`);
      continue;
    }
    // Both would be ambiguous: a quote cannot add $14 AND 10%. Keep the stated one.
    const entry = { condition: s.condition, extraPerSqm: perSqm, extraPercent: perSqm === null ? percent : null };

    const already = siteConditions.find((c) => c.condition === s.condition);
    if (already) {
      const show = (c: typeof entry) => (c.extraPerSqm !== null ? `$${c.extraPerSqm} per square metre` : `${c.extraPercent}%`);
      if (show(already) !== show(entry)) {
        unmapped.push(
          `You have priced the ${s.condition} surcharge twice, as ${show(already)} and ${show(entry)}. ` +
            `We kept ${show(already)} - tell us which one is right.`,
        );
      }
      continue;
    }
    siteConditions.push(entry);
  }

  // ---- other priced add-ons ----
  const extras: TilingVerifiedCapabilities['extras'] = [];
  for (const e of take(x.extras, 40)) {
    const label = str(e.label);
    if (!label) continue;
    const ok = num(e.price, TILING_BOUNDS.price.max) && quoted(e.sourceQuote);
    extras.push({
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
  const radiusKm = num(sa.radiusKm, TILING_BOUNDS.radiusKm.max) ? sa.radiusKm : null;
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
    if (!num(value, TILING_BOUNDS.price.max)) {
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
  const callOutFee = fee(x.callOutFee, x.callOutFeeSourceQuote, 'call-out fee');
  const travelFee = fee(x.travelFee, x.travelFeeSourceQuote, 'travel charge');

  // A price list with no surviving core rate is not something to mark verified, even though the
  // review step approved it - it would show an empty pricing screen and quote nobody.
  const status = ratesKept > 0 ? 'verified' : 'unverified';
  if (ratesKept === 0) {
    unmapped.push('No usable rates could be read from your description - please restate your prices and send again.');
  }

  const pricing: TilingVerifiedPricing = {
    gstIncluded,
    supplyModels: x.supplyModels.filter((m): m is TileSupply => (TILE_SUPPLY as readonly string[]).includes(m)),
    enabledJobTypes: Object.keys(rates) as TileJobType[],
    rates,
    tileSupply,
    prep,
    removals,
    waterproofing,
    siteConditions,
    serviceArea: {
      baseLocation: str(sa.baseLocation),
      resolved: null, // the pipeline fills this in; verification does no network calls
      radiusKm,
      excludedAreas: strList(sa.excludedAreas, 40),
    },
    minimumCharge,
    callOutFee,
    travelFee,
  };

  const capabilities: TilingVerifiedCapabilities = {
    businessName: str(x.businessName),
    warranty: { text: quoted(x.warranty?.sourceQuote) ? str(x.warranty?.text) : null },
    tags: x.tags.filter((t) => (TILE_TAGS as readonly string[]).includes(t)),
    extras,
    inclusions: strList(x.inclusions, 40),
    exclusions: strList(x.exclusions, 40),
  };

  // ---- the long tail ----
  // Same gates as a core rate. Looser about WHAT can be named, never about the numbers.
  const otherOfferings: TilingVerifiedOffering[] = [];
  for (const o of take(x.otherOfferings, 40)) {
    const label = str(o.label);
    if (!label) continue;

    if (!quoted(o.sourceQuote)) {
      unmapped.push(`Could not find "${label}" in your description, so it was not saved.`);
      continue;
    }
    if (o.price != null && !num(o.price, TILING_BOUNDS.price.max)) {
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
      tileSupply: tileSupply.length,
      prep: prep.length,
      removals: removals.length,
      waterproofing: waterproofing.length,
      siteConditions: siteConditions.length,
      extras: extras.length,
      tags: capabilities.tags.length,
      otherOfferings: otherOfferings.length,
      couldNotUse: unmapped.length,
    },
  };
}
