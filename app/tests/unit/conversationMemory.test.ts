import { beforeEach, describe, expect, it } from 'vitest';
import { buildAgentContext } from '../../src/client/agent.js';
import { answerQuestion, clearAnswerCache } from '../../src/client/askAbout.js';
import { guideRange } from '../../src/client/budget.js';
import { runChat } from '../../src/client/controller.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { resetChatSpend } from '../../src/client/spend.js';
import { MockAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import type { AskContext, Checklist, TurnNote, UiState } from '../../src/client/schemas.js';
import { BERWICK, seedBusiness } from '../golden/conversations.js';

/**
 * What the conversation remembers, beyond its answers.
 *
 * The checklist has always been a good memory of what was SETTLED, and no memory at all of anything
 * else - which is where this kept going wrong in ways a customer notices immediately. Somebody
 * wrote "I live in Pakenham, so which tile suits me" and got a careful answer that never once said
 * Pakenham. Somebody was told "porcelain is usually the pick", and one turn later the model reading
 * "let's go with the one you said" had no idea what had been said, because nothing carried it.
 *
 * `ui.history` is that gap closed. These tests hold it to the two things that make it safe: it
 * remembers only what the checklist cannot, and it never becomes an answer.
 */

const memory = (): { repo: MemoryRepository } => {
  const repo = new MemoryRepository();
  seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates');
  setRepository(repo);
  return { repo };
};

beforeEach(() => {
  clearSchemaCache();
  clearAnswerCache();
  resetChatSpend();
});

/** One turn of a real conversation, feeding the last response's checklist back in as the client does. */
async function say(message: string, checklist: Checklist | null, repo: MemoryRepository) {
  return runChat(
    {
      trade: 'fencing',
      message,
      sessionId: 'memory',
      place: JSON.stringify(BERWICK),
      knownChecklist: checklist ? JSON.stringify(checklist) : '',
    } as never,
    [],
    { repo },
  );
}

describe('what a conversation remembers', () => {
  it('keeps what was said in words, on both sides', async () => {
    const { repo } = memory();
    const first = await say('my fence blew over in the storm', null, repo);
    const history = first.checklist._ui?.history ?? [];

    expect(history).toHaveLength(1);
    expect(history[0]!.you).toBe('my fence blew over in the storm');
    // What we said back, not only what we asked - an answer to their own question lives in here too.
    expect(history[0]!.me).toBe(first.message.replace(/\s+/g, ' ').trim());
  });

  /**
   * The whole reason this is affordable. A tapped option is already recorded, exactly and
   * permanently, as `checklist.material = 'colorbond'` - writing "they said: colorbond" beside it
   * is the same fact twice, in a payload that rides through the client on every single request.
   */
  it('does not write down a tap, which the checklist already holds', async () => {
    const { repo } = memory();
    const opened = await say('I need a fence quote', null, repo);
    const suburb = await say('yes go ahead', opened.checklist, repo);
    const before = suburb.checklist._ui?.history?.length ?? 0;

    // Whatever was on screen last turn, tapped rather than typed.
    const tapValue = String(suburb.options[0]?.value ?? '');
    const tapped = await say(tapValue, suburb.checklist, repo);

    expect(tapValue).not.toBe('');
    expect(tapped.checklist._ui?.history?.length ?? 0).toBe(before);
  });

  it('remembers only the last handful, oldest dropped first', async () => {
    const { repo } = memory();
    let checklist: Checklist | null = null;
    let response = await say('I need a fence quote', null, repo);
    checklist = response.checklist;

    for (const line of ['tell me about colorbond', 'and timber', 'what about steel', 'and a gate', 'ok', 'right', 'sure']) {
      response = await say(line, checklist, repo);
      checklist = response.checklist;
    }

    const history = response.checklist._ui?.history ?? [];
    expect(history).toHaveLength(6);
    // The opening line has been pushed out; the most recent is still there.
    expect(history.some((note) => note.you === 'I need a fence quote')).toBe(false);
    expect(history[history.length - 1]!.you).toBe('sure');
  });

  /**
   * The line this must not cross. `history` is what was SAID, and saying a word is not choosing it:
   * a customer who asked about colorbond three turns ago has not answered the fence-type question,
   * and only this turn's message can. Nothing here may reach the checklist.
   */
  it('never becomes an answer', async () => {
    const { repo } = memory();
    let response = await say('is colorbond any good in a windy spot?', null, repo);
    response = await say('yes go ahead', response.checklist, repo);

    expect(response.checklist._ui?.history?.length).toBeGreaterThan(0);
    expect(response.checklist.material ?? null).toBeNull();
  });
});

describe('what the model is shown', () => {
  const note = (you: string, me: string): TurnNote => ({ you, me });

  it('reads the earlier turns, oldest first, before this one', () => {
    const context = buildAgentContext({
      message: "let's go with the one you recommended",
      extractedText: '',
      docFacts: {},
      docSuburbHint: null,
      known: {},
      ui: {
        history: [note('which is better?', 'Porcelain is usually the pick.'), note('and in a wet area?', 'It handles wet fine.')],
      } as unknown as UiState,
    });

    expect(context).toContain('Earlier in this conversation');
    expect(context.indexOf('Porcelain is usually the pick.')).toBeLessThan(context.indexOf('It handles wet fine.'));
    // This turn's message still leads, so nothing older reads as the thing being answered.
    expect(context.indexOf("let's go with the one you recommended")).toBe(0);
  });

  it('says nothing at all when there is nothing to remember', () => {
    const context = buildAgentContext({
      message: 'hello',
      extractedText: '',
      docFacts: {},
      docSuburbHint: null,
      known: {},
      ui: null,
    });
    expect(context).not.toContain('Earlier in this conversation');
  });
});

/** A client that hands back the call it was given, so the search's own inputs can be inspected. */
function capturingAi(): { ai: AiClient; call: () => ModelCall<unknown> | null; calls: () => number } {
  const inner = new MockAiClient();
  let seen: ModelCall<unknown> | null = null;
  let calls = 0;
  return {
    call: () => seen,
    calls: () => calls,
    ai: {
      model: 'capturing',
      async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
        if (call.name !== 'answer') return inner.callStructured(call);
        seen = call as ModelCall<unknown>;
        calls += 1;
        return {
          data: call.schema.parse({ text: 'Porcelain is the usual pick.', sources: [] }),
          usage: { name: call.name, ms: 1, tokensIn: 0, tokensOut: 0, retries: 0, costUsd: 0 },
        };
      },
    },
  };
}

