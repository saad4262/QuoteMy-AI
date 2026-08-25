import { describe, expect, it } from 'vitest';
import { extractionSchema } from '../../src/schemas.js';
import { reviewSchema } from '../../src/schemas.js';
import { toStrictJsonSchema } from '../../src/schemas.js';
import { MATERIALS } from '../../src/vocab.js';

describe('strict json_schema generation', () => {
  const schema = toStrictJsonSchema(extractionSchema) as Record<string, unknown>;

  it('satisfies what OpenAI strict mode demands: every key required, no extra properties', () => {
    expect(schema.additionalProperties).toBe(false);
    const properties = Object.keys(schema.properties as object);
    expect(schema.required).toEqual(properties);
  });

  it('does not emit keys strict mode rejects', () => {
    const json = JSON.stringify(schema);
    for (const key of ['$schema', 'minimum', 'maximum', 'pattern', 'format']) {
      expect(json).not.toContain(`"${key}"`);
    }
  });

  it('carries the vocabulary through from vocab.ts, so the two cannot drift apart', () => {
    const rates = (schema.properties as Record<string, { items: { properties: Record<string, { enum: string[] }> } }>).rates;
    expect(rates.items.properties.material.enum).toEqual([...MATERIALS]);
  });

  it('produces a valid strict schema for the review stage too', () => {
    const review = toStrictJsonSchema(reviewSchema) as Record<string, unknown>;
    expect(review.additionalProperties).toBe(false);
    expect(review.required).toEqual(['outcome', 'fixes', 'alsoWorthAdding']);
  });
});

describe('extraction schema', () => {
  it('expresses "not stated" as null rather than a missing key, so the shape never changes', () => {
    const parsed = extractionSchema.safeParse({
      businessName: null,
      gstIncluded: null,
      gstSourceQuote: null,
      serviceArea: { baseLocation: null, radiusKm: null, radiusSourceQuote: null, excludedAreas: [] },
      minimumCharge: null,
      minimumChargeSourceQuote: null,
      rates: [],
      removals: [],
      gates: [],
      siteConditions: [],
      specs: [],
      permits: { included: null, fee: null, sourceQuote: null },
      warranty: { years: null, text: null, sourceQuote: null },
  specs: [],
  permits: { included: null, fee: null, sourceQuote: null },
  warranty: { years: null, text: null, sourceQuote: null },
      extras: [],
      inclusions: [],
      exclusions: [],
      tags: [],
      otherOfferings: [],
  couldNotUse: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('refuses a material outside the closed list', () => {
    const parsed = extractionSchema.shape.rates.safeParse([
      { material: 'treatedPinePaling', heightM: 1.8, pricePerMetre: 85, sourceQuote: 'x' },
    ]);
    expect(parsed.success).toBe(false);
  });
});
