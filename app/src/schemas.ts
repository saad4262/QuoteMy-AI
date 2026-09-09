import { z } from 'zod';
import {
  CONDITIONS,
  GATE_TYPES,
  KITCHEN_BENCHTOPS,
  KITCHEN_EXTRAS,
  KITCHEN_JOB_TYPES,
  KITCHEN_PREP,
  KITCHEN_REMOVES,
  KITCHEN_SIZES,
  KITCHEN_SUPPLY,
  KITCHEN_TAGS,
  MATERIALS,
  REMOVES,
  TAGS,
  TILE_CONDITIONS,
  TILE_JOB_TYPES,
  TILE_PREP,
  TILE_REMOVES,
  TILE_SUPPLY,
  TILE_TAGS,
  TILE_TYPES,
  TILE_WATERPROOF,
  TRADES,
  UNITS,
  type Trade,
} from './vocab.js';

/**
 * Everything the business side sends arrives on ONE route, and `action` says what to do with it.
 * The frontend has one URL to call, not five.
 *
 * There is no auth yet, so `businessUid` is taken at face value. That is a deliberate, temporary
 * choice - when Firebase is wired up it comes from the verified token instead.
 */
export const businessBody = z.object({
  action: z.enum(['submit', 'confirm', 'profile', 'review', 'extract', 'process']).default('submit'),
  businessUid: z.string().trim().min(1).default('test-business'),
  trade: z.enum(TRADES).default('fencing'),
  // Optional because attached files are a submission on their own. Whether anything usable
  // arrived is decided in pipeline.ts, once text and files have been read into one transcript.
  text: z.string().default(''),
});
export type BusinessBody = z.infer<typeof businessBody>;

/**
 * Stage 0's output. One job, kept as narrow as possible: copy out what the document says.
 * `unreadable` is how the model says so instead of inventing something plausible.
 */
export const transcriptSchema = z.object({
  documents: z
    .object({
      label: z.string(),
      text: z.string(),
      unreadable: z.boolean(),
      /**
       * Which job the model actually did on this file, and the most important word in this schema.
       *
       * `transcript` is a copy: words that were written on the page, which everything downstream is
       * entitled to treat as the customer's own. `description` is the model SAYING WHAT IT SEES in
       * a photo of a room - a judgement, with no source sentence anywhere behind it.
       *
       * The two must never be confused, because the code that reads a transcript deliberately does
       * not verify it (see `attachmentFacts.ts`) - it does not need to, a copy cannot invent. Run
       * that same code over a description and a guess becomes a fact with nothing left to catch it.
       */
      content: z.enum(['transcript', 'description']),
    })
    .array(),
});

/**
 * Stage 1's output. The model decides one thing - does this pass - and writes the list of jobs if
 * it does not. Every other sentence the business reads is fixed text in report.ts, because an
 * opening and a sign-off that change with the model's mood are drift, not personality.
 */
export const reviewSchema = z.object({
  /**
   * Three outcomes, not two. "not_a_price_list" is a submission with no pricing content at all -
   * gibberish, a greeting, an enquiry, the wrong trade. It needs different words from a real price
   * list that is nearly there: telling someone "a few things need updating" when they sent nothing
   * usable reads as though we did not look.
   */
  outcome: z.enum(['approved', 'needs_updates', 'not_a_price_list']),
  fixes: z
    .object({
      // "missing" = they never said it. "unclear" = they said it, but not in a form we can quote
      // from. The two are different jobs for the business, so they are shown separately.
      kind: z.enum(['missing', 'unclear']),
      what: z.string(),
      example: z.string().nullable(),
    })
    .array(),

  /**
   * Things absent from the submission that are NOT blocking, but would make the profile actually
   * work: gate prices, a removal rate, more height bands, site surcharges, build specs.
   *
   * Why this is a separate field rather than more fixes. A four-line price list can satisfy every
   * blocking rule and still be commercially useless - it quotes two fence types at one height and
   * silently loses every customer who wants a gate. Under the old shape the business was told the
   * one blocking thing, fixed it, was approved, and never learned the rest.
   *
   * It must never compete with `fixes` for space or attention: these are opportunities, not faults,
   * and a business is never sent away over one.
   */
  alsoWorthAdding: z.string().array(),
});
export type ReviewResult = z.infer<typeof reviewSchema>;

