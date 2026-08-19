import { z } from 'zod';

/**
 * zod -> the JSON Schema OpenAI's strict mode wants.
 *
 * zod 4 already emits `additionalProperties: false` with every key in `required`, which is exactly
 * what strict mode demands. Two things still need fixing up:
 *   - the `$schema` key, which OpenAI rejects
 *   - `minimum`/`maximum`/`format` and friends, which strict mode does not support (our bounds live
 *     in src/validation, where a failure can be reported to the business instead of silently retried)
 */
const UNSUPPORTED = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minItems',
  'maxItems',
  'default',
]);

function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '$schema' || UNSUPPORTED.has(k)) continue;
      out[k] = strip(v);
    }
    return out;
  }
  return node;
}

export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return strip(z.toJSONSchema(schema, { target: 'draft-2020-12' })) as Record<string, unknown>;
}
