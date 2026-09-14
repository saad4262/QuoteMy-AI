import {
  RETAINING_WALL_BOUNDS,
  RW_CONDITIONS,
  RW_DRAINAGE,
  RW_EXTRAS,
  RW_GROUNDWORKS,
  RW_REMOVES,
  RW_SUPPLY,
  RW_TAGS,
  RW_WALL_TYPES,
  UNITS,
  type RwCondition,
  type RwDrainage,
  type RwExtra,
  type RwGroundworks,
  type RwRemoves,
  type RwSupply,
  type RwWallType,
  type Trade,
  type Unit,
} from '../vocab.js';
import type { RetainingWallExtraction } from '../schemas.js';
import { slugify } from '../vocabulary.js';
import { makeChecks, MAX_ENTRIES, type VerifiedServiceArea } from './shared.js';

/**
 * Retaining wall's shape, and the vocabulary gate that goes with it.
 *
 * What a retaining wall price list IS, and where it differs from the other three: it publishes the
 * SAME WALL TWICE, at two prices. A builder sells timber sleepers at $145 a metre with the
 * customer's own materials and $285 a metre with theirs, and the two are separate complete rates
 * rather than a labour rate with a material price added on top. Tiling's shape - one labour rate
 * plus a tile price per square metre - would add the sleepers to a rate that already contains them.
 *
 * So `supply` is the OUTER rate key here, not a flag, and a rate that has lost which column it came
 * from is worthless rather than merely incomplete: $185 a metre is a bargain with the sleepers
 * included and ordinary without, and nothing in the figure says which.
 *
 * `heightBand` is the nullable one, for the reason a tiling rate's `tileType` is: most lists do not
 * band by height at all, and "these rates cover every height we build" is a complete answer rather
 * than a missing value. A named band beats a null one at quoting time.
 *
 * The quote and bounds gates are shared with every other trade and live in `shared.ts`.
 */

export type RwRateUnit = 'per_metre' | 'per_item' | 'per_job';
export type RwGroundworksUnit = 'per_metre' | 'per_item' | 'per_job' | 'per_hour' | 'per_day';

export interface RwRate {
  wallType: RwWallType;
  /** Null means "whatever height they build at" - a named band beats it when quoting. */
  heightBand: string | null;
  pricePerMetre: number;
}

export interface RetainingWallVerifiedPricing {
  gstIncluded: boolean | null;
  /** Which of the two models they work under. Empty means they never said. */
  supplyModels: RwSupply[];
  /**
   * What they will actually build, computed from the rates that survived - never from what they
   * claimed. The field no other trade's shape has, which is what `isRetainingWallPricing` narrows
   * on. Named `enabledWallTypes` and NOT `enabledMaterials` deliberately: `isFencingPricing` keys
   * on that name, and a retaining wall document carrying it would be read back out of Firestore as
   * a fence and priced per metre of fencing.
   */
  enabledWallTypes: RwWallType[];
  /**
   * Keyed by supply model, because that is the outer question. A builder who only installs
   * customer-supplied materials has one bucket and that is a complete price list.
   */
  rates: Record<string, RwRate[]>;
  /** Structural rather than an upsell, which is why it is its own section and not an extra. */
  drainage: { type: RwDrainage; price: number; unit: RwRateUnit }[];
  removals: { removes: RwRemoves; price: number; unit: RwRateUnit }[];
  /**
   * Captured, shown to the customer as what is not included, and never multiplied by anything -
   * a customer cannot supply hours or count posts that have not been dug (`CLAUDE.md` #4).
   */
  groundworks: { type: RwGroundworks; price: number; unit: RwGroundworksUnit }[];
  siteConditions: { condition: RwCondition; price: number | null; percent: number | null; unit: RwGroundworksUnit | null }[];
  extras: { type: RwExtra | null; label: string; price: number | null; unit: Unit | null; isFromPrice: boolean }[];
  serviceArea: VerifiedServiceArea;
  minimumCharge: number | null;
  siteInspectionFee: number | null;
  travelFee: number | null;
}

export interface RetainingWallVerifiedCapabilities {
  businessName: string | null;
  /**
   * Where they stand on engineering and council approval - the section this trade has and no other
   * does. Recorded as what the BUSINESS said, never as a judgement about whether a given wall needs
   * it: the SOP is emphatic that nobody may tell a customer approval is unnecessary without
   * checking the particular project, and a stored boolean would become exactly that claim.
   */
  engineering: { text: string | null; price: number | null; isFromPrice: boolean };
  warranty: { text: string | null };
  tags: string[];
  inclusions: string[];
  exclusions: string[];
}

export interface RetainingWallVerifiedOffering {
  slug: string;
  label: string;
  price: number | null;
  unit: Unit | null;
}

