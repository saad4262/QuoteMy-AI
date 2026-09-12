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

// ------------------------------------------------------------------------------------------------
// TILING — the second trade. Same rules as everything above: closed lists, enforced in the
// extraction schema AND the verifier, and adding a value is a migration.
//
// These mirror what a tiling price list actually publishes rather than a tidier taxonomy. That is
// deliberate: `TILE_TYPES` mixes material, size and pattern in one list because that is how the
// rates are written - "porcelain", "600x1200" and "herringbone" are three lines on the same price
// list, each with its own number, and a customer choosing between them is choosing between rates.
// Splitting them into three tidy dimensions would invent a cross-product of prices no business
// published.

/** What is being tiled. Floor and wall are different jobs at different rates. */
export const TILE_SURFACES = [
  'floor_internal',
  'wall_internal',
  'floor_outdoor',
  'splashback',
  'shower_floor',
  'shower_wall',
] as const;

/** The line items a tiling rate is published against. */
export const TILE_TYPES = [
  'ceramic',
  'porcelain',
  'large_format_600x1200',
  'large_format_900x900',
  'large_format_1200x1200',
  'large_format_1200x2400',
  /* Added after the first tiling business onboarded with both and lost them: six figures - floor,
     wall and supply for each size - dropped on the way in with nothing said to the business.
     Appended rather than slotted in beside the other sizes, because this list is also the order the
     customer's multiple choice is built in, and a vocabulary addition must not quietly reshuffle
     what is on their screen. */
  'large_format_600x600',
  'large_format_800x800',
  'subway',
  'mosaic',
  'glass_mosaic',
  'feature_mosaic',
  'natural_stone',
  'terrazzo',
  'outdoor_porcelain',
  'herringbone',
] as const;

/**
 * The room or piece of work being quoted, which is what a customer actually asks for.
 *
 * A bathroom is floor and wall and waterproofing and removal at once, and tilers routinely publish
 * one price for it. A business that publishes only per-square-metre rates still quotes the same job
 * - the rate carries its own unit, so one is priced by the metre and the other as one item.
 */
export const TILE_JOB_TYPES = [
  'bathroom',
  'ensuite',
  'laundry',
  'kitchen_splashback',
  'floor_only',
  'wall_only',
  'balcony',
  'outdoor',
] as const;

/** Getting the surface ready. The most commonly missing half of a cheap-looking quote. */
export const TILE_PREP = [
  'surface_prep',
  'floor_grinding',
  'primer',
  'floor_levelling',
  'screeding',
  'adhesive_removal',
  'rubbish_removal',
  'crack_treatment',
] as const;

/**
 * What is being taken up, which is what removal is priced against - not what is going down.
 *
 * `any` is the business-side wildcard, exactly as it is in fencing's `REMOVES`: a customer looking
 * at their own bathroom floor knows there are tiles on it and very often cannot tell ceramic from
 * porcelain. They answer "yes, take them up"; which kind it is stays our pricing problem, and
 * `priceAndRank` falls back to the dearest rate a business published rather than hiding them.
 */
export const TILE_REMOVES = ['ceramic', 'porcelain', 'stone', 'mosaic', 'adhesive', 'any'] as const;

/** Priced per wet area, not per square metre. Regulated work, never an upsell. */
export const TILE_WATERPROOF = ['bathroom', 'ensuite', 'laundry', 'shower', 'balcony'] as const;

/**
 * Who buys the tiles. The labour rate is the same either way - what differs is whether the tile
 * price per square metre is added on top, and that price comes from the business's own list.
 */
export const TILE_SUPPLY = ['supply_and_install', 'labour_only'] as const;

export const TILE_CONDITIONS = [
  'restricted_access',
  'second_storey',
  'stairs',
  'small_room',
  'uneven_substrate',
] as const;

export const TILE_TAGS = [
  'waterproofing',
  'large-format-capable',
  'natural-stone',
  'customer-supply-accepted',
  'outdoor-capable',
  'commercial',
  'insured',
] as const;

export type TileSurface = (typeof TILE_SURFACES)[number];
export type TileType = (typeof TILE_TYPES)[number];
export type TileJobType = (typeof TILE_JOB_TYPES)[number];
export type TilePrep = (typeof TILE_PREP)[number];
export type TileRemoves = (typeof TILE_REMOVES)[number];
export type TileWaterproof = (typeof TILE_WATERPROOF)[number];
export type TileSupply = (typeof TILE_SUPPLY)[number];
export type TileCondition = (typeof TILE_CONDITIONS)[number];
export type TileTag = (typeof TILE_TAGS)[number];

/**
 * Tiling's bounds. `pricePerSqm` is tighter than fencing's per-metre ceiling because it is a
 * different quantity: $2,000 a square metre is a misread, where $2,000 a linear metre of fence is
 * merely improbable. Fixed room prices reuse `price`.
 */
export const TILING_BOUNDS = {
  pricePerSqm: { min: 0, max: 1000 },
  price: { min: 0, max: 100_000 },
  radiusKm: { min: 0, max: 500 },
} as const;

// --- kitchen ------------------------------------------------------------------------------------

/**
 * What the customer is having done, which decides which of a fitter's rates applies at all.
 *
 * `install_only` is not the same statement as `labour_only` below, and both are needed. This one is
 * about the WORK - there is a kitchen sitting in boxes and it needs fitting, with no demolition and
 * no design. `supply` is about who BOUGHT it. A replacement kitchen the fitter supplies is
 * `replacement` + `supply_and_install`; a flat-pack the customer bought and wants fitted into an
 * empty room is `install_only` + `labour_only`. Folding the two into one field loses the difference
 * between a job with demolition in it and a job without.
 */