const CONTEXT: AskContext = {
  trade: 'tiling',
  suburb: 'Pakenham',
  state: 'VIC',
  material: null,
  asked: null,
  choices: [],
  everything: [],
  history: [],
};

describe('a question asked from somewhere', () => {
  /**
   * A rates answer is only as local as the search behind it. Pointed at `country: 'AU'` alone it
   * came back with national aggregator figures, and a Victorian customer was shown numbers off a
   * Sydney page as though somebody had quoted them.
   */
  it('points the search at their city and state', async () => {
    const model = capturingAi();
    await answerQuestion({ question: "what's tiling going for", kind: 'rates' }, CONTEXT, { ai: model.ai });

    const tool = (model.call()?.tools ?? [])[0] as { user_location?: Record<string, string> } | undefined;
    expect(tool?.user_location).toMatchObject({ country: 'AU', city: 'Pakenham', region: 'VIC' });
  });

  it('leaves the city out until they have given one', async () => {
    const model = capturingAi();
    await answerQuestion({ question: 'is porcelain any good', kind: 'advice' }, { ...CONTEXT, suburb: null, state: null }, { ai: model.ai });

    const tool = (model.call()?.tools ?? [])[0] as { user_location?: Record<string, string> } | undefined;
    expect(tool?.user_location).toEqual({ type: 'approximate', country: 'AU' });
  });

  /* Two customers in two towns are asking two questions, however identical the words are. Before
     the suburb was in the key they shared one cached answer, and one of them was told about the
     other one's town. */
  it('does not serve one town the answer it gave another', async () => {
    const model = capturingAi();
    const asked = { question: "what's tiling going for", kind: 'rates' as const };

    await answerQuestion(asked, CONTEXT, { ai: model.ai });
    expect(model.calls()).toBe(1);

    // A different town is a different question, and has to be looked up.
    await answerQuestion(asked, { ...CONTEXT, suburb: 'Ballarat' }, { ai: model.ai });
    expect(model.calls()).toBe(2);

    // The same town again is still free, so this has not simply broken the cache.
    await answerQuestion(asked, CONTEXT, { ai: model.ai });
    expect(model.calls()).toBe(2);
  });

  it('hands the earlier turns to the search as well', async () => {
    const model = capturingAi();
    await answerQuestion(
      { question: 'and how does that go in a wet area?', kind: 'advice' },
      { ...CONTEXT, history: [{ you: 'ceramic or porcelain?', me: 'Porcelain is usually the pick.' }] },
      { ai: model.ai },
    );

    expect(model.call()?.user).toContain('Porcelain is usually the pick.');
  });
});

/**
 * The chip a customer taps must mean ONE thing.
 *
 * Straight off a screenshot: a tiling rates answer listed "ceramic materials $25-$60 per m2;
 * porcelain materials $40-$100 per m2" and the chip read that as a single range of $25 to $100 - a
 * span across two different tiles, offered as one benchmark and later set beside real quotes for
 * the one tile actually being laid.
 */
describe('a guide figure that is really two figures', () => {
  it('is refused rather than flattened into one range', () => {
    expect(guideRange('Ceramic $25 to $60 per m2; porcelain $40 to $100 per m2', 'm2')).toBeNull();
  });

  it('still reads a single option, whether it is a range or one number', () => {
    expect(guideRange('Porcelain, supplied and laid: $60 to $85 per square metre', 'm2')).toEqual({ min: 60, max: 85 });
    expect(guideRange('$85 a metre installed', 'm')).toEqual({ min: 85, max: 85 });
  });
});

/**
 * The other half of a comparison nobody can make.
 *
 * These four figures came back from a real search on the Pakenham question. Two of them price the
 * tiles alone, and a tiler's quote is mostly the laying - so shown beside real quotes they make
 * every business look expensive by exactly the part they left out.
 */
describe('a guide figure with nobody\'s labour in it', () => {
  it('makes no chip, however plainly it is written', () => {
    expect(guideRange('Porcelain, materials only: from $50 per square metre', 'm2')).toBeNull();
    expect(guideRange('Porcelain, materials only Australia-wide: $50 to $100 per square metre', 'm2')).toBeNull();
    expect(guideRange('$40 to $70 per m2, supply only', 'm2')).toBeNull();
    expect(guideRange('$45 per m2 excluding labour', 'm2')).toBeNull();
  });

  it('leaves an installed figure exactly as it was', () => {
    expect(guideRange('Mid-range porcelain, supplied and installed in Melbourne: $65 to $90 per square metre', 'm2')).toEqual({ min: 65, max: 90 });
    expect(guideRange('Standard porcelain floor, installed in Melbourne: $60 to $100 per square metre', 'm2')).toEqual({ min: 60, max: 100 });
    // A page that says nothing either way is still offered - this guard is not a guess.
    expect(guideRange('$70 to $95 per square metre', 'm2')).toEqual({ min: 70, max: 95 });
  });
});
