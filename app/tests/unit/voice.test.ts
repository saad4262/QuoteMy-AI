import { beforeEach, describe, expect, it } from 'vitest';
import { setAiClient, MockAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { matchSpokenToOption } from '../../src/client/voice/matchSpoken.js';
import { toSpeech, spoken } from '../../src/client/voice/toSpeech.js';
import { runVoiceTurn } from '../../src/client/voice/controller.js';
import { resetChatSpend } from '../../src/client/spend.js';
import { MemoryRepository, setRepository, type CapabilitiesDoc, type PricingDoc } from '../../src/store.js';
import type { ChatOption, ChatResponse } from '../../src/client/schemas.js';

const options = (...pairs: [string, string | number][]): ChatOption[] =>
  pairs.map(([label, value]) => ({ label, value }));

const MATERIALS = options(['Treated pine', 'timber_pine'], ['Hardwood timber', 'timber_hardwood'], ['Colorbond', 'colorbond'], ['Other', '__other__']);

describe('matchSpokenToOption', () => {
  it('recognises a lettered option', () => {
    expect(matchSpokenToOption('B', MATERIALS)).toBe('timber_hardwood');
    expect(matchSpokenToOption('option c', MATERIALS)).toBe('colorbond');
  });

  it('recognises a position said out loud', () => {
    expect(matchSpokenToOption('the second one', MATERIALS)).toBe('timber_hardwood');
    expect(matchSpokenToOption('option three', MATERIALS)).toBe(null); // a word, not a number - too loose to guess
    expect(matchSpokenToOption('option 3', MATERIALS)).toBe('colorbond');
    expect(matchSpokenToOption('last', MATERIALS)).toBe('colorbond'); // Other is never offered
  });

  it('recognises the label they actually heard', () => {
    expect(matchSpokenToOption('colorbond', MATERIALS)).toBe('colorbond');
    expect(matchSpokenToOption('treated pine please', MATERIALS)).toBe('timber_pine');
  });

  it('never offers the text-box sentinel, which means nothing out loud', () => {
    expect(matchSpokenToOption('other', MATERIALS)).toBe(null);
    expect(matchSpokenToOption('D', MATERIALS)).toBe(null); // there is no fourth choice to a listener
  });

  it('prefers a real answer over a position when the two collide', () => {
    // "Two" is the answer 2 here, not the second choice. Asked "how many gates", it must be 2.
    expect(matchSpokenToOption('2', options(['1 gate', 1], ['2 gates', 2], ['3 gates', 3]))).toBe(2);
  });

  it('returns nothing rather than guessing', () => {
    // A wrong match silently records an answer they never gave, and they find out at the price.
    expect(matchSpokenToOption('umm, hang on', MATERIALS)).toBe(null);
    expect(matchSpokenToOption('', MATERIALS)).toBe(null);
    expect(matchSpokenToOption('something completely different', MATERIALS)).toBe(null);
    expect(matchSpokenToOption('colorbond', [])).toBe(null);
  });
});

describe('spoken', () => {
  it('says measurements and money the way a person would', () => {
    expect(spoken('1.8m')).toBe('1 point 8 metres');
    expect(spoken('30m of fence')).toBe('30 metres of fence');
    expect(spoken('$2,200')).toBe('2200 dollars');
    expect(spoken('incl. GST')).toBe('incl. G S T');
  });
});

describe('toSpeech', () => {
  const base: ChatResponse = {
    sessionId: 'v', trade: 'fencing', intent: 'new_quote', place: null,
    type: 'question', message: 'What type of fence are you after?', options: MATERIALS,
    checklistComplete: false, checklist: {}, checklistDisplay: {}, results: [], avgRatePerMeter: null,
  };

  it('reads the question, then the choices, then invites anything else', () => {
    const said = toSpeech(base);
    expect(said).toContain('What type of fence are you after?');
    expect(said).toContain('Option A, Treated pine.');
    expect(said).toContain('Option C, Colorbond.');
    expect(said).not.toContain('Other');
    expect(said).toContain('your own words');
  });

  it('never reads a suburb list, and says it will wait', () => {
    const said = toSpeech({ ...base, type: 'message', options: [], expects: 'suburb', message: 'Which suburb is the fence going in?' });
    expect(said).toContain('on your screen');
    expect(said).toContain('wait');
    expect(said).not.toContain('Option A');
  });

  it('asks for a yes rather than reading yes and no as lettered choices', () => {
    const said = toSpeech({ ...base, type: 'confirmation', message: 'Got it — Berwick, Colorbond, 1.8m. All correct?', options: options(["Yes, that's all correct", 'yes'], ["No, something's wrong", 'no']) });
    expect(said).toContain('1 point 8 metres');
    expect(said).toContain('say yes');
    expect(said).not.toContain('Option A');
  });

  it('narrates a result instead of reading a table out', () => {
    const said = toSpeech({
      ...base,
      type: 'result',
      message: 'Here are the local businesses that cover your job.',
      options: [],
      results: [
        { businessId: 'a', autoAcceptsAi: true, businessName: 'Southeast Fencing', suburb: 'Berwick', ratePerMeter: 110, estimatedTotal: 2200, notes: 'incl. GST' },
        { businessId: 'b', autoAcceptsAi: false, businessName: 'Other Mob', suburb: 'Berwick', ratePerMeter: 120, estimatedTotal: 2400, notes: '' },
      ],
    });
    expect(said).toContain('Southeast Fencing can do it for 2200 dollars');
    expect(said).toContain('one more quote');
    expect(said).toContain('on your screen');
    expect(said).not.toContain('110');
  });

  it('reads a result with nothing in it as the answer it is', () => {
    const said = toSpeech({ ...base, type: 'result', options: [], message: 'Nobody covering your suburb came in under $2,000.' });
    expect(said).toContain('2000 dollars');
  });
});

// ------------------------------------------------------------------------------------------------

/** Counts model calls, so "no model was consulted" can be asserted rather than assumed. */
function countingAi(): { ai: AiClient; calls: () => number } {
  const inner = new MockAiClient();
  let calls = 0;
  return {
    calls: () => calls,
    ai: {
      model: 'counting',
      async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
        calls += 1;
        return inner.callStructured(call);
      },
    },
  };
}

