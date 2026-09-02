import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { setAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { runFencingChat } from '../../src/client/controller.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { chatSpendToday, resetChatSpend } from '../../src/client/spend.js';
import { AppError } from '../../src/http.js';
import { createApp } from '../../src/server.js';
import { MemoryRepository, setRepository } from '../../src/store.js';

/**
 * What a customer sees when something goes wrong, and what a turn costs when nothing does.
 */

const app = createApp();
const PLACE = JSON.stringify({ latitude: -38.07, longitude: 145.48, suburb: 'Pakenham', displayLabel: 'Pakenham, VIC 3810' });

beforeEach(() => {
  setRepository(new MemoryRepository());
  clearSchemaCache();
  resetChatSpend();
});

/** Counts calls, and can be told to fail like the provider does. */
function stubAi(fail?: AppError) {
  const state = { calls: 0 };
  const ai: AiClient = {
    model: 'stub',
    async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
      state.calls += 1;
      if (fail) throw fail;
      return {
        data: call.schema.parse({
          ack: '', checklist: { material: null, heightKey: null, lengthMeters: null, removal: null,
            conditions: null, gateType: null, gateQty: null, existingPrice: null },
          clearFields: [], suggestedSuburb: null, wantsMoreOptions: false, confirmed: false, offTopic: false, askedAbout: null, askedKind: null, namedOffList: null,
        }),
        usage: { name: 'turn', ms: 1, tokensIn: 100, tokensOut: 20, retries: 0, costUsd: 0.0003 },
      };
    },
  };
  return { ai, state };
}

describe('a failed turn comes back in the chat\'s own shape', () => {
  /** Drives the real route, with the provider failing the way it actually does. */
  const failingTurn = async (error: AppError, knownChecklist = '') => {
    const { ai } = stubAi(error);
    setAiClient(ai);
    try {
      return await request(app)
        .post('/api/v1/client/fencing-chat')
        .send({ message: 'i need a fence', sessionId: 'err-1', place: PLACE, knownChecklist });
    } finally {
      setAiClient(null);
    }
  };

  it('reads like the chat, not like a stack trace', async () => {
    const res = await failingTurn(new AppError(503, 'Rate limit reached for gpt-4o-mini in org-abc123', 'upstream_busy'));

    expect(res.status).toBe(503);
    expect(res.body.type).toBe('error');
    expect(res.body.code).toBe('upstream_busy');
    expect(res.body.message).toContain('busy');
    expect(res.body.retryable).toBe(true);
    // The provider's own wording can echo prompt content back out - it never reaches a customer.
    expect(res.body.message).not.toContain('org-abc123');
    expect(res.body.message).not.toContain('gpt-4o-mini');
  });

  it('hands the brief back, so one bad second does not lose the conversation', async () => {
    // A client doing `checklist = response.checklist` would otherwise wipe everything it knew.
    const known = JSON.stringify({ suburb: 'Pakenham, VIC 3810', material: 'timber_pine', lengthMeters: 15 });
    const res = await failingTurn(new AppError(503, 'busy', 'upstream_busy'), known);

    expect(res.body.checklist.material).toBe('timber_pine');
    expect(res.body.checklist.lengthMeters).toBe(15);
  });

  it('carries the fields the chat UI always renders, so nothing crashes on an error', async () => {
    const res = await failingTurn(new AppError(502, 'boom', 'upstream_unavailable'));

    expect(res.body.options).toEqual([]);
    expect(res.body.results).toEqual([]);
    expect(res.body.checklistComplete).toBe(false);
    expect(res.body.sessionId).toBe('err-1');
  });

  it('marks a customer-caused failure as NOT retryable', async () => {
    const { chatError } = await import('../../src/client/errors.js');

    expect(chatError({ body: {} } as never, 'too_fast').retryable).toBe(false);
    expect(chatError({ body: {} } as never, 'unsupported_file_type').retryable).toBe(false);
    // ...and an our-end failure as retryable, which is the only thing the UI has to decide.
    expect(chatError({ body: {} } as never, 'upstream_unavailable').retryable).toBe(true);
    expect(chatError({ body: {} } as never, 'upstream_timeout').retryable).toBe(true);
  });
});

describe('a tapped option costs nothing', () => {
  it('answers without calling the model at all', async () => {
    const { ai, state } = stubAi();
    let checklist = '';

    const say = async (message: string) => {
      const r = await runFencingChat({ message, sessionId: 'tap', place: PLACE, knownChecklist: checklist }, [], { ai });
      checklist = JSON.stringify(r.checklist);
      return r;
    };

    await say('i need a fence'); // typed
    await say('yes'); // typed
    const before = state.calls;

    await say('timber_pine'); // tapped - the value came off a list this code generated
    expect(state.calls).toBe(before);

    await say('1.8m'); // tapped
    expect(state.calls).toBe(before);
  });

  it('still reads free text, including the Other button', async () => {
    const { ai, state } = stubAi();
    let checklist = '';
    const say = async (message: string) => {
      const r = await runFencingChat({ message, sessionId: 'tap2', place: PLACE, knownChecklist: checklist }, [], { ai });
      checklist = JSON.stringify(r.checklist);
    };

    await say('i need a fence');
    await say('yes');
    const before = state.calls;

    await say('__other__'); // opens a text box, so the next thing genuinely needs reading
    expect(state.calls).toBe(before + 1);
  });
});

describe('the daily spend ceiling', () => {
  it('records what a turn cost', async () => {
    const { ai } = stubAi();
    expect(chatSpendToday().spentUsd).toBe(0);

    await runFencingChat({ message: 'i need a fence', sessionId: 's', place: '', knownChecklist: '' }, [], { ai });

    expect(chatSpendToday().spentUsd).toBeCloseTo(0.0003, 6);
  });

  it('stops before the model once the day is spent, rather than after', async () => {
    const { assertWithinDailyBudget, recordSpend } = await import('../../src/client/spend.js');
    const ceiling = chatSpendToday().ceilingUsd;

    await expect(assertWithinDailyBudget()).resolves.toBeUndefined();
    await recordSpend(ceiling);
    await expect(assertWithinDailyBudget()).rejects.toThrow(AppError);

    try {
      await assertWithinDailyBudget();
    } catch (err) {
      expect((err as AppError).code).toBe('at_capacity');
      expect((err as AppError).status).toBe(503);
    }
  });

  it('holds the ceiling across instances, not just within one', async () => {
    // Two "instances" sharing one store, which is what a serverless deployment actually is. Each
    // has its own module state, so the only thing that can hold a ceiling between them is the
    // store - and before this the counter lived in the process and there was no ceiling at all.
    const { assertWithinDailyBudget, recordSpend, resetChatSpend } = await import('../../src/client/spend.js');
    const shared = new MemoryRepository();
    const ceiling = chatSpendToday().ceilingUsd;

    // Instance A spends the day's budget.
    resetChatSpend();
    await recordSpend(ceiling, shared);

    // Instance B starts cold: nothing of its own recorded, and it must still be refused.
    resetChatSpend();
    await expect(assertWithinDailyBudget(shared)).rejects.toThrow(AppError);

    // A different day's store has nothing in it, so a fresh instance is free to talk again.
    resetChatSpend();
    await expect(assertWithinDailyBudget(new MemoryRepository())).resolves.toBeUndefined();
  });
});
