import { z } from 'zod';
import { CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, TAGS, TRADES, UNITS } from './vocab.js';

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
  documents: z.object({ label: z.string(), text: z.string(), unreadable: z.boolean() }).array(),
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