/**
 * Stage 2's output - one trade per call.
 *
 * Every enum comes from vocab.ts, so the schema sent to the model, the validator that checks the
 * reply and the TypeScript types can never disagree. Everything is `.nullable()` rather than
 * `.optional()`: strict mode requires every key in `required`, so "not stated" must be a value.
 * That is also what keeps the response identical for a business that listed ten things and one
 * that listed two.
 */
export const extractionSchema = z.object({
  businessName: z.string().nullable(),
  gstIncluded: z.boolean().nullable(),
  gstSourceQuote: z.string().nullable(),

  serviceArea: z.object({
    baseLocation: z.string().nullable(),
    radiusKm: z.number().nullable(),
    radiusSourceQuote: z.string().nullable(),
    excludedAreas: z.string().array(),
  }),

  minimumCharge: z.number().nullable(),
  minimumChargeSourceQuote: z.string().nullable(),

  rates: z
    .object({
      material: z.enum(MATERIALS),
      heightM: z.number(),
      pricePerMetre: z.number(),
      sourceQuote: z.string(),
    })
    .array(),

  removals: z.object({ removes: z.enum(REMOVES), pricePerMetre: z.number(), sourceQuote: z.string() }).array(),

  gates: z
    .object({
      gateType: z.enum(GATE_TYPES),
      material: z.enum(MATERIALS).nullable(),
      price: z.number(),
      isFromPrice: z.boolean(),
      sourceQuote: z.string(),
    })
    .array(),

  /**
   * A surcharge is stated either as a rate per metre or as a percentage - the client SOP has both
   * ("Slope +10%", "Rocky soil +$40/pm"). Exactly one is filled in; the other is null. Storing a
   * percentage as if it were dollars would be a silent, permanent error in every quote.
   */
  siteConditions: z
    .object({
      condition: z.enum(CONDITIONS),
      extraPerMetre: z.number().nullable(),
      extraPercent: z.number().nullable(),
      sourceQuote: z.string(),
    })
    .array(),

  extras: z
    .object({
      label: z.string(),
      price: z.number().nullable(),
      unit: z.enum(UNITS).nullable(),
      isFromPrice: z.boolean(),
      sourceQuote: z.string().nullable(),
    })
    .array(),

  /**
   * How they actually build it. From the client SOP, which wants a spec summary shown next to the
   * price: "100x100 H4 posts at 2.4m spacing, 600mm deep in concrete, 3 rails per bay".
   *
   * COLLECTED, NOT BLOCKING. A quote is calculated from rates, never from post depth, and the best
   * real submission we have states only about half of these. Refusing a business whose prices are
   * all correct because they did not give a hole diameter loses a good business and saves nothing.
   * Every field is nullable and every one is normal to be null.
   */
  specs: z
    .object({
      material: z.enum(MATERIALS),
      postSize: z.string().nullable(),
      postSpacingM: z.number().nullable(),
      postDepthMm: z.number().nullable(),
      holeDiameterMm: z.number().nullable(),
      footing: z.string().nullable(),
      railCount: z.number().nullable(),
      railSize: z.string().nullable(),
      infill: z.string().nullable(),
      cappingSize: z.string().nullable(),
      cappingExtraPerMetre: z.number().nullable(),
      sourceQuote: z.string(),
    })
    .array(),

  /** Council permits and inspections: who arranges them, who pays. Collected, not blocking. */
  permits: z.object({
    included: z.boolean().nullable(),
    fee: z.number().nullable(),
    sourceQuote: z.string().nullable(),
  }),

  /** Workmanship warranty, where stated. Collected, not blocking. */
  warranty: z.object({
    years: z.number().nullable(),
    text: z.string().nullable(),
    sourceQuote: z.string().nullable(),
  }),

  inclusions: z.string().array(),
  exclusions: z.string().array(),
  tags: z.enum(TAGS).array(),

  /**
   * The long tail: things this business sells that have no value in the closed list - bamboo
   * screening, brushwood, picket, wrought iron.
   *
   * Splitting these out of the old `unmapped` prose is what makes them usable at all. Before, a
   * business offering bamboo screening got a sentence nobody could count, and their pricing was
   * invisible to customer search forever. Now it is stored, searchable by text, and the next
   * business to offer the same thing is shown this one's slug so it does not invent a second
   * spelling.
   *
   * `slug` is only ever an EXISTING slug the model was shown. New things return null, and code
   * builds the slug from the label - the same rule that keeps height bands honest.
   */
  otherOfferings: z
    .object({
      slug: z.string().nullable(),
      label: z.string(),
      pricePerMetre: z.number().nullable(),
      heightM: z.number().nullable(),
      unit: z.enum(UNITS).nullable(),
      sourceQuote: z.string(),
    })
    .array(),

  /** Anything stated that could not be stored at all, in plain English, for a human to read. */
  couldNotUse: z.string().array(),
});
export type Extraction = z.infer<typeof extractionSchema>;

