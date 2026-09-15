import { beforeEach, describe, expect, it } from 'vitest';
import { mergeAndDecide } from '../../src/client/mergeAndDecide.js';
import { clearSchemaCache, loadTradeSchema, type TradeSchema } from '../../src/client/schema.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import type { Checklist, Place, TurnExtraction, UiState } from '../../src/client/schemas.js';

/**
 * A customer naming something we have no word for.
 *
 * They cannot know what we cover. Answering "wallpaper hanging" and being asked the same question
 * again reads as a broken assistant, and it is: they named a real thing and were told nothing.
 * `schemas.ts` has always said so - "telling them 'sorry, I didn't catch that' is a lie and a dead
 * end, so it is taken as their answer" - and the honest place to find out nobody does it is the
 * results screen, with the nearest alternatives beside it.
 *
 * It worked for single-choice fields and silently did not for multi-choice ones.
 */

const PLACE: Place = { latitude: -38.03, longitude: 145.34, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' };

let fencing: TradeSchema;
let reno: TradeSchema;

beforeEach(async () => {
  setRepository(new MemoryRepository());
  clearSchemaCache();
  fencing = await loadTradeSchema('fencing');
  reno = await loadTradeSchema('home_renovation');
});

const ui = (lastAsked: string): UiState =>
  ({
    turn: 7, cursor: {}, lastAsked, lastQuestion: 'q', lastValues: [], lastType: 'question',
    fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null, place: PLACE,
  }) as unknown as UiState;

const turn = (over: Partial<TurnExtraction> = {}): TurnExtraction =>
  ({
    ack: '', clearFields: [], suggestedSuburb: null, wantsMoreOptions: false, confirmed: false,
    offTopic: false, askedAbout: null, namedOffList: null, askedKind: null, pictureOf: null,
    mentionedOldFence: false, checklist: {}, ...over,
  }) as unknown as TurnExtraction;

const run = (schema: TradeSchema, field: string, message: string, over: Partial<TurnExtraction> = {}) =>
  mergeAndDecide({
    sessionId: 's', message, place: PLACE,
    known: { suburb: 'Berwick, VIC 3806', _ui: ui(field) } as Partial<Checklist>,
    turnExtraction: turn(over),
    docFacts: {}, docSuburbHint: null, haystackText: message + ' ', schema,
  } as never);

describe('an answer that is not in our vocabulary', () => {
  /** Single choice, reported by the model. This half already worked and must keep working. */
  it('takes a single-choice answer the model reported as off-list', () => {
    const r = run(fencing, 'material', 'tubular steel', { namedOffList: 'tubular steel' });
    expect(r.checklist.material).toBe('other:tubular-steel');
    expect(r.offListChoice?.label).toBe('Tubular steel');
  });

  /**
   * THE HALF THAT WAS MISSING, and the shape matters as much as the value: a multi-choice field is
   * an ARRAY everywhere downstream, and a bare string in one renders character by character.
   */
  it('takes a multi-choice answer, as an array', () => {
    const r = run(reno, 'extras', 'wallpaper hanging', { namedOffList: 'wallpaper hanging' });
    expect(r.checklist.extras).toEqual(['other:wallpaper-hanging']);
  });

  /**
   * The turn call runs on `gpt-4o-mini` on purpose, and mini does not report `namedOffList` on a
   * multi-choice field - measured 0 of 5 on the real production prompt with the wanted phrase
   * written into the instruction, against 5 of 5 on the larger model. So code reads it, and only
   * here, and only because the parser has already returned a definite "none of this is ours".
   */
  it('takes a multi-choice answer even when the model reports nothing', () => {
    const r = run(reno, 'extras', 'wallpaper hanging');
    expect(r.checklist.extras).toEqual(['other:wallpaper-hanging']);
  });

  it('does the same for a site condition nobody has a word for', () => {
    const r = run(fencing, 'conditions', 'there is a beehive');
    expect(r.checklist.conditions).toEqual(['other:there-is-a-beehive']);
  });

  /** An explicit "nothing else" is an ANSWER, not an unknown word, and must stay an empty array. */
  it('leaves an explicit none alone', () => {
    expect(run(reno, 'extras', 'none').checklist.extras).toEqual([]);
    expect(run(fencing, 'conditions', 'nothing tricky').checklist.conditions).toEqual([]);
  });

  /** A value we DO have must never be stored as somebody's own words. */
  it('leaves a real value alone', () => {
    expect(run(reno, 'extras', 'painting').checklist.extras).toEqual(['painting']);
    expect(run(fencing, 'conditions', 'rock').checklist.conditions).toEqual(['rock']);
  });

  /** A sentence is a customer talking, and a number is never a choice on these fields. */
  it('refuses a sentence and refuses a number', () => {
    const long = run(reno, 'extras', 'well I was thinking we might possibly want a few things done');
    expect(long.checklist.extras ?? null).toBeNull();
    expect(run(reno, 'extras', '25 square metres').checklist.extras ?? null).toBeNull();
  });

  /** Only the question just asked. A stray word must not land in a field nobody was asked about. */
  it('only fills the field that was actually asked', () => {
    expect(run(reno, 'room', 'wallpaper hanging').checklist.extras ?? null).toBeNull();
  });
});
