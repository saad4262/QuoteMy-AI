import { describe, expect, it } from 'vitest';
import type { AiClient, ModelCall, ModelResult } from '../../src/ai.js';
import { buildAgentContext, runTurn } from '../../src/client/agent.js';
import type { UiState } from '../../src/client/schemas.js';

/**
 * The one model call the customer chat makes. Its job is small on purpose - read the sentence,
 * report which field it answers - so most of what matters here is what it is NOT asked to do.
 */

/** Fails the test if the model is called at all. */
const neverCalled: AiClient = {
  model: 'never',
  async callStructured<T>(_call: ModelCall<T>): Promise<ModelResult<T>> {
    throw new Error('the model was called when there was nothing to read');
  },
};

const ui = (over: Partial<UiState> = {}): UiState => ({
  turn: 3, cursor: {}, lastAsked: null, lastQuestion: '', lastValues: [], lastType: 'question',
  fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null, place: null, ...over,
});

const input = (over: Partial<Parameters<typeof buildAgentContext>[0]> = {}) => ({
  message: '', extractedText: '', docFacts: {}, docSuburbHint: null, known: {}, ui: null, ...over,
});

describe('an empty send costs nothing and breaks nothing', () => {
  it('does not call the model when there is no message and no attachment', async () => {
    // The provider rejects an empty `input` outright, so pressing send on an empty box used to
    // come back as "the model service is unavailable" - a 502 for doing nothing wrong.
    const result = await runTurn(input(), { ai: neverCalled });

    expect(result.data.checklist.material).toBeNull();
    expect(result.data.clearFields).toEqual([]);
    expect(result.data.confirmed).toBe(false);
    expect(result.usage.costUsd).toBe(0);
    expect(result.usage.tokensIn).toBe(0);
  });

  it('claims nothing on the customer\'s behalf when they said nothing', async () => {
    const result = await runTurn(input({ known: { material: 'colorbond', lengthMeters: 30 } }), { ai: neverCalled });

    // Every field null: the merge step keeps whatever was already known, and a turn that read
    // nothing must not appear to have answered anything.
    expect(Object.values(result.data.checklist).every((v) => v === null)).toBe(true);
    expect(result.data.ack).toBe('');
  });

  it('still calls the model when only an attachment arrived', async () => {
    let called = false;
    const ai: AiClient = {
      model: 'stub',
      async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
        called = true;
        expect(call.user).toContain('Quote total $4,180');
        return {
          data: call.schema.parse({
            ack: '', checklist: { material: null, heightKey: null, lengthMeters: null, removal: null,
              conditions: null, gateType: null, gateQty: null, existingPrice: null },
            clearFields: [], suggestedSuburb: null, wantsMoreOptions: false, confirmed: false, offTopic: false,
          }),
          usage: { name: 'turn', ms: 1, tokensIn: 1, tokensOut: 1, retries: 0, costUsd: 0 },
        };
      },
    };

    await runTurn(input({ extractedText: 'Quote total $4,180' }), { ai });
    expect(called).toBe(true);
  });
});

describe('the briefing tells the model what it needs and nothing more', () => {
  it('leads with what the customer actually typed', () => {
    const context = buildAgentContext(input({ message: 'about 30m of colorbond' }));
    expect(context.startsWith('about 30m of colorbond')).toBe(true);
  });

  it('names the field asked last turn, and the only values that were on screen', () => {
    // This is what gives the model a strong prior that the reply answers THAT field rather than
    // wandering into one nobody asked about.
    const context = buildAgentContext(
      input({ message: 'colorbond', ui: ui({ lastAsked: 'material', lastValues: ['timber_pine', 'colorbond'] }) }),
    );

    expect(context).toContain('field: material');
    expect(context).toContain('timber_pine');
    expect(context).toContain('almost certainly answering THIS field');
  });

  it('passes a job address as a hint only, never as an answer', () => {
    // Ranking measures real distance, so a suburb needs coordinates from the picker. A line of
    // text off a document can only ever be a head start.
    const context = buildAgentContext(input({ message: 'here you go', docSuburbHint: '12 Smith St, Pakenham' }));

    expect(context).toContain('12 Smith St, Pakenham');
    expect(context).toContain('never checklist.suburb');
  });

  it('leaves out sections it has nothing for', () => {
    const context = buildAgentContext(input({ message: 'hello' }));

    expect(context).toBe('hello');
    expect(context).not.toContain('Already established');
    expect(context).not.toContain('Attached file');
  });
});
