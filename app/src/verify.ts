import {
  BOUNDS,
  CONDITIONS,
  GATE_TYPES,
  MATERIALS,
  REMOVES,
  TAGS,
  UNITS,
  type Condition,
  type GateType,
  type Material,
  type Removes,
  type Trade,
  type Unit,
} from './vocab.js';
import type { Extraction } from './schemas.js';
import { slugify } from './vocabulary.js';
import type { ResolvedLocation } from './geocode.js';

/**
 * Ported from the n8n `Format Extraction` Code node, near-verbatim, because it was tested.
 *
 * Three gates, all of them still needed even with strict `json_schema`:
 *   1. vocabulary  — strict schema should make drift impossible; this is the belt to its braces,
 *                    because vocabulary drift is the one failure here that is silent and permanent
 *   2. quote match — every number must carry the exact sentence it came from, and that sentence
 *                    must really appear in the business's text. No match means it was invented
 *   3. bounds      — testing caught an $8500/m rate whose source sentence genuinely existed
 */

export interface VerifiedPricing {
  gstIncluded: boolean | null;
  enabledMaterials: Material[];
  rates: Record<string, Record<string, number>>;
  removals: { removes: Removes; pricePerMetre: number }[];
  gates: { gateType: GateType; material: Material | null; price: number; isFromPrice: boolean }[];
  siteConditions: { condition: Condition; extraPerMetre: number | null; extraPercent: number | null }[];
  serviceArea: {
    baseLocation: string | null;
    /** Filled in after verification by src/geocode.ts. Null when it could not be resolved. */
    resolved: ResolvedLocation | null;
    radiusKm: number | null;
    excludedAreas: string[];
  };
  minimumCharge: number | null;
}

export interface VerifiedSpec {
  material: Material;
  postSize: string | null;
  postSpacingM: number | null;
  postDepthMm: number | null;
  holeDiameterMm: number | null;
  footing: string | null;
  railCount: number | null;
  railSize: string | null;
  infill: string | null;
  cappingSize: string | null;
  cappingExtraPerMetre: number | null;
}

export interface VerifiedCapabilities {
  businessName: string | null;
  /** How they build it. Collected, never blocking - see the schema for why. */
  specs: VerifiedSpec[];
  permits: { included: boolean | null; fee: number | null };
  warranty: { years: number | null; text: string | null };
  tags: string[];
  extras: { label: string; price: number | null; unit: Unit | null; isFromPrice: boolean }[];
  inclusions: string[];
  exclusions: string[];
}

/**
 * The long tail: what this business sells that has no core value. Looser about vocabulary, never
 * about numbers - every price here passed the same source-quote and bounds checks as a core rate.
 */
export interface VerifiedOffering {
  slug: string;
  label: string;
  pricePerMetre: number | null;
  heightM: number | null;
  unit: Unit | null;
}

export interface VerifiedResult {
  trade: Trade;
  status: 'verified' | 'unverified';
  pricing: VerifiedPricing;
  capabilities: VerifiedCapabilities;
  otherOfferings: VerifiedOffering[];
  couldNotUse: string[];
  ratesKept: number;
  coverage: Record<string, number>;
}

const MAX_ENTRIES = 200;

