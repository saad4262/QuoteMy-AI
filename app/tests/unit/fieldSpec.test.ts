import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../../src/messages.js';
import { askedFields, FENCING_FIELDS, FIELD_TYPES, specOf } from '../../src/client/fieldSpec.js';
import { ALL_FIELDS, FIELDS, HEIGHT_FALLBACK, LENGTHS, QUANTITIES } from '../../src/client/vocab.js';

/**
 * `FENCING_FIELDS` is a restatement of constants that still live in three other files, and the
 * whole migration rests on it being an exact one. Everything importable is checked against its
 * original rather than against a second hand-written copy - a copy would drift the first time
 * somebody edited one side.
 *
 * Titles and pinned options are the exception: they are module-private in `formatResult.ts` today,
 * so they are restated here. Step 4 deletes those originals, at which point this becomes the only
 * statement of them and the golden snapshots are what hold them still.
 */

describe('FENCING_FIELDS', () => {
  it('lists every field, in the order the chat asks them', () => {
    expect(FENCING_FIELDS.map((f) => f.key)).toEqual([...FIELDS, 'existingPrice']);
    expect(FENCING_FIELDS.map((f) => f.key)).toEqual([...ALL_FIELDS]);
  });

  it('asks everything except existingPrice', () => {
    expect(askedFields(FENCING_FIELDS).map((f) => f.key)).toEqual([...FIELDS]);
    expect(specOf(FENCING_FIELDS, 'existingPrice')?.asked).toBe(false);
  });

  it('only uses types the code knows how to handle', () => {
    for (const field of FENCING_FIELDS) expect(FIELD_TYPES).toContain(field.type);
  });

  it('carries the same question wording as messages.ts', () => {
    for (const [key, question] of Object.entries(QUESTIONS)) {
      expect(specOf(FENCING_FIELDS, key)?.question).toBe(question);
    }
    // The one question that is not in QUESTIONS - it lives in schema.ts's FALLBACK_QUESTIONS.
    expect(specOf(FENCING_FIELDS, 'suburb')?.question).toBe('Which suburb is the fence going in?');
  });

  it('carries the same literal option lists', () => {
    expect(specOf(FENCING_FIELDS, 'lengthMeters')?.options).toEqual([...LENGTHS]);
    expect(specOf(FENCING_FIELDS, 'gateQty')?.options).toEqual([...QUANTITIES]);
    expect(specOf(FENCING_FIELDS, 'heightKey')?.options).toEqual([...HEIGHT_FALLBACK]);
  });

  it('points the vocabulary fields at the trade schema, not at a literal list', () => {
    expect(specOf(FENCING_FIELDS, 'material')?.source).toBe('core.materials');
    expect(specOf(FENCING_FIELDS, 'removal')?.source).toBe('core.removes');
    expect(specOf(FENCING_FIELDS, 'conditions')?.source).toBe('core.conditions');
    expect(specOf(FENCING_FIELDS, 'gateType')?.source).toBe('core.gateTypes');
    // Only material recognises a one-business offering that has no slug in the vocabulary.
    expect(specOf(FENCING_FIELDS, 'material')?.acceptsExtras).toBe(true);
    for (const key of ['removal', 'conditions', 'gateType']) {
      expect(specOf(FENCING_FIELDS, key)?.acceptsExtras).toBeUndefined();
    }
  });

  it('reproduces the titles and pinned answers formatResult.ts uses today', () => {
    expect(Object.fromEntries(askedFields(FENCING_FIELDS).map((f) => [f.key, f.title]))).toEqual({
      suburb: 'Suburb',
      material: 'Material',
      heightKey: 'Height',
      lengthMeters: 'Length',
      removal: 'Old fence',
      conditions: 'Site conditions',
      gateType: 'Gate',
      gateQty: 'Gates',
    });

    const pinned = Object.fromEntries(FENCING_FIELDS.filter((f) => f.pinned).map((f) => [f.key, f.pinned]));
    expect(pinned).toEqual({
      removal: { label: 'Nothing to remove', value: 'none' },
      conditions: { label: 'Nothing tricky', value: 'none' },
      gateType: { label: 'No gates', value: 'none' },
    });
  });

  it('only asks for a gate quantity when a gate was actually chosen', () => {
    expect(specOf(FENCING_FIELDS, 'gateQty')?.dependsOn).toEqual({ field: 'gateType', notEquals: 'none' });
    // Nothing else is conditional today; a second dependency should be a deliberate change.
    expect(FENCING_FIELDS.filter((f) => f.dependsOn).map((f) => f.key)).toEqual(['gateQty']);
  });

  it('names no field twice, and every dependency points at a field that exists', () => {
    const keys = FENCING_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const field of FENCING_FIELDS) {
      if (field.dependsOn) expect(keys).toContain(field.dependsOn.field);
    }
  });
});