describe('a voice turn', () => {
  let repo: MemoryRepository;
  let counter: ReturnType<typeof countingAi>;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    resetChatSpend();
    counter = countingAi();
    setAiClient(counter.ai);

    const now = '2026-01-01T00:00:00.000Z';
    repo.addCandidate({ uid: 'v1', businessName: 'Southeast Fencing', servicesProvided: ['fencing'], rating: 4.8, reviewCount: 10, isAutoAcceptEnabled: false, isAiAutoAcceptEnabled: true });
    repo.savePricing('v1', {
      trade: 'fencing', status: 'confirmed', schemaVersion: 2, updatedAt: now, confirmedAt: now, ratesSaved: 1,
      gstIncluded: true, enabledMaterials: ['colorbond'], rates: { colorbond: { '1.8m': 110 } },
      removals: [], gates: [], siteConditions: [],
      serviceArea: { baseLocation: 'Berwick', resolved: { suburb: 'Berwick', state: 'VIC', postcode: '3806', lat: -38.0362, lng: 145.3478, source: 'google' }, radiusKm: 30, excludedAreas: [] },
      minimumCharge: 500,
    } as PricingDoc);
    repo.saveCapabilities('v1', {
      trade: 'fencing', schemaVersion: 2, updatedAt: now, businessName: 'Southeast Fencing',
      specs: [], permits: { included: null, fee: null }, warranty: { years: null, text: null },
      tags: [], extras: [], inclusions: [], exclusions: [], otherOfferings: [], couldNotUse: [],
    } as CapabilitiesDoc);
  });

  it('carries the conversation across turns without the caller holding anything', async () => {
    const first = await runVoiceTurn('call-1', { spokenText: 'I need a fence quote' }, { repo });
    expect(first.isDone).toBe(false);
    expect(first.speakText.length).toBeGreaterThan(0);

    // Nothing was echoed back by the caller - the session is what remembers.
    const second = await runVoiceTurn('call-1', { spokenText: 'yes go ahead' }, { repo });
    expect(second.speakText).toContain('screen');

    const stored = await repo.readVoiceSession('call-1');
    expect(stored?.checklist._ui).toBeDefined(); // stored whole, never trimmed
  });

  it('consults no model at all when they say one of the choices', async () => {
    await runVoiceTurn('call-2', { spokenText: 'I need a fence' }, { repo });
    await runVoiceTurn('call-2', { spokenText: 'yes' }, { repo });

    // Put a real place in, the way the picker does, so the next question is a spoken multiple choice.
    const session = (await repo.readVoiceSession('call-2'))!;
    await repo.writeVoiceSession('call-2', {
      ...session,
      place: { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' },
    });
    await runVoiceTurn('call-2', { spokenText: 'Berwick' }, { repo });

    const before = counter.calls();
    const turn = await runVoiceTurn('call-2', { spokenText: 'option C' }, { repo });

    expect(counter.calls()).toBe(before); // not one call
    expect(turn.speakText.length).toBeGreaterThan(0);
    const after = await repo.readVoiceSession('call-2');
    expect(after?.checklist.material).toBe('colorbond');
  });

  it('still reads a sentence with the model when it is not one of the choices', async () => {
    await runVoiceTurn('call-3', { spokenText: 'I need a fence' }, { repo });
    const before = counter.calls();
    await runVoiceTurn('call-3', { spokenText: 'well it is a long story really' }, { repo });
    expect(counter.calls()).toBe(before + 1);
  });

  it('stays on the line when something goes wrong', async () => {
    const broken: AiClient = {
      model: 'broken',
      async callStructured() {
        throw new Error('the provider fell over');
      },
    };
    setAiClient(broken);

    await expect(runVoiceTurn('call-4', { spokenText: 'hello there' }, { repo })).rejects.toThrow();
    // The route turns that into speech with isDone false - see voiceTurn. What matters here is that
    // it is an ordinary error and not something that leaves the session unreadable.
    expect(await repo.readVoiceSession('call-4')).toBeNull();
  });
});