export function verifyExtraction(
  x: Extraction,
  sourceText: string,
  trade: Trade,
  knownSlugs: readonly string[] = [],
): VerifiedResult {
  const rawText = sourceText.toLowerCase();
  const unmapped = [...x.couldNotUse];

  const quoted = (q: string | null | undefined) => {
    const s = String(q ?? '').trim();
    return s ? rawText.includes(s.toLowerCase()) : false;
  };
  const num = (n: unknown, max: number): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= max;
  const str = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim() : null);

  function take<T>(list: T[], cap: number): T[] {
    if (list.length > cap) {
      unmapped.push(
        `Only the first ${cap} entries were read from one section - your description may list more than we can store.`,
      );
    }
    return list.slice(0, cap);
  }

  // ---- core rates -> the nested { material: { "1.8m": price } } shape ----
  const rates: Record<string, Record<string, number>> = {};
  let ratesKept = 0;
  for (const r of take(x.rates, MAX_ENTRIES)) {
    if (!MATERIALS.includes(r.material)) {
      unmapped.push(`Could not file a rate under "${r.material}" - that is not a fence type we hold, so it was not saved.`);
      continue;
    }
    if (!num(r.heightM, BOUNDS.heightM.max) || r.heightM < BOUNDS.heightM.min) {
      unmapped.push(`Dropped a ${r.material} rate - ${r.heightM}m is not a height we can store.`);
      continue;
    }
    if (!num(r.pricePerMetre, BOUNDS.pricePerMetre.max)) {
      unmapped.push(
        `Dropped the ${r.material} ${r.heightM}m rate - ${r.pricePerMetre} per metre is outside the range we accept.`,
      );
      continue;
    }
    if (!quoted(r.sourceQuote)) {
      unmapped.push(`Dropped the ${r.material} ${r.heightM}m rate - could not find that figure in your description.`);
      continue;
    }
    // Key built by code from the number, never taken from model text, so it cannot drift.
    const band = `${r.heightM}m`;
    const already = rates[r.material]?.[band];

    // The same type at the same height, priced twice. Until now the second silently overwrote the
    // first and one of the two figures vanished with nobody told - and a customer would have been
    // quoted whichever happened to be last in the document.
    if (already !== undefined && already !== r.pricePerMetre) {
      unmapped.push(
        `You have priced ${r.material} at ${band} twice, at $${already} and $${r.pricePerMetre} per metre. ` +
          `We kept $${already} - tell us which one is right.`,
      );
      continue;
    }
    if (already !== undefined) continue;

    (rates[r.material] ??= {})[band] = r.pricePerMetre;
    ratesKept += 1;
  }

  // A taller fence that costs less than a shorter one of the same type is almost always a typo or
  // a misread line. Not dropped - it might be a genuine clearance - but never stored silently.
  for (const [material, bands] of Object.entries(rates)) {
    const byHeight = Object.entries(bands)
      .map(([band, price]) => ({ height: Number.parseFloat(band), band, price }))
      .sort((a, b) => a.height - b.height);

    for (let i = 1; i < byHeight.length; i += 1) {
      const taller = byHeight[i]!;
      const shorter = byHeight[i - 1]!;
      if (taller.price < shorter.price) {
        unmapped.push(
          `Worth checking: your ${material} is $${taller.price} at ${taller.band} but $${shorter.price} at ` +
            `${shorter.band} - the taller one costs less. We saved both as written.`,
        );
      }
    }
  }

  // ---- removals ----
  const removals: VerifiedPricing['removals'] = [];
  for (const r of take(x.removals, 20)) {
    if (!REMOVES.includes(r.removes)) continue;
    if (!num(r.pricePerMetre, BOUNDS.pricePerMetre.max) || !quoted(r.sourceQuote)) {
      unmapped.push(`Dropped a removal price - could not verify ${r.pricePerMetre} per metre against your description.`);
      continue;
    }
    removals.push({ removes: r.removes, pricePerMetre: r.pricePerMetre });
  }

  // Taking a fence down almost never costs more than putting one up. When it does, the two rates
  // have usually been read off the wrong lines - and that error reaches a customer as a real quote.
  const cheapestInstall = Math.min(
    ...Object.values(rates).flatMap((bands) => Object.values(bands)),
    Number.POSITIVE_INFINITY,
  );
  for (const r of removals) {
    if (Number.isFinite(cheapestInstall) && r.pricePerMetre > cheapestInstall) {
      unmapped.push(
        `Worth checking: removal is $${r.pricePerMetre} per metre, more than your cheapest fence at ` +
          `$${cheapestInstall} per metre. We saved both as written.`,
      );
    }
  }

  // ---- gates ----
  const gates: VerifiedPricing['gates'] = [];
  for (const g of take(x.gates, 30)) {
    if (!GATE_TYPES.includes(g.gateType)) {
      unmapped.push(`Could not file a gate as "${g.gateType}" - not a gate type we hold.`);
      continue;
    }
    if (!num(g.price, BOUNDS.price.max) || !quoted(g.sourceQuote)) {
      unmapped.push(`Dropped the ${g.gateType} gate price - could not verify it against your description.`);
      continue;
    }
    gates.push({
      gateType: g.gateType,
      material: g.material && MATERIALS.includes(g.material) ? g.material : null,
      price: g.price,
      isFromPrice: g.isFromPrice === true,
    });
  }

  // ---- site condition surcharges ----
  const siteConditions: VerifiedPricing['siteConditions'] = [];
  for (const s of take(x.siteConditions, 20)) {
    if (!CONDITIONS.includes(s.condition)) continue;

    const perMetre = num(s.extraPerMetre, BOUNDS.pricePerMetre.max) ? s.extraPerMetre : null;
    // A surcharge over 100% is a misread, not a business decision.
    const percent = num(s.extraPercent, 100) ? s.extraPercent : null;

    if ((perMetre === null && percent === null) || !quoted(s.sourceQuote)) {
      unmapped.push(`Dropped the ${s.condition} surcharge - could not verify it against your description.`);
      continue;
    }
    // Both would be ambiguous: a quote cannot add $14 AND 10%. Keep the stated one.
    const entry = { condition: s.condition, extraPerMetre: perMetre, extraPercent: perMetre === null ? percent : null };

    // The same condition priced twice - $14 per metre in one line and 10% in another. A quote
    // would either apply both or pick whichever came first, and neither is a decision we get to
    // make for them.
    const already = siteConditions.find((c) => c.condition === s.condition);
    if (already) {
      const show = (c: typeof entry) => (c.extraPerMetre !== null ? `$${c.extraPerMetre} per metre` : `${c.extraPercent}%`);
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
  const extras: VerifiedCapabilities['extras'] = [];
  for (const e of take(x.extras, 30)) {
    const label = str(e.label);
    if (!label) continue;
    const ok = num(e.price, BOUNDS.price.max) && quoted(e.sourceQuote);
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
  const radiusKm = num(sa.radiusKm, BOUNDS.radiusKm.max) ? sa.radiusKm : null;
  if (sa.radiusKm != null && radiusKm === null) {
    unmapped.push(`Dropped the travel radius - ${sa.radiusKm}km is outside the range we accept.`);
  }

  // ---- GST ----
  let gstIncluded = typeof x.gstIncluded === 'boolean' ? x.gstIncluded : null;
  if (gstIncluded !== null && x.gstSourceQuote && !quoted(x.gstSourceQuote)) {
    unmapped.push('Could not confirm the GST wording against your description, so it was left unset.');
    gstIncluded = null;
  }

  // ---- minimum charge ----
  let minimumCharge = num(x.minimumCharge, BOUNDS.price.max) ? x.minimumCharge : null;
  if (x.minimumCharge != null && minimumCharge === null) {
    unmapped.push(`Dropped the minimum charge - ${x.minimumCharge} is outside the range we accept.`);
  } else if (minimumCharge !== null && !quoted(x.minimumChargeSourceQuote)) {
    unmapped.push('Dropped the minimum charge - could not find that figure in your description.');
    minimumCharge = null;
  }

  // ---- how they build it ----------------------------------------------------------------------
  // Same quote rule as everything else: a spec whose sentence is not in the text was invented.
  // Measurements are bounded so a misplaced decimal cannot be stored as fact.
  // One entry per material. A spec written across several sentences arrives as several entries,
  // some of them mostly empty, so they are merged rather than left as duplicates - and a value
  // already found is never overwritten by a later null.
  const byMaterial = new Map<Material, VerifiedSpec>();
  for (const sp of take(x.specs, 20)) {
    if (!MATERIALS.includes(sp.material) || !quoted(sp.sourceQuote)) continue;
    const spec: VerifiedSpec = {
      material: sp.material,
      postSize: str(sp.postSize),
      postSpacingM: num(sp.postSpacingM, 6) ? sp.postSpacingM : null,
      postDepthMm: num(sp.postDepthMm, 2000) ? sp.postDepthMm : null,
      holeDiameterMm: num(sp.holeDiameterMm, 1000) ? sp.holeDiameterMm : null,
      footing: str(sp.footing),
      railCount: num(sp.railCount, 10) ? sp.railCount : null,
      railSize: str(sp.railSize),
      infill: str(sp.infill),
      cappingSize: str(sp.cappingSize),
      cappingExtraPerMetre: num(sp.cappingExtraPerMetre, BOUNDS.pricePerMetre.max) ? sp.cappingExtraPerMetre : null,
    };

    const existing = byMaterial.get(sp.material);
    byMaterial.set(
      sp.material,
      existing
        ? (Object.fromEntries(
            Object.entries(spec).map(([k, v]) => [k, v ?? existing[k as keyof VerifiedSpec]]),
          ) as VerifiedSpec)
        : spec,
    );
  }
  const specs = [...byMaterial.values()];

  const strList = (v: string[], cap: number) => v.map(str).filter((s): s is string => Boolean(s)).slice(0, cap);

  // A price list with no surviving core rate is not something to mark verified, even though the
  // review step approved it — it would show an empty pricing screen and quote nobody.
  const status = ratesKept > 0 ? 'verified' : 'unverified';
  if (ratesKept === 0) {
    unmapped.push('No usable rates could be read from your description - please restate your prices and send again.');
  }

  const pricing: VerifiedPricing = {
    gstIncluded,
    enabledMaterials: Object.keys(rates) as Material[],
    rates,
    removals,
    gates,
    siteConditions,
    serviceArea: {
      baseLocation: str(sa.baseLocation),
      resolved: null, // the pipeline fills this in; verification does no network calls
      radiusKm,
      excludedAreas: strList(sa.excludedAreas, 40),
    },
    minimumCharge,
  };

  const capabilities: VerifiedCapabilities = {
    businessName: str(x.businessName),
    specs,
    permits: {
      included: typeof x.permits?.included === 'boolean' ? x.permits.included : null,
      fee: num(x.permits?.fee, BOUNDS.price.max) && quoted(x.permits?.sourceQuote) ? x.permits.fee : null,
    },
    warranty: {
      years: num(x.warranty?.years, 50) ? x.warranty.years : null,
      text: quoted(x.warranty?.sourceQuote) ? str(x.warranty?.text) : null,
    },
    tags: x.tags.filter((t) => (TAGS as readonly string[]).includes(t)),
    extras,
    inclusions: strList(x.inclusions, 40),
    exclusions: strList(x.exclusions, 40),
  };

  // ---- the long tail ------------------------------------------------------------------------
  // Same gates as a core rate. The tier is looser about WHAT can be named, never about the numbers
  // attached to it - an unverifiable price here would reach a customer exactly like any other.
  const otherOfferings: VerifiedOffering[] = [];
  for (const o of take(x.otherOfferings, 40)) {
    const label = str(o.label);
    if (!label) continue;

    if (!quoted(o.sourceQuote)) {
      unmapped.push(`Could not find "${label}" in your description, so it was not saved.`);
      continue;
    }
    if (o.pricePerMetre != null && !num(o.pricePerMetre, BOUNDS.pricePerMetre.max)) {
      unmapped.push(`Dropped the ${label} price - ${o.pricePerMetre} per metre is outside the range we accept.`);
      continue;
    }
    if (o.heightM != null && (!num(o.heightM, BOUNDS.heightM.max) || o.heightM < BOUNDS.heightM.min)) {
      unmapped.push(`Dropped a ${label} entry - ${o.heightM}m is not a height we can store.`);
      continue;
    }

    // The model may only reuse a slug it was actually shown; anything else is built here from the
    // label, so a slug can never be something the model made up.
    const slug = o.slug && knownSlugs.includes(o.slug) ? o.slug : slugify(label);

    otherOfferings.push({
      slug,
      label,
      pricePerMetre: o.pricePerMetre ?? null,
      heightM: o.heightM ?? null,
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
    // Computed in code, never by the model: what actually landed, so "is this profile usable?"
    // is answerable without re-reading the whole document (docs/FLOW.md §14b).
    coverage: {
      rates: ratesKept,
      removals: removals.length,
      gates: gates.length,
      siteConditions: siteConditions.length,
      extras: extras.length,
      tags: capabilities.tags.length,
      specs: specs.length,
      otherOfferings: otherOfferings.length,
      couldNotUse: unmapped.length,
    },
  };
}