/**
 * Stage 2's output for TILING. Same discipline throughout - every number carries the sentence it
 * came from, every enum comes from vocab.ts, everything is `.nullable()` rather than `.optional()`.
 * What differs is the shape, and it differs because a tiling price list is a different document.
 */
export const tilingExtractionSchema = z.object({
  businessName: z.string().nullable(),
  gstIncluded: z.boolean().nullable(),
  gstSourceQuote: z.string().nullable(),

  serviceArea: z.object({
    baseLocation: z.string().nullable(),
    radiusKm: z.number().nullable(),
    radiusSourceQuote: z.string().nullable(),
    excludedAreas: z.string().array(),
  }),

  minimumCharge: z.number().nullable(),
  minimumChargeSourceQuote: z.string().nullable(),
  /** An inspection or call-out fee, which tilers charge and fencers generally do not. */
  callOutFee: z.number().nullable(),
  callOutFeeSourceQuote: z.string().nullable(),
  travelFee: z.number().nullable(),
  travelFeeSourceQuote: z.string().nullable(),

  /**
   * The core rates, and the one place tiling genuinely differs from fencing in kind.
   *
   * `tileType` is NULLABLE, exactly like `material` on a fencing gate and for the same reason: a
   * price list says "Standard floor tiling $65/m²" and then "Porcelain floor tiling $72/m²", and
   * those are a general rate and a specific one, not two rates for two different things. Null means
   * "whatever tile they use"; a named type beats it at quoting time.
   *
   * `unit` is what lets a room price and a square-metre price live in one table. "Standard floor
   * tiling $65/m²" is per_sqm; "Complete bathroom package $4,850" is per_job. Both are core rates,
   * both are quoted through the same formula, and the unit is the only thing that differs.
   */
  rates: z
    .object({
      jobType: z.enum(TILE_JOB_TYPES),
      tileType: z.enum(TILE_TYPES).nullable(),
      price: z.number(),
      unit: z.enum(['per_sqm', 'per_job']),
      sourceQuote: z.string(),
    })
    .array(),

  /** Tiles they SELL, when they supply as well as install. Never a figure off a website. */
  tileSupply: z
    .object({
      label: z.string(),
      tileType: z.enum(TILE_TYPES).nullable(),
      pricePerSqm: z.number(),
      sourceQuote: z.string(),
    })
    .array(),

  /** Which of the two models they work under. Empty means they never said. */
  supplyModels: z.enum(TILE_SUPPLY).array(),

  /** Getting the surface ready, priced per square metre, per job or per hour. */
  prep: z
    .object({
      type: z.enum(TILE_PREP),
      price: z.number(),
      unit: z.enum(['per_sqm', 'per_job', 'per_hour']),
      sourceQuote: z.string(),
    })
    .array(),

  /** Taking up what is there, priced by what it is - not by what is going down. */
  removals: z
    .object({ removes: z.enum(TILE_REMOVES), pricePerSqm: z.number(), sourceQuote: z.string() })
    .array(),

  /** Priced per wet area, never per square metre. */
  waterproofing: z
    .object({ area: z.enum(TILE_WATERPROOF), price: z.number(), sourceQuote: z.string() })
    .array(),

  /** Same rule as fencing's surcharges: a rate or a percentage, never both. */
  siteConditions: z
    .object({
      condition: z.enum(TILE_CONDITIONS),
      extraPerSqm: z.number().nullable(),
      extraPercent: z.number().nullable(),
      sourceQuote: z.string(),
    })
    .array(),

  extras: z
    .object({
      label: z.string(),
      price: z.number().nullable(),
      unit: z.enum(UNITS).nullable(),
      isFromPrice: z.boolean(),
      sourceQuote: z.string().nullable(),
    })
    .array(),

  /**
   * No `specs` equivalent. Fencing asks how it is built because a post depth is a real published
   * specification; a tiler's method is adhesive, trowel and levelling system, which is not
   * something businesses publish and not something customers compare on.
   */
  warranty: z.object({ text: z.string().nullable(), sourceQuote: z.string().nullable() }),

  inclusions: z.string().array(),
  exclusions: z.string().array(),
  tags: z.enum(TILE_TAGS).array(),

  otherOfferings: z
    .object({
      slug: z.string().nullable(),
      label: z.string(),
      price: z.number().nullable(),
      unit: z.enum(UNITS).nullable(),
      sourceQuote: z.string(),
    })
    .array(),

  couldNotUse: z.string().array(),
});
export type TilingExtraction = z.infer<typeof tilingExtractionSchema>;