export interface RetainingWallVerifiedResult {
  trade: Trade;
  status: 'verified' | 'unverified';
  pricing: RetainingWallVerifiedPricing;
  capabilities: RetainingWallVerifiedCapabilities;
  otherOfferings: RetainingWallVerifiedOffering[];
  couldNotUse: string[];
  ratesKept: number;
  coverage: Record<string, number>;
}

const RATE_UNITS: readonly RwRateUnit[] = ['per_metre', 'per_item', 'per_job'];
const GROUNDWORKS_UNITS: readonly RwGroundworksUnit[] = ['per_metre', 'per_item', 'per_job', 'per_hour', 'per_day'];

/** How a rate reads in a message to the business. Built here so every line says it the same way. */
const rateName = (wallType: string, band: string | null, supply: string) =>
  `${wallType}${band ? ` at ${band}` : ''} (${supply === 'supply_and_install' ? 'supply and install' : 'installation only'})`;

export function verifyRetainingWall(
  x: RetainingWallExtraction,
  sourceText: string,
  trade: Trade,
  knownSlugs: readonly string[] = [],
): RetainingWallVerifiedResult {
  const unmapped = [...x.couldNotUse];
  const { quoted, num, str, take, strList } = makeChecks(sourceText, unmapped);
  const B = RETAINING_WALL_BOUNDS;

  // ---- core rates -> { supply: [ { wallType, heightBand, pricePerMetre } ] } ----
  const rates: Record<string, RwRate[]> = {};
  let ratesKept = 0;
  for (const r of take(x.rates, MAX_ENTRIES)) {
    if (!RW_WALL_TYPES.includes(r.wallType)) {
      unmapped.push(
        `Could not file a rate under "${r.wallType}" - that is not a wall system we hold, so it was not saved.`,
      );
      continue;
    }
    /* The one gate with no equivalent in the other trades. A rate whose supply model was not
       stated cannot be repaired by guessing: picking `labour_only` under-quotes the customer by
       the whole cost of the materials, and picking the other over-quotes the builder out of the
       job. Both are worse than telling the business to say which. */
    if (!RW_SUPPLY.includes(r.supply)) {
      unmapped.push(
        `Dropped a ${r.wallType} rate - we could not tell whether $${r.pricePerMetre} per metre includes the ` +
          `materials or is installation only. Please list your two rates separately.`,
      );
      continue;
    }

    // Null is legitimate here - one rate covering every height. A NUMBER outside the bounds is not.
    let band: string | null = null;
    if (r.heightM != null) {
      if (!num(r.heightM, B.heightM.max) || r.heightM < B.heightM.min) {
        unmapped.push(`Dropped a ${r.wallType} rate - ${r.heightM}m is not a wall height we can store.`);
        continue;
      }
      // Key built by code from the number, never taken from model text, so it cannot drift.
      band = `${r.heightM}m`;
    }

    if (!num(r.pricePerMetre, B.pricePerMetre.max)) {
      unmapped.push(
        `Dropped the ${rateName(r.wallType, band, r.supply)} rate - ${r.pricePerMetre} per metre is outside ` +
          `the range we accept.`,
      );
      continue;
    }
    if (!quoted(r.sourceQuote)) {
      unmapped.push(
        `Dropped the ${rateName(r.wallType, band, r.supply)} rate - could not find that figure in your description.`,
      );
      continue;
    }

    const bucket = (rates[r.supply] ??= []);
    const already = bucket.find((e) => e.wallType === r.wallType && e.heightBand === band);

    // The same wall at the same height under the same model, priced twice. Left unchecked the
    // second silently overwrites the first and a customer is quoted whichever came last.
    if (already) {
      if (already.pricePerMetre !== r.pricePerMetre) {
        unmapped.push(
          `You have priced ${rateName(r.wallType, band, r.supply)} twice, at $${already.pricePerMetre} and ` +
            `$${r.pricePerMetre} per metre. We kept $${already.pricePerMetre} - tell us which one is right.`,
        );
      }
      continue;
    }

    bucket.push({ wallType: r.wallType, heightBand: band, pricePerMetre: r.pricePerMetre });
    ratesKept += 1;
  }

  /* The two columns, checked against each other - this trade's version of fencing's "a taller
     fence that costs less". Supplying the sleepers cannot be cheaper than not supplying them, so
     when it is, the two columns have almost always been read off the wrong headings. Not dropped,
     because a builder may genuinely have a clearance price, but never stored in silence: swapped
     columns reach a customer as a real quote that is $140 a metre wrong. */
  for (const withMaterials of rates['supply_and_install'] ?? []) {
    const withoutMaterials = (rates['labour_only'] ?? []).find(
      (e) => e.wallType === withMaterials.wallType && e.heightBand === withMaterials.heightBand,
    );
    if (withoutMaterials && withMaterials.pricePerMetre < withoutMaterials.pricePerMetre) {
      unmapped.push(
        `Worth checking: your ${withMaterials.wallType} is $${withMaterials.pricePerMetre} per metre with the ` +
          `materials supplied but $${withoutMaterials.pricePerMetre} per metre without them - supplying costs less. ` +
          `We saved both as written.`,
      );
    }
  }

  // A taller wall that costs less than a shorter one of the same system, same check as fencing's.
  for (const [supply, bucket] of Object.entries(rates)) {
    const banded = bucket.filter((e) => e.heightBand !== null);
    for (const wallType of new Set(banded.map((e) => e.wallType))) {
      const byHeight = banded
        .filter((e) => e.wallType === wallType)
        .map((e) => ({ height: Number.parseFloat(e.heightBand!), band: e.heightBand!, price: e.pricePerMetre }))
        .sort((a, b) => a.height - b.height);

      for (let i = 1; i < byHeight.length; i += 1) {
        const taller = byHeight[i]!;
        const shorter = byHeight[i - 1]!;
        if (taller.price < shorter.price) {
          unmapped.push(
            `Worth checking: your ${rateName(wallType, taller.band, supply)} is $${taller.price} per metre but ` +
              `${shorter.band} is $${shorter.price} - the taller one costs less. We saved both as written.`,
          );
        }
      }
    }
  }

  // ---- drainage ----
  const drainage: RetainingWallVerifiedPricing['drainage'] = [];
  for (const d of take(x.drainage, 20)) {
    if (!RW_DRAINAGE.includes(d.type)) {
      unmapped.push(`Could not file a drainage price under "${d.type}" - not something we hold.`);
      continue;
    }
    if (!num(d.price, B.price.max) || !quoted(d.sourceQuote)) {
      unmapped.push(`Dropped a drainage price - could not verify ${d.price} against your description.`);
      continue;
    }
    if (!RATE_UNITS.includes(d.unit)) continue;
    drainage.push({ type: d.type, price: d.price, unit: d.unit });
  }

  // ---- removals ----
  const removals: RetainingWallVerifiedPricing['removals'] = [];
  for (const r of take(x.removals, 20)) {
    if (!RW_REMOVES.includes(r.removes)) continue;
    if (!num(r.price, B.price.max) || !quoted(r.sourceQuote)) {
      unmapped.push(`Dropped a removal price - could not verify ${r.price} against your description.`);
      continue;
    }
    if (!RATE_UNITS.includes(r.unit)) continue;
    removals.push({ removes: r.removes, price: r.price, unit: r.unit });
  }

  /* Taking a wall down almost never costs more than building one, and when the figures say it does
     the two have usually been read off adjacent lines. Only per-metre removals are compared -
     a per-post removal and a per-metre build are different quantities and the comparison would be
     meaningless. */
  const cheapestBuild = Math.min(
    ...Object.values(rates).flatMap((bucket) => bucket.map((e) => e.pricePerMetre)),
    Number.POSITIVE_INFINITY,
  );
  for (const r of removals) {
    if (r.unit === 'per_metre' && Number.isFinite(cheapestBuild) && r.price > cheapestBuild) {
      unmapped.push(
        `Worth checking: removal is $${r.price} per metre, more than your cheapest wall at $${cheapestBuild} ` +
          `per metre. We saved both as written.`,
      );
    }
  }

  // ---- groundworks ----
  const groundworks: RetainingWallVerifiedPricing['groundworks'] = [];
  for (const g of take(x.groundworks, 30)) {
    if (!RW_GROUNDWORKS.includes(g.type)) continue;
    if (!num(g.price, B.price.max) || !quoted(g.sourceQuote)) {
      unmapped.push(`Dropped a ${g.type} price - could not verify ${g.price} against your description.`);
      continue;
    }
    if (!GROUNDWORKS_UNITS.includes(g.unit)) continue;
    groundworks.push({ type: g.type, price: g.price, unit: g.unit });
  }

  // ---- site condition surcharges ----
  const siteConditions: RetainingWallVerifiedPricing['siteConditions'] = [];
  for (const s of take(x.siteConditions, 20)) {
    if (!RW_CONDITIONS.includes(s.condition)) continue;

    const price = num(s.price, B.price.max) ? s.price : null;
    // A surcharge over 100% is a misread, not a business decision.
    const percent = num(s.percent, 100) ? s.percent : null;

    if ((price === null && percent === null) || !quoted(s.sourceQuote)) {
      unmapped.push(`Dropped the ${s.condition} surcharge - could not verify it against your description.`);
      continue;
    }
    // Both would be ambiguous: a quote cannot add $450 AND 10%. Keep the stated one.
    const entry = {
      condition: s.condition,
      price,
      percent: price === null ? percent : null,
      unit: price !== null && s.unit && GROUNDWORKS_UNITS.includes(s.unit) ? s.unit : null,
    };

    const already = siteConditions.find((c) => c.condition === s.condition);
    if (already) {
      const show = (c: typeof entry) => (c.price !== null ? `$${c.price}` : `${c.percent}%`);
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
  const extras: RetainingWallVerifiedPricing['extras'] = [];
  for (const e of take(x.extras, 40)) {
    const label = str(e.label);
    if (!label) continue;
    const ok = num(e.price, B.price.max) && quoted(e.sourceQuote);
    extras.push({
      type: e.type && RW_EXTRAS.includes(e.type) ? e.type : null,
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
  const radiusKm = num(sa.radiusKm, B.radiusKm.max) ? sa.radiusKm : null;
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
    if (!num(value, B.price.max)) {
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
  const siteInspectionFee = fee(x.siteInspectionFee, x.siteInspectionFeeSourceQuote, 'site inspection fee');
  const travelFee = fee(x.travelFee, x.travelFeeSourceQuote, 'travel fee');

  /* A price list with no surviving core rate is not something to mark verified, even though the
     review step approved it - it would show an empty pricing screen and quote nobody. */
  const status = ratesKept > 0 ? 'verified' : 'unverified';
  if (ratesKept === 0) {
    unmapped.push('No usable rates could be read from your description - please restate your prices and send again.');
  }

  /* Computed from what SURVIVED, never from what the business claimed. A builder who says they
     supply and install, and whose supply-and-install rates all failed the quote gate, does not
     supply and install as far as a customer's quote is concerned. */
  const supplyModels = RW_SUPPLY.filter((s) => (rates[s]?.length ?? 0) > 0);
  const claimed = x.supplyModels.filter((s) => RW_SUPPLY.includes(s));
  for (const s of claimed) {
    if (!supplyModels.includes(s)) {
      unmapped.push(
        s === 'supply_and_install'
          ? 'You say you supply the materials, but we could not read a supply-and-install rate per metre. Add one and we can quote that half of your work.'
          : 'You say you install customer-supplied materials, but we could not read an installation-only rate per metre. Add one and we can quote that half of your work.',
      );
    }
  }

  const pricing: RetainingWallVerifiedPricing = {
    gstIncluded,
    supplyModels,
    enabledWallTypes: [...new Set(Object.values(rates).flatMap((bucket) => bucket.map((e) => e.wallType)))],
    rates,
    drainage,
    removals,
    groundworks,
    siteConditions,
    extras,
    serviceArea: {
      baseLocation: str(sa.baseLocation),
      resolved: null, // the pipeline fills this in; verification does no network calls
      radiusKm,
      excludedAreas: strList(sa.excludedAreas, 40),
    },
    minimumCharge,
    siteInspectionFee,
    travelFee,
  };

  const eng = x.engineering;
  const capabilities: RetainingWallVerifiedCapabilities = {
    businessName: str(x.businessName),
    engineering: {
      text: quoted(eng?.sourceQuote) ? str(eng?.text) : null,
      price: num(eng?.price, B.price.max) && quoted(eng?.sourceQuote) ? eng.price : null,
      isFromPrice: eng?.isFromPrice === true,
    },
    warranty: { text: quoted(x.warranty?.sourceQuote) ? str(x.warranty?.text) : null },
    tags: x.tags.filter((t) => (RW_TAGS as readonly string[]).includes(t)),
    inclusions: strList(x.inclusions, 40),
    exclusions: strList(x.exclusions, 40),
  };

  // ---- the long tail ------------------------------------------------------------------------
  // Same gates as a core rate. The tier is looser about WHAT can be named, never about the numbers
  // attached to it - an unverifiable price here would reach a customer exactly like any other.
  const otherOfferings: RetainingWallVerifiedOffering[] = [];
  for (const o of take(x.otherOfferings, 40)) {
    const label = str(o.label);
    if (!label) continue;

    if (!quoted(o.sourceQuote)) {
      unmapped.push(`Could not find "${label}" in your description, so it was not saved.`);
      continue;
    }
    if (o.price != null && !num(o.price, B.price.max)) {
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
      supplyModels: supplyModels.length,
      drainage: drainage.length,
      removals: removals.length,
      groundworks: groundworks.length,
      siteConditions: siteConditions.length,
      extras: extras.length,
      tags: capabilities.tags.length,
      otherOfferings: otherOfferings.length,
      couldNotUse: unmapped.length,
    },
  };
}
