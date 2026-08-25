import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearVocabularyCache,
  coreOf,
  extrasForPrompt,
  extrasPromptBlock,
  loadVocabulary,
  recordExtras,
  slugify,
  type TradeVocabulary,
} from '../../src/vocabulary.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { MATERIALS } from '../../src/vocab.js';

beforeEach(() => {
  clearVocabularyCache();
  setRepository(new MemoryRepository());
});

describe('slugify', () => {
  it('is deterministic, and code builds it - the model never returns one', () => {
    expect(slugify('Bamboo screening')).toBe('bamboo-screening');
    expect(slugify('  BAMBOO   Screening!  ')).toBe('bamboo-screening');
  });

  it('folds a trailing plural, so one thing does not become two slugs', () => {
    expect(slugify('bamboo screens')).toBe(slugify('bamboo screen'));
    expect(slugify('privacy screens')).toBe('privacy-screen');
  });

  it('does not mangle a word that merely ends in s', () => {
    expect(slugify('glass')).toBe('glass'); // double-s guard: not "glas"
    expect(slugify('brushwood')).toBe('brushwood');
    expect(slugify('gas struts')).toBe('gas-strut'); // short word kept, plural folded
  });

  it('always returns something usable', () => {
    expect(slugify('!!!')).toBe('other');
  });
});

describe('the second business', () => {
  it('is shown what the first one created, and can reuse it', async () => {
    // first business introduces something new
    await recordExtras('fencing', [{ slug: 'bamboo-screening', label: 'Bamboo screening' }]);

    const vocabulary = await loadVocabulary('fencing');
    const shown = extrasForPrompt(vocabulary, 'we also do bamboo screening at 1.8m');

    expect(shown.map(([slug]) => slug)).toContain('bamboo-screening');
    expect(extrasPromptBlock(shown)).toContain('bamboo-screening');
  });

  it('records their wording as an alias, and counts the business', async () => {
    await recordExtras('fencing', [{ slug: 'bamboo-screening', label: 'Bamboo screening' }]);
    await recordExtras('fencing', [{ slug: 'bamboo-screening', label: 'Bamboo screen' }]);

    const { extras } = await loadVocabulary('fencing');
    expect(Object.keys(extras)).toEqual(['bamboo-screening']); // one entry, not two
    expect(extras['bamboo-screening']?.businessCount).toBe(2);
    expect(extras['bamboo-screening']?.aliases).toEqual(['bamboo screening', 'bamboo screen']);
  });
});

describe('the core never grows on its own', () => {
  it('is whatever vocab.ts says, whatever the extras do', async () => {
    await recordExtras('fencing', [{ slug: 'bamboo-screening', label: 'Bamboo screening' }]);
    const vocabulary = await loadVocabulary('fencing');
    expect(vocabulary.core.materials).toEqual(MATERIALS);
  });
});

describe('what goes into the prompt', () => {
  const many = (n: number): TradeVocabulary => ({
    ...coreOf('fencing'),
    extras: Object.fromEntries(
      Array.from({ length: n }, (_, i) => [
        `filler-${i}`,
        { label: `Filler ${i}`, aliases: [], businessCount: n - i },
      ]),
    ),
  });

  it('is capped, however long the list gets', () => {
    expect(extrasForPrompt(many(200), 'timber 1.8m $85/m')).toHaveLength(30);
  });

  it('always includes one the submission actually mentions, even when it is unpopular', () => {
    const vocabulary = many(200);
    vocabulary.extras['bamboo-screening'] = {
      label: 'Bamboo screening',
      aliases: ['bamboo screen'],
      businessCount: 1, // least used of all - would never make the top 30 on its own
    };

    const shown = extrasForPrompt(vocabulary, 'we do bamboo screen fencing too');
    expect(shown.map(([slug]) => slug)).toContain('bamboo-screening');
  });

  it('says nothing at all until a trade has learned something', () => {
    expect(extrasPromptBlock(extrasForPrompt(coreOf('fencing'), 'anything'))).toBe('');
  });
});