export const KITCHEN_JOB_TYPES = ['new_kitchen', 'replacement', 'install_only'] as const;

/**
 * How big the job is - and the reason kitchen has no `lengthMeters` or `areaSqm`.
 *
 * Fitters do not price kitchens by the metre. They publish "small $1,950, standard $2,850, large
 * $4,250" and then itemise everything else, so the SIZE is the rate key and the quantity is one
 * whole kitchen. A customer knows roughly which of three their kitchen is; almost none of them can
 * count their cabinets correctly, and a miscount is a wrong price rather than a missing one.
 */
export const KITCHEN_SIZES = ['small', 'standard', 'large'] as const;

/**
 * Who buys the cabinetry. Kitchen's version of `TILE_SUPPLY`, and the same rule applies: the
 * fitting price is the same either way, and what differs is whether the cabinetry package price is
 * added on top - from the business's own published list and nowhere else.
 */
export const KITCHEN_SUPPLY = ['supply_and_install', 'labour_only'] as const;

/** Priced per benchtop as one item, by what it is made of - never by the metre. */
export const KITCHEN_BENCHTOPS = ['laminate', 'timber', 'stone'] as const;

/**
 * What is being taken out, which is what the removal is priced against.
 *
 * `any` is the business-side wildcard, as it is in both other trades: somebody replacing a kitchen
 * knows there is one there and has not thought about whether the benchtop comes out separately.
 */
export const KITCHEN_REMOVES = [
  'full_demolition',
  'cabinets_only',
  'benchtop_only',
  'splashback_only',
  'any',
] as const;

/** Getting the room ready. The half most often missing from a cheap-looking kitchen quote. */
export const KITCHEN_PREP = ['wall_prep', 'floor_prep', 'floor_levelling', 'plaster_repair'] as const;

/**
 * The parts of a kitchen that are quoted as their own item rather than folded into the fitting
 * price. Every one of these is a real line on a fitter's list, and each is priced once.
 */
export const KITCHEN_EXTRAS = [
  'island',
  'pantry',
  'splashback_prep',
  'appliance_integration',
  'sink',
  'laundry',
  /* Storage, added after the first fitter onboarded. All four are priced lines on their own list -
     $520, $350, $280, $450 - that a customer had no way to ask for: the business side stored them
     under a null type and the customer's own choices stopped at six. Appended rather than slotted
     in beside the others, because this list is also the order the customer's multiple choice is
     built in, and a vocabulary addition must not quietly reshuffle what is on their screen. */
  'appliance_garage',
  'open_shelving',
  'pull_out_bin',
  'corner_storage',
] as const;

export const KITCHEN_TAGS = [
  'flat-pack-capable',
  'custom-cabinetry',
  'customer-supply-accepted',
  'stone-benchtop',
  'appliance-integration',
  'laundry-capable',
  'insured',
] as const;

export type KitchenJobType = (typeof KITCHEN_JOB_TYPES)[number];
export type KitchenSize = (typeof KITCHEN_SIZES)[number];
export type KitchenSupply = (typeof KITCHEN_SUPPLY)[number];
export type KitchenBenchtop = (typeof KITCHEN_BENCHTOPS)[number];
export type KitchenRemoves = (typeof KITCHEN_REMOVES)[number];
export type KitchenPrep = (typeof KITCHEN_PREP)[number];
export type KitchenExtra = (typeof KITCHEN_EXTRAS)[number];
export type KitchenTag = (typeof KITCHEN_TAGS)[number];

/**
 * Kitchen's bounds. There is no per-unit rate here at all - every figure is a price for a thing -
 * so `price` does the work `pricePerMetre` and `pricePerSqm` do in the other two trades.
 *
 * The floor is deliberately not zero on `price`: a fitter's cheapest real line is a $35 handle, and
 * a $0 line is a heading that was read as a rate.
 */
export const KITCHEN_BOUNDS = {
  price: { min: 0, max: 100_000 },
  radiusKm: { min: 0, max: 500 },
} as const;

export const TRADES = ['fencing', 'tiling', 'kitchen'] as const; // decking and retaining_wall follow
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

export const TILING_VOCAB: TradeVocab = {
  core: {
    jobTypes: TILE_JOB_TYPES,
    surfaces: TILE_SURFACES,
    tileTypes: TILE_TYPES,
    prep: TILE_PREP,
    removes: TILE_REMOVES,
    waterproof: TILE_WATERPROOF,
    supply: TILE_SUPPLY,
    conditions: TILE_CONDITIONS,
    units: UNITS,
    tags: TILE_TAGS,
  },
  bounds: TILING_BOUNDS,
};

export const KITCHEN_VOCAB: TradeVocab = {
  core: {
    jobTypes: KITCHEN_JOB_TYPES,
    sizes: KITCHEN_SIZES,
    supply: KITCHEN_SUPPLY,
    benchtops: KITCHEN_BENCHTOPS,
    removes: KITCHEN_REMOVES,
    prep: KITCHEN_PREP,
    extras: KITCHEN_EXTRAS,
    units: UNITS,
    tags: KITCHEN_TAGS,
  },
  bounds: KITCHEN_BOUNDS,
};

export const TRADE_VOCAB: Record<Trade, TradeVocab> = {
  fencing: FENCING_VOCAB,
  tiling: TILING_VOCAB,
  kitchen: KITCHEN_VOCAB,
};