export const kitchenExtractionSchema = z.object({
  businessName: z.string().nullable(),
  gstIncluded: z.boolean().nullable(),
  gstSourceQuote: z.string().nullable(),

  serviceArea: z.object({
    baseLocation: z.string().nullable(),
    radiusKm: z.number().nullable(),
    radiusSourceQuote: z.string().nullable(),
    excludedAreas: z.string().array(),
  }),

  minimumCharge: z.number().nullable(),
  minimumChargeSourceQuote: z.string().nullable(),
  /** What they charge to come and measure or consult. Kitchen fitters charge this; fencers do not. */
  siteMeasureFee: z.number().nullable(),
  siteMeasureFeeSourceQuote: z.string().nullable(),
  travelFee: z.number().nullable(),
  travelFeeSourceQuote: z.string().nullable(),

  /**
   * The core rates, and the place kitchen differs in kind from both other trades.
   *
   * There is no per-unit rate here at all. Fitters price the WHOLE JOB by its size - "standard
   * kitchen installation $2,850" - and itemise everything else, so `unit` is `per_job` for a
   * kitchen and `per_item` for a single cabinet, and there is no third possibility.
   *
   * Both keys are NULLABLE, and for the same reason `tileType` is on a tiling rate. A list that
   * says only "kitchen installation $2,850" has named neither the job nor the size; that is a
   * general rate covering all three sizes, not a missing value. A named size beats a null one at
   * quoting time, exactly as a named tile beats a general tiling rate.
   */
  rates: z
    .object({
      jobType: z.enum(KITCHEN_JOB_TYPES).nullable(),
      size: z.enum(KITCHEN_SIZES).nullable(),
      /**
       * WHICH item, on a per-item rate. Null on a per-job one, where the size already says it.
       *
       * Found on a live submission: "base $180, wall $165, tall $280, drawer unit $190" is four
       * different cabinets, and with nothing to tell them apart they read as one rate priced four
       * times - three real prices dropped, and the business told its own list contradicted itself.
       * The business's own wording, because there is no closed list of cabinet types and inventing
       * one would be exactly the drift the vocabulary exists to prevent.
       */
      label: z.string().nullable(),
      price: z.number(),
      unit: z.enum(['per_job', 'per_item']),
      sourceQuote: z.string(),
    })
    .array(),

  /** Cabinetry they SELL, when they supply as well as install. Never a figure off a website. */
  cabinetSupply: z
    .object({
      label: z.string(),
      price: z.number(),
      unit: z.enum(['per_job', 'per_item']),
      sourceQuote: z.string(),
    })
    .array(),

  /** Which of the two models they work under. Empty means they never said. */
  supplyModels: z.enum(KITCHEN_SUPPLY).array(),

  /** Priced per benchtop as one item, by what it is made of. A cut-out is an extra, not a benchtop. */
  benchtops: z
    .object({ material: z.enum(KITCHEN_BENCHTOPS), price: z.number(), sourceQuote: z.string() })
    .array(),

  /** Taking out what is there, priced by what is coming OUT - not by what is going in. */
  removals: z
    .object({ removes: z.enum(KITCHEN_REMOVES), price: z.number(), sourceQuote: z.string() })
    .array(),

  /** Getting the room ready, priced separately from the installation. */
  prep: z
    .object({
      type: z.enum(KITCHEN_PREP),
      price: z.number(),
      unit: z.enum(['per_job', 'per_hour']),
      sourceQuote: z.string(),
    })
    .array(),

  /**
   * Every other priced line, and in this trade that is most of the quote.
   *
   * `type` carries one of the closed extra values where one applies and null otherwise - a handle
   * price is a real priced line with no home in the vocabulary, and null is the right answer rather
   * than the nearest guess. `label` is always the business's own wording, so nothing is lost.
   */
  extras: z
    .object({
      type: z.enum(KITCHEN_EXTRAS).nullable(),
      label: z.string(),
      price: z.number().nullable(),
      unit: z.enum(UNITS).nullable(),
      isFromPrice: z.boolean(),
      sourceQuote: z.string().nullable(),
    })
    .array(),

  warranty: z.object({ text: z.string().nullable(), sourceQuote: z.string().nullable() }),

  inclusions: z.string().array(),
  exclusions: z.string().array(),
  tags: z.enum(KITCHEN_TAGS).array(),

  otherOfferings: z
    .object({
      slug: z.string().nullable(),
      label: z.string(),
      price: z.number().nullable(),
      unit: z.enum(UNITS).nullable(),
      sourceQuote: z.string(),
    })
    .array(),

  couldNotUse: z.string().array(),
});
export type KitchenExtraction = z.infer<typeof kitchenExtractionSchema>;

