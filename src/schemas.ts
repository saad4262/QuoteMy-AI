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
  action: z.enum(['submit', 'confirm', 'profile', 'review', 'extract']).default('submit'),
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
  approved: z.boolean(),
  fixes: z
    .object({
      // "missing" = they never said it. "unclear" = they said it, but not in a form we can quote
      // from. The two are different jobs for the business, so they are shown separately.
      kind: z.enum(['missing', 'unclear']),
      what: z.string(),
      example: z.string().nullable(),
    })
    .array(),
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

  siteConditions: z
    .object({ condition: z.enum(CONDITIONS), extraPerMetre: z.number(), sourceQuote: z.string() })
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

  inclusions: z.string().array(),
  exclusions: z.string().array(),
  tags: z.enum(TAGS).array(),
  unmapped: z.string().array(),
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
