import { beforeEach, describe, expect, it } from 'vitest';
import { runChat } from '../../src/client/controller.js';
import { detectTrade, routeTrade } from '../../src/client/routeTrade.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { TRADES } from '../../src/vocab.js';

/**
 * Which trade a conversation is about, when nobody told us.
 *
 * The frontend can send one and wins when it does, but the chat must not DEPEND on that: one shared
 * entry point, a pasted link, or a picker that was never built all arrive with nothing. Answering
 * "what type of fence are you after?" to somebody asking about their bathroom is the kind of wrong
 * that ends a conversation, so the customer's own words are read first and the question is a last
 * resort.
 */

let repo: MemoryRepository;

beforeEach(() => {
  repo = new MemoryRepository();
  setRepository(repo);
  clearSchemaCache();
});

describe('reading the trade out of what they said', () => {
  const both = [...TRADES];

  it('routes the obvious ones', () => {
    for (const message of [
      'I need a fence quote',
      'after a price for fencing',
      'how much to replace the palings',
      'boundary fence, 30 metres',
      'colorbond quote please',
      'need a new gate',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['fencing']);
    }

    for (const message of [
      'I want my bathroom tiled',
      'looking for a tiler',
      'how much to tile the floor',
      'kitchen splashback quote',
      'need the ensuite retiled',
      'porcelain tiles, 20 square metres',
      'the shower needs waterproofing',
      'regrouting the laundry',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['tiling']);
    }

    for (const message of [
      'I need a new kitchen',
      'kitchen renovation quote',
      'replacing our kitchen cabinets',
      'flat pack kitchen install',
      'stone benchtop and cupboards',
      'need a cabinetmaker',
      'walk in pantry',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['kitchen']);
    }
  });

  /**
   * The one overlap the compiler cannot see, and the reason kitchen's pattern is not simply
   * /kitchen/. A kitchen splashback is TILING work and tiling has published `kitchen_splashback`
   * as a job type since before this trade existed - so the bare noun is excluded where it is
   * qualifying a tiled surface, and the specific nouns carry the trade on their own.
   */
  it('leaves a tiled surface to tiling, however much it says kitchen', () => {
    for (const message of ['kitchen splashback quote', 'how much to tile the kitchen floor', 'retile the kitchen walls']) {
      expect(detectTrade(message, both), message).toEqual(['tiling']);
    }

    // Two jobs named at once is still two jobs, and still goes to the question.
    expect(detectTrade('new kitchen and retile the bathroom', both)).toEqual(['tiling', 'kitchen']);
  });

  /* A keyword that fires for both trades is worse than no keyword at all: it turns a clear message
     into an ambiguous one. These are the words that tempted their way onto the list and were left
     off - each of them appears in both trades and names neither. */
  it('does not treat words both trades use as a signal', () => {
    for (const message of ['I need a quote for the pool area', 'something for the back wall', 'an outdoor job']) {
      expect(detectTrade(message, both), message).toEqual([]);
    }
  });

  it('treats a message naming both as ambiguous, not as a guess', () => {
    expect(detectTrade('a new fence, and the bathroom retiled', both)).toEqual(['fencing', 'tiling']);
    expect(routeTrade('a new fence, and the bathroom retiled', undefined, undefined, both)).toEqual({
      trade: null,
      by: 'unresolved',
      ambiguous: true,
    });
  });

  it('puts the caller first, then the session, then the words', () => {
    // The frontend said so - a customer who arrived through a tiling page has already answered.
    expect(routeTrade('I need a fence quote', 'tiling', undefined, both).trade).toBe('tiling');
    // Already settled earlier in this conversation, and never revisited.
    expect(routeTrade('the old fence is coming out', undefined, 'tiling', both).trade).toBe('tiling');
    expect(routeTrade('I need a fence quote', undefined, undefined, both)).toMatchObject({ trade: 'fencing', by: 'keywords' });
  });

  /* Before tiling was onboarded there was one trade live, and asking "fencing or fencing?" would be
     absurd. The list comes from what is PUBLISHED, so this is the real state of the product on the
     day a second trade's schema first appears. */
  it('never asks when only one trade is live', () => {
    expect(routeTrade('I need a quote', undefined, undefined, ['fencing'])).toMatchObject({
      trade: 'fencing',
      by: 'only-trade',
    });
  });
});

describe('the conversation', () => {
  const turn = async (message: string, checklist: unknown) =>
    runChat(
      { message, sessionId: 'route-1', place: '', knownChecklist: checklist ? JSON.stringify(checklist) : '' },
      [],
      { repo },
    );

  it('goes straight into the trade the customer named, with no extra question', async () => {
    const fencing = await turn('I need a fence quote', null);
    expect(fencing.trade).toBe('fencing');
    expect(fencing.message).not.toContain('looking for');

    const tiling = await turn('I want my bathroom tiled', null);
    expect(tiling.trade).toBe('tiling');
  });

  it('asks when nobody has said and the words do not settle it', async () => {
    const asked = await turn('hi, I need a quote', null);

    expect(asked.type).toBe('question');
    expect(asked.trade).toBeNull();
    expect(asked.message).toBe('Are you looking for Fencing, Tiling or Kitchen fitting services?');
    expect(asked.options.map((o) => o.value)).toEqual(['fencing', 'tiling', 'kitchen']);
  });

  it('says so differently when they named two jobs at once', async () => {
    const asked = await turn('a new fence, and the bathroom retiled', null);

    expect(asked.type).toBe('question');
    expect(asked.message).toContain('more than one job');
  });

  it('carries on into the trade they pick, and keeps it for the rest of the conversation', async () => {
    let response = await turn('hi, I need a quote', null);
    expect(response.trade).toBeNull();

    response = await turn('tiling', response.checklist);
    expect(response.trade).toBe('tiling');

    // "the old floor" says nothing about a trade, and must not un-settle the one already chosen.
    response = await turn('yes', response.checklist);
    expect(response.trade).toBe('tiling');
    expect(response.checklist._ui?.trade).toBe('tiling');
  });

  /* The one that would be invisible if it broke: a word from the other trade, mid-conversation,
     re-routing everything already answered. "The old fence is coming out" is a perfectly ordinary
     thing to say while having a floor tiled. */
  it('does not re-route on a stray word from the other trade', async () => {
    let response = await turn('I want my bathroom tiled', null);
    response = await turn('yes', response.checklist);
    response = await turn('the old fence is coming out too', response.checklist);

    expect(response.trade).toBe('tiling');
  });

  it('loses nothing by having asked - the checklist comes back untouched', async () => {
    const known = { material: 'colorbond', _ui: { turn: 3, cursor: {}, lastAsked: null, lastQuestion: '', lastValues: [], lastType: 'message', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null, place: null, answers: 0 } };
    const asked = await turn('I need a quote', known);

    expect(asked.type).toBe('question');
    expect(asked.checklist.material).toBe('colorbond');
  });
});
