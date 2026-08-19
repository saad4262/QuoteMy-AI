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
} from '../shared/vocab.js';
import type { Extraction } from '../schemas/extraction.js';

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
  siteConditions: { condition: Condition; extraPerMetre: number }[];
  serviceArea: { baseLocation: string | null; radiusKm: number | null; excludedAreas: string[] };
  minimumCharge: number | null;
}

export interface VerifiedCapabilities {
  businessName: string | null;
  tags: string[];
  extras: { label: string; price: number | null; unit: Unit | null; isFromPrice: boolean }[];
  inclusions: string[];
  exclusions: string[];
}

export interface VerifiedResult {
  trade: Trade;
  status: 'verified' | 'unverified';
  pricing: VerifiedPricing;
  capabilities: VerifiedCapabilities;
  unmapped: string[];
  ratesKept: number;
  coverage: Record<string, number>;
}

const MAX_ENTRIES = 200;

export function verifyExtraction(x: Extraction, sourceText: string, trade: Trade): VerifiedResult {
  const rawText = sourceText.toLowerCase();
  const unmapped = [...x.unmapped];

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
    (rates[r.material] ??= {})[band] = r.pricePerMetre;
    ratesKept += 1;
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
    if (!num(s.extraPerMetre, BOUNDS.pricePerMetre.max) || !quoted(s.sourceQuote)) {
      unmapped.push(`Dropped the ${s.condition} surcharge - could not verify it against your description.`);
      continue;
    }
    siteConditions.push({ condition: s.condition, extraPerMetre: s.extraPerMetre });
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
      radiusKm,
      excludedAreas: strList(sa.excludedAreas, 40),
    },
    minimumCharge,
  };

  const capabilities: VerifiedCapabilities = {
    businessName: str(x.businessName),
    tags: x.tags.filter((t) => (TAGS as readonly string[]).includes(t)),
    extras,
    inclusions: strList(x.inclusions, 40),
    exclusions: strList(x.exclusions, 40),
  };

  return {
    trade,
    status,
    pricing,
    capabilities,
    unmapped,
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
      unmapped: unmapped.length,
    },
  };
}