/** Whatever the extraction stage returns, for the code between the model and the verifier. */
export type AnyExtraction = Extraction | TilingExtraction | KitchenExtraction;

/**
 * One trade per extraction call (`CLAUDE.md` non-negotiable #5), so the schema is chosen by trade
 * rather than made to cover several. A fencing rate is a material at a height per linear metre; a
 * tiling rate is not that shape, and widening one schema to hold both would hand the model a set of
 * fields where most are wrong for whatever it is reading - which is how a number ends up in the
 * nearest field that would take it.
 */
export const TRADE_EXTRACTION: Record<Trade, z.ZodType<AnyExtraction>> = {
  fencing: extractionSchema,
  tiling: tilingExtractionSchema,
  kitchen: kitchenExtractionSchema,
};

/**
 * zod -> the JSON Schema OpenAI's strict mode wants.
 *
 * zod already emits `additionalProperties: false` with every key in `required`, which is what
 * strict mode demands. Two things still need removing: `$schema`, and the keywords strict mode
 * does not support - our bounds live in verify.ts, where a failure can be reported to the business
 * instead of silently retried.
 */
const UNSUPPORTED = new Set([
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'minLength', 'maxLength', 'pattern', 'format', 'minItems', 'maxItems', 'default',
]);

export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.entries(node)
          .filter(([k]) => k !== '$schema' && !UNSUPPORTED.has(k))
          .map(([k, v]) => [k, strip(v)]),
      );
    }
    return node;
  };
  return strip(z.toJSONSchema(schema, { target: 'draft-2020-12' })) as Record<string, unknown>;
}
