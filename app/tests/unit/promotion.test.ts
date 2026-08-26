import { describe, expect, it } from 'vitest';
import { PROMOTE_AT, readyForPromotion, resolveExisting, slugify, type ExtraValue } from '../../src/vocabulary.js';
import { MemoryRepository } from '../../src/store.js';

/**
 * The ground rule of `docs/DYNAMIC-SCHEMA-PLAN.md`: the model may PROPOSE a new value, it may never
 * write one into the trade's own vocabulary. What it proposes lands in `extras`, recognised when a
 * customer names it and never offered as one of three choices, until enough independent businesses
 * have offered the same thing that it has stopped being one business's word for it.
 *
 * The failure this guards is the only silent, permanent one in the system (`CONTEXT.md` §8): two
 * slugs for one real offering, each invisible to a search for the other, with no error anywhere.
 */

const extra = (label: string, aliases: string[], businessCount: number): ExtraValue => ({
  label,
  aliases,
  businessCount,
  firstSeen: '2026-01-01T00:00:00.000Z',
  lastSeen: '2026-01-01T00:00:00.000Z',
});

describe('resolveExisting', () => {
  const extras = {
    'bamboo-screen': extra('Bamboo screening', ['bamboo screening', 'bamboo screens'], 1),
    'brushwood-panel': extra('Brushwood panels', ['brushwood panels'], 1),
  };

  it('joins the same offering said differently', () => {
    expect(resolveExisting('Bamboo screening', extras)).toBe('bamboo-screen');
    expect(resolveExisting('bamboo screens', extras)).toBe('bamboo-screen');
    expect(resolveExisting('Screening, bamboo', extras)).toBe('bamboo-screen');
  });

  it('leaves a genuinely different offering alone', () => {
    expect(resolveExisting('Slat fencing', extras)).toBeNull();
    expect(resolveExisting('Steel picket', extras)).toBeNull();
  });

  it('refuses to guess when two are equally close', () => {
    const ambiguous = { 'pool-glass': extra('Pool glass', [], 1), 'pool-aluminium': extra('Pool aluminium', [], 1) };
    // "Pool fencing" shares "pool" with both. A wrong join has already lost data; a duplicate can
    // still be merged later.
    expect(resolveExisting('Pool fencing', ambiguous)).toBeNull();
  });

  it('says nothing about an empty vocabulary', () => {
    expect(resolveExisting('Bamboo screening', {})).toBeNull();
    expect(resolveExisting('', extras)).toBeNull();
  });
});

describe('the promotion ladder', () => {
  it('waits for three independent businesses', () => {
    const extras = {
      'bamboo-screen': extra('Bamboo screening', [], 2),
      'brushwood-panel': extra('Brushwood panels', [], PROMOTE_AT),
    };
    expect(readyForPromotion(extras, ['colorbond'])).toEqual(['brushwood-panel']);
  });

  it('never promotes something already in the vocabulary', () => {
    const extras = { colorbond: extra('Colorbond', [], 9) };
    expect(readyForPromotion(extras, ['colorbond'])).toEqual([]);
  });
});

describe('three businesses saying the same thing three ways', () => {
  it('land on one slug with three aliases, and reach the threshold', async () => {
    const repo = new MemoryRepository();
    const said = ['Bamboo screening', 'bamboo screens', 'Screening - bamboo'];

    for (const label of said) {
      await repo.mergeTradeExtras('fencing', [{ slug: slugify(label), label }]);
    }

    const vocab = await repo.getTradeVocabulary('fencing');
    const slugs = Object.keys(vocab!.extras);

    expect(slugs).toHaveLength(1); // not three
    const only = vocab!.extras[slugs[0]!]!;
    expect(only.businessCount).toBe(PROMOTE_AT);
    expect(only.aliases).toEqual(expect.arrayContaining(said.map((s) => s.toLowerCase())));
    expect(readyForPromotion(vocab!.extras, ['colorbond'])).toEqual(slugs);
  });

  it('keeps genuinely different offerings apart', async () => {
    const repo = new MemoryRepository();
    for (const label of ['Bamboo screening', 'Brushwood panels', 'Slat fencing']) {
      await repo.mergeTradeExtras('fencing', [{ slug: slugify(label), label }]);
    }
    const vocab = await repo.getTradeVocabulary('fencing');
    expect(Object.keys(vocab!.extras)).toHaveLength(3);
  });
});
