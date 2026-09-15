import { describe, expect, it, beforeEach } from 'vitest';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { runChat } from '../../src/client/controller.js';
import { BERWICK, seedRenovator, seedBusiness } from '../golden/conversations.js';
import { matchSpokenToOption } from '../../src/client/voice/matchSpoken.js';
import { settledTrade } from '../../src/client/voice/controller.js';
import type { ChatOption, ChatResponse, Checklist, Place } from '../../src/client/schemas.js';
import type { Trade } from '../../src/vocab.js';

/**
 * Changing trade BY VOICE, which is where this nearly went wrong.
 *
 * A voice call carries its own `trade` and sends it back on every turn as `input.trade` - and
 * `routeTrade` takes `fromCaller` before it reads anything else, on purpose. So a caller who
 * changed trade mid-call would have been put straight back into the trade they had just left, on
 * the very next thing they said. The web client never showed it because it sends no `trade` at all.
 *
 * This walks the same loop `voice/controller.ts` walks - match the spoken words against the options
 * that were read out, send the trade the session is holding, then update that trade from what came
 * back - so the regression it guards is the real one rather than a paraphrase of it.
 */
describe('changing trade on a voice call', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    seedRenovator(repo, 'reno-1', 'Berwick Home Renovations');
    seedBusiness(repo, 'fence-1', 'Berwick Fencing');
  });

  it('lets a caller change trade and does not put them back', async () => {
    let session: { trade: Trade | null; checklist: Checklist | null; options: ChatOption[] } = {
      trade: null,
      checklist: null,
      options: [],
    };

    let place: Place | null = null;
    const say = async (spoken: string, picked?: Place) => {
      if (picked) place = picked;
      // What the voice controller does: resolve the spoken words against what was read out.
      const matched = session.checklist ? matchSpokenToOption(spoken, session.options) : null;
      const response = await runChat({
        trade: session.trade ?? undefined,
        message: matched === null ? spoken : String(matched),
        sessionId: 'voice-tc',
        place: place ? JSON.stringify(place) : '',
        knownChecklist: session.checklist ? JSON.stringify(session.checklist) : '',
      } as never);
      session = {
        trade: response.trade ?? settledTrade(response, session.trade),
        checklist: response.checklist,
        options: response.options ?? [],
      };
      return response;
    };

    await say('I need a renovation quote');
    await say('yes go ahead');
    await say('Berwick', BERWICK);
    await say('bathroom');
    await say('the full renovation');
    expect(session.trade).toBe('home_renovation');
    expect(session.checklist?.room).toBe('bathroom');

    // Mid-call, the caller realises they picked the wrong service.
    const asked = await say('i want fencing');
    expect(asked.message).toMatch(/do you want to change that/i);
    // Nothing is cleared on the asking turn - that is the whole point of it.
    expect(session.checklist?.room).toBe('bathroom');
    expect(session.trade).toBe('home_renovation');

    // "Yeah" - which `matchSpokenToOption` does NOT resolve, so it goes through as spoken and the
    // controller's own YES has to catch it. A caller does not say "yes, change it" out loud.
    const picker = await say('yeah');
    expect(picker.message).toMatch(/are you looking for/i);
    expect(session.checklist?.room).toBeUndefined();
    expect(session.checklist?.suburb).toBeUndefined();

    /* THE REGRESSION. If the session still held `home_renovation` here, the next turn would send it
       as `fromCaller` and `routeTrade` would return it before reading a word. */
    expect(session.trade).toBeNull();

    const fencing = await say('fencing');
    expect(session.trade).toBe('fencing');
    expect(fencing.message).toMatch(/fence/i);
  });

  it('keeps the call on its trade when the caller declines', async () => {
    let session: { trade: Trade | null; checklist: Checklist | null; options: ChatOption[] } = {
      trade: null,
      checklist: null,
      options: [],
    };
    let place: Place | null = null;
    const say = async (spoken: string, picked?: Place) => {
      if (picked) place = picked;
      const matched = session.checklist ? matchSpokenToOption(spoken, session.options) : null;
      const response = await runChat({
        trade: session.trade ?? undefined,
        message: matched === null ? spoken : String(matched),
        sessionId: 'voice-tc-no',
        place: place ? JSON.stringify(place) : '',
        knownChecklist: session.checklist ? JSON.stringify(session.checklist) : '',
      } as never);
      session = {
        trade: response.trade ?? settledTrade(response, session.trade),
        checklist: response.checklist,
        options: response.options ?? [],
      };
      return response;
    };

    await say('I need a renovation quote');
    await say('yes go ahead');
    await say('Berwick', BERWICK);
    await say('bathroom');
    await say('the full renovation');
    await say('i want fencing');

    // "Nope" - also not an option label, also has to be caught as spoken.
    await say('nope');
    expect(session.trade).toBe('home_renovation');
    expect(session.checklist?.room).toBe('bathroom');
    expect(session.checklist?.jobType).toBe('full_renovation');
  });
});
