import { describe, expect, it } from 'vitest';
import { CUSTOMER_CORE, QUESTIONS } from '../../src/messages.js';
import { askedFields, FENCING_FIELDS, FIELD_TYPES, specOf, TRADE_FIELDS } from '../../src/client/fieldSpec.js';
import { HEIGHT_FALLBACK, QUANTITIES } from '../../src/client/vocab.js';
import { TRADES, type Trade } from '../../src/vocab.js';

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
    // Restated rather than compared against a constant: as of step 8 the spec IS the order, and the
    // golden snapshots are what hold it still.
    expect(FENCING_FIELDS.map((f) => f.key)).toEqual([
      'suburb', 'material', 'heightKey', 'lengthMeters', 'removal', 'conditions', 'gateType', 'gateQty', 'existingPrice',
    ]);
  });

  it('asks everything except existingPrice', () => {
    expect(askedFields(FENCING_FIELDS).map((f) => f.key)).toEqual([
      'suburb', 'material', 'heightKey', 'lengthMeters', 'removal', 'conditions', 'gateType', 'gateQty',
    ]);
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
    expect(specOf(FENCING_FIELDS, 'suburb')?.question).toBe('Which suburb is the fence going in? A postcode works too.');
  });

  it('carries the same literal option lists', () => {
    // A length has no list at all: it is whatever the boundary measures, and three guesses at a
    // number the customer already knows only invited them to round it.
    expect(specOf(FENCING_FIELDS, 'lengthMeters')?.options).toBeUndefined();
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
      gateQty: 'Number of gates',
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

/**
 * The guard on the one failure in this system that is silent and permanent.
 *
 * `docHints` names slugs, and a slug that is not in the trade's vocabulary is not an error anywhere:
 * the reader hands it to `mergeAndDecide`, `validate` finds no such option, returns null, and the
 * field comes back unanswered. No throw, no log, nothing on a screen - just a document that
 * mysteriously reads worse than it should. `CONTEXT.md` §8 is about exactly this shape of failure.
 *
 * Written across every trade rather than for fencing, because it is a rule about hints and not
 * about fences: the twentieth trade's hints are checked the day they are written, by this test,
 * without anybody remembering to come back here.
 */
describe('every trade`s document hints', () => {
  /**
   * `CUSTOMER_CORE`, and not `TRADE_VOCAB`.
   *
   * A hint is checked against what `validate` will check it against, which is `schema.core` - and
   * that is seeded from `CUSTOMER_CORE` (`schema.ts` builds the compiled fallback from it), not
   * from the business vocabulary. The two genuinely differ: tiling's customer-facing `removes`
   * deliberately drops `adhesive`, "a business-side line, not something a customer looking at a
   * tiled floor would ever pick".
   *
   * Checked against the business list instead, a hint for `adhesive` would pass here and be dropped
   * in silence by `validate` - the exact failure this whole describe block exists to catch.
   */
  const offeredFor = (trade: Trade, source: string): string[] => {
    const found = source
      .split('.')
      .reduce<unknown>(
        (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
        { core: CUSTOMER_CORE[trade] },
      );
    return Array.isArray(found) ? found.map(String) : [];
  };

  for (const trade of TRADES) {
    it(`only names ${trade} values that ${trade} actually offers`, () => {
      for (const spec of TRADE_FIELDS[trade]) {
        const hints = spec.docHints;
        if (!hints || !('values' in hints)) continue;

        // A hint list with no vocabulary behind it cannot be checked, and would be checked against
        // nothing in silence - which is the failure this test exists to prevent.
        expect(spec.source, `${trade}.${spec.key} has hints but no source to check them against`).toBeTruthy();
        const offered = offeredFor(trade, spec.source!);
        expect(offered.length, `${trade}.${spec.key}: ${spec.source} resolved to nothing`).toBeGreaterThan(0);

        /* A pinned answer is the field's own "there is none of this" - "Not needed", "Nothing to
           take up". It is a real answer to the question and belongs in no vocabulary list, so a
           document that states it ("waterproofing not included") is answering rather than drifting. */
        const answerable = spec.pinned ? [...offered, spec.pinned.value] : offered;

        for (const [slug] of hints.values) {
          expect(answerable, `${trade}.${spec.key} hints at "${slug}", which ${trade} never offers`).toContain(slug);
        }
      }
    });

    it(`points every ${trade} hint at a field type that can use it`, () => {
      for (const spec of TRADE_FIELDS[trade]) {
        if (!spec.docHints) continue;
        const shape = 'values' in spec.docHints ? 'values' : 'quantity';
        // `money` reads a total with no hints at all, and `place` is not a checklist value.
        expect(
          shape === 'values' ? ['enum', 'multiEnum'] : ['number', 'measure'],
          `${trade}.${spec.key} is a ${spec.type} carrying ${shape} hints`,
        ).toContain(spec.type);
      }
    });
  }

  it('files a hinted field under its own key unless it says otherwise', () => {
    /* `docKey` exists for one field and should stay that way: it is the seam where a reader's name
       for a value differs from the checklist's, and every one of those is a thing to remember. */
    const renamed = Object.fromEntries(
      TRADES.flatMap((trade) =>
        TRADE_FIELDS[trade].filter((f) => f.docKey).map((f) => [`${trade}.${f.key}`, f.docKey]),
      ),
    );
    expect(renamed).toEqual({ 'fencing.heightKey': 'heightMm' });
  });
});
