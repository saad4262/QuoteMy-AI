import { z } from 'zod';
import { CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, TAGS, UNITS } from '../shared/vocab.js';

/**
 * Agent 2's output — one trade per call.
 *
 * Every enum comes from vocab.ts, so the schema sent to the model, the validator that checks the
 * reply and the TypeScript types can never disagree. Everything is `.nullable()` rather than
 * `.optional()` on purpose: OpenAI's strict mode requires every key to be in `required`, so
 * "not stated" has to be expressible as a value. That is also what keeps the response shape
 * identical between a business that listed ten things and one that listed two.
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

  removals: z
    .object({
      removes: z.enum(REMOVES),
      pricePerMetre: z.number(),
      sourceQuote: z.string(),
    })
    .array(),

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
    .object({
      condition: z.enum(CONDITIONS),
      extraPerMetre: z.number(),
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

  inclusions: z.string().array(),
  exclusions: z.string().array(),
  tags: z.enum(TAGS).array(),
  unmapped: z.string().array(),
});

export type Extraction = z.infer<typeof extractionSchema>;
