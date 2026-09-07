/**
 * The canonical vocabulary — CONTEXT.md §8, and the highest-risk file in the repo.
 *
 * Every value here is a CLOSED list. The model picks a value from it or the line goes to
 * `unmapped`; it is never allowed to invent one. Vocabulary drift is the only failure in this
 * system that is silent and permanent: `treatedPinePaling` for one business and `timber_pine`
 * for the next makes both invisible to customer search, with no error raised anywhere.
 *
 * Adding a value is a schema migration — the customer side filters on these exact strings.
 * This file is the single source: the OpenAI json_schema and the post-generation validator both
 * derive from it, so the two copies that exist in the n8n workflow cannot come back.
 */

export const MATERIALS = [
  'timber_pine',
  'timber_hardwood',
  'colorbond',
  'aluminium',
  'pool_aluminium',
  'pool_glass',
  'chainmesh',
  'rural_wire',
] as const;

export const GATE_TYPES = [
  'pedestrian_single',
  'driveway_double',
  'driveway_sliding',
  'motor_automation',
] as const;

export const CONDITIONS = ['sloped', 'rock', 'restricted_access', 'hand_dig'] as const;

export const REMOVES = ['timber', 'metal', 'any'] as const;

export const UNITS = ['per_metre', 'per_item', 'per_job', 'per_sqm'] as const;

export const TAGS = [
  'custom-gates',
  'steep-blocks',
  'pool-compliant',
  'rural-capable',
  'own-installers',
  'insured',
  'glass-capable',
  'automation',
] as const;

export type Material = (typeof MATERIALS)[number];
export type GateType = (typeof GATE_TYPES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type Removes = (typeof REMOVES)[number];
export type Unit = (typeof UNITS)[number];
export type Tag = (typeof TAGS)[number];

/** Plausibility bounds — a source sentence can be real and the number still wrong. */
export const BOUNDS = {
  pricePerMetre: { min: 0, max: 2000 },
  price: { min: 0, max: 100_000 },
  heightM: { min: 0.3, max: 4 },
  radiusKm: { min: 0, max: 500 },
} as const;

export const TRADES = ['fencing'] as const; // tiling, decking, retaining_wall follow the Day-9 gate
export type Trade = (typeof TRADES)[number];

/**
 * The same vocabulary, reachable by trade.
 *
 * Every list above is fencing's. A second trade does not add values to them — it brings its own
 * lists under its own names, because `gateTypes` is not a concept tiling has and `surfaces` is not
 * one fencing has. So anything that serves a trade generically — `coreOf`, `syncTradeSchema`, the
 * chat's fallback vocabulary — reads the lists from here rather than importing fencing's by name.
 *
 * A record rather than a fixed shape, deliberately: the LIST NAMES belong to the trade. What may
 * not vary is that every list stays closed — the model picks a value from it or the line goes to
 * `unmapped`, never to the nearest guess (`CONTEXT.md` §8). Adding a value to one of these is
 * still a schema migration, in both the extraction schema and the verifier.
 *
 * A trade's own verifier and extraction schema keep importing their own constants directly, the
 * way `verify.ts` and `schemas.ts` do today. Those files are per-trade already; it is only the
 * generic callers that need a lookup.
 */
export interface TradeVocab {
  core: Record<string, readonly string[]>;
  bounds: Record<string, { readonly min: number; readonly max: number }>;
}

export const FENCING_VOCAB: TradeVocab = {
  core: {
    materials: MATERIALS,
    gateTypes: GATE_TYPES,
    conditions: CONDITIONS,
    removes: REMOVES,
    units: UNITS,
    tags: TAGS,
  },
  bounds: BOUNDS,
};

export const TRADE_VOCAB: Record<Trade, TradeVocab> = {
  fencing: FENCING_VOCAB,
};
