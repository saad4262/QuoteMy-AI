import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { setAiClient, MockAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { createApp } from '../../src/server.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { matchSpokenToOption } from '../../src/client/voice/matchSpoken.js';
import { toSpeech, spoken, greetingFor, OPENING_LINE } from '../../src/client/voice/toSpeech.js';
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

  it('hands a whole briefing to the model instead of keeping one word of it', () => {
    /* A recognised option makes `runFencingChat` skip the model entirely, so anything else in the
       sentence is never read by anything. Said in one breath, four answers became one and the
       caller was asked the other three again one at a time. */
    expect(matchSpokenToOption('I want a fence in Pakenham, colorbond, 1.5 metres, 50 metres long', MATERIALS)).toBe(null);
    expect(matchSpokenToOption('treated pine in Berwick, about 30 metres', MATERIALS)).toBe(null);
    // No numbers in it at all, and still two answers.
    expect(matchSpokenToOption('colorbond in Pakenham', MATERIALS)).toBe(null);
  });

  it('still takes the shortcut when the answer is the whole of what they said', () => {
    // The guard above must not cost a model call on the turns it was built to avoid one on.
    expect(matchSpokenToOption('yeah, go with the Colorbond one', MATERIALS)).toBe('colorbond');
    expect(matchSpokenToOption("I'll take treated pine", MATERIALS)).toBe('timber_pine');
    expect(matchSpokenToOption('hardwood timber thanks', MATERIALS)).toBe('timber_hardwood');
    // The number IS the answer here, so it is not something else they said.
    expect(matchSpokenToOption('1.2 m please', options(['1.2m', '1.2m'], ['1.5m', '1.5m']))).toBe('1.2m');
    expect(matchSpokenToOption('no gates mate', options(['No gates', 'none'], ['Single gate', 'single']))).toBe('none');
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

  it('asks the suburb out loud now that the backend resolves it', () => {
    const said = toSpeech({ ...base, type: 'message', options: [], expects: 'suburb', message: 'Which suburb is the fence going in? A postcode works too.' });
    expect(said).toContain('postcode');
    expect(said).not.toContain('on your screen');
    expect(said).not.toContain('Option A');
  });

  it('reads a state and postcode as words and digits, never as a number', () => {
    const said = toSpeech({
      ...base,
      type: 'question',
      message: 'There is more than one Richmond — which one is yours?',
      options: options(['Richmond, VIC, 3121', 'Richmond, VIC, 3121'], ['Richmond, NSW, 2753', 'Richmond, NSW, 2753']),
    });
    expect(said).toContain('Victoria 3 1 2 1');
    expect(said).toContain('New South Wales 2 7 5 3');
    expect(said).toContain('Option A');
  });

  /* Every value read back before the question, because that is the whole of what makes a spoken
     "yes" mean anything - and a way out that does not need the word "no". */
  it('reads the whole recap back, then asks for the go-ahead', () => {
    const said = toSpeech({ ...base, type: 'confirmation', message: 'Got it — Berwick, Colorbond, 1.8m. All correct?', options: options(["Yes, that's all correct", 'yes'], ["No, something's wrong", 'no']) });
    expect(said).toContain('Berwick');
    expect(said).toContain('1 point 8 metres');
    expect(said).toContain('find you some quotes');
    expect(said).toContain('change');
    expect(said).not.toContain('All correct?');
    expect(said).not.toContain('Option A');
  });

  it('still asks when the recap could not be built', () => {
    const said = toSpeech({ ...base, type: 'confirmation', message: 'Sorry — is that all correct?', options: options(['Yes', 'yes'], ['No', 'no']) });
    expect(said).toContain('find you some quotes');
    expect(said).not.toContain('Sorry');
  });

  /* The quote is never read out. A price heard once cannot be compared with anything, a caller
     cannot scroll back through a phone call, and the same sign-off has to be true when nobody
     covers the suburb - so it says nothing about what was found. */
  it('signs off without reading the quote, whatever the quote was', () => {
    const withQuotes = toSpeech({
      ...base,
      type: 'result',
      options: [],
      message: 'Here is what came back.',
      results: [
        { businessId: 'a', autoAcceptsAi: true, businessName: 'Southeast Fencing', suburb: 'Berwick', ratePerMeter: 110, estimatedTotal: 2200, notes: 'incl. GST' },
      ],
    } as ChatResponse);
    const withNone = toSpeech({ ...base, type: 'result', options: [], message: 'Nobody covering your suburb came in under $2,000.' });

    expect(withQuotes).toBe(withNone);
    expect(withQuotes).toContain('on your screen');
    expect(withQuotes).toContain('bye for now');
    expect(withQuotes).not.toContain('2200');
    expect(withQuotes).not.toContain('Southeast Fencing');
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

/**
 * A model that reads a whole sentence, so what happens to a briefing can be tested. `MockAiClient`
 * deliberately answers only the field that was asked, which is the one thing this case is not.
 */
function readingAi(extraction: Record<string, unknown>): { ai: AiClient; calls: () => number } {
  const inner = new MockAiClient();
  let calls = 0;
  return {
    calls: () => calls,
    ai: {
      model: 'reading',
      async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
        calls += 1;
        if (call.name !== 'turn') return inner.callStructured(call);
        const data = {
          ack: 'Got it', clearFields: [], suggestedSuburb: null,
          wantsMoreOptions: false, confirmed: false, offTopic: false, askedAbout: null, askedKind: null, namedOffList: null,
          checklist: {
            material: null, heightKey: null, lengthMeters: null, removal: null,
            conditions: null, gateType: null, gateQty: null, existingPrice: null, ...extraction,
          },
        };
        return { data: call.schema.parse(data), usage: { name: call.name, ms: 1, tokensIn: 0, tokensOut: 0, retries: 0, costUsd: 0 } };
      },
    },
  };
}

/**
 * Everything in one breath.
 *
 * A caller does not answer seven questions one at a time if they can say the lot at once, and the
 * call used to lose all but one of them: the material was recognised as a choice that had been read
 * out, which made the pipeline skip the model - and the model was the only thing that would have
 * read the height and the length. They heard "got it" and were asked both again.
 */
describe('a caller who says everything at once', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    resetChatSpend();
  });

  it('keeps every answer in a sentence that also names an option', async () => {
    const model = readingAi({ material: 'colorbond', heightKey: '1.5m', lengthMeters: 50 });
    setAiClient(model.ai);

    // The material choices are on the table, so the sentence below contains one of them verbatim.
    await repo.writeVoiceSession('all-at-once', {
      checklist: {}, place: null, options: MATERIALS, turns: [], updatedAt: new Date().toISOString(),
    });

    await runVoiceTurn(
      'all-at-once',
      { spokenText: 'I want a colorbond fence, 1.5 metres high and 50 metres long' },
      { repo },
    );

    // Read by the model rather than resolved as a tapped choice - that is what saves the other two.
    expect(model.calls()).toBeGreaterThan(0);
    const checklist = (await repo.readVoiceSession('all-at-once'))!.checklist as Record<string, unknown>;
    expect(checklist.material).toBe('colorbond');
    expect(checklist.heightKey).toBe('1.5m');
    expect(checklist.lengthMeters).toBe(50);
  });

  /* Said in words rather than digits. The transcriber picks either, and the guard that checks a
     value really was spoken used to look for digits only - so this dropped the length in silence. */
  it('keeps a length that was spoken as a word', async () => {
    const model = readingAi({ material: 'colorbond', lengthMeters: 50 });
    setAiClient(model.ai);

    await repo.writeVoiceSession('in-words', {
      checklist: {}, place: null, options: MATERIALS, turns: [], updatedAt: new Date().toISOString(),
    });

    await runVoiceTurn('in-words', { spokenText: 'colorbond, about fifty metres of it' }, { repo });

    const checklist = (await repo.readVoiceSession('in-words'))!.checklist as Record<string, unknown>;
    expect(checklist.lengthMeters).toBe(50);
  });
});

describe('matchSpokenToOption, said inside a sentence', () => {
  /* Nobody answers a spoken question with a bare noun. Every one of these was reaching the model -
     three seconds of a phone call spent being told what this code worked out last turn. */
  it('finds the one option named in a sentence', () => {
    expect(matchSpokenToOption('Treated pine. I need treated pine.', MATERIALS)).toBe('timber_pine');
    expect(matchSpokenToOption('yeah go with the colorbond one', MATERIALS)).toBe('colorbond');
    expect(matchSpokenToOption('um hardwood timber please mate', MATERIALS)).toBe('timber_hardwood');
  });

  it('refuses when a sentence names two of them', () => {
    const site = options(['Sloped block', 'sloped'], ['Rocky ground', 'rocky'], ['Nothing tricky', 'none']);
    expect(matchSpokenToOption('it is a sloped block with rocky ground', site)).toBeNull();
  });

  it('never finds a label inside another word', () => {
    expect(matchSpokenToOption('what about pineapple', MATERIALS)).toBeNull();
  });

  /* "no worries" means yes. Recording it as a no is the silent wrong answer, found at the price. */
  it('leaves short labels to an exact answer', () => {
    const yesNo = options(["Yes, that's all correct", 'yes'], ["No, something's wrong", 'no']);
    expect(matchSpokenToOption('no worries go ahead', yesNo)).toBeNull();
    expect(matchSpokenToOption('yes', yesNo)).toBe('yes');
  });
});

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
    expect(second.speakText).toContain('suburb');

    const stored = await repo.readVoiceSession('call-1');
    expect(stored?.checklist._ui).toBeDefined(); // stored whole, never trimmed
    // Both turns kept, in order, so a page can render the call after it ends.
    expect(stored?.turns.map((turn) => turn.said)).toEqual(['I need a fence quote', 'yes go ahead']);
    expect(stored?.turns[1]?.spoke).toBe(second.speakText);
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

/**
 * Where a call becomes a chat.
 *
 * The customer hangs up and is looking at a page that knows nothing about the call. This route is
 * the whole handover: the page reads the session, renders what was said, and posts the checklist
 * straight back into the text chat as `knownChecklist`. Nothing new exists on the results side
 * because of it - the text path already finishes a confirmed brief.
 */
describe('the call, handed to a screen', () => {
  const app = createApp();
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    resetChatSpend();
    setAiClient(new MockAiClient());
  });

  it('hands back the conversation and the checklist, `_ui` included', async () => {
    await runVoiceTurn('call-5', { spokenText: 'I need a fence quote' }, { repo });
    await runVoiceTurn('call-5', { spokenText: 'yes go ahead' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'call-5' });

    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.turns).toHaveLength(2);
    expect(res.body.turns[0].said).toBe('I need a fence quote');
    // The page posts this back as `knownChecklist`, so a trimmed copy is how the loops come back.
    expect(res.body.checklist._ui).toBeDefined();
    // The last turn as the chat would render it, so the page can carry on drawing bubbles.
    expect(res.body.type).toBe('message');
    expect(res.body.message).toBe(res.body.turns.at(-1).wrote);
  });

  /* "Victoria 3 8 1 0" and "1 point 5 metres" are how a recap is said, not how it is written.
     Putting the spoken form in a chat bubble makes a fence quote read like a phone number. */
  it('keeps the spoken and the written form of every turn apart', async () => {
    await runVoiceTurn('call-7', { spokenText: 'I need a fence quote' }, { repo });
    await runVoiceTurn('call-7', { spokenText: 'yes' }, { repo });

    const started = (await repo.readVoiceSession('call-7'))!;
    await repo.writeVoiceSession('call-7', {
      ...started,
      place: { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' },
    });
    await runVoiceTurn('call-7', { spokenText: 'Berwick' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'call-7' });
    const last = res.body.turns.at(-1);

    // Said aloud, the choices are read out. Written, they are chips beside the message.
    expect(last.spoke).toContain('Option A');
    expect(last.wrote).not.toContain('Option A');
    expect(res.body.type).toBe('question');
    expect(res.body.options.map((o: { value: string }) => o.value)).toContain('colorbond');
  });

  /* A call nobody spoke on, or one older than the session's half hour. Not an error: the page
     still has to render something, and "start again" is the honest thing to show. */
  it('says so plainly when there is no session to hand over', async () => {
    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'never-happened' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ found: false, turns: [], checklist: null });
  });
});

/**
 * A call ends at the recap, not at the quote.
 *
 * Every answer is in by then, and what is left is the one question worth getting right - so it is
 * read out, and then asked on a screen the customer can actually check. A misheard "yes" there is
 * not a small mistake: it is the whole job, wrong, with a price attached.
 */
describe('the end of a call', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    resetChatSpend();
    setAiClient(new MockAiClient());

    // A business that can actually quote the brief, so the call reaches a price rather than a
    // "nobody covers you" - which is a different ending with its own test.
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

  it('carries on past the recap, and hangs up on the quote', async () => {
    await runVoiceTurn('call-6', { spokenText: 'I need a fence' }, { repo });
    await runVoiceTurn('call-6', { spokenText: 'yes' }, { repo });

    // The picker's job, done here directly: with no Google key a test resolves no suburb at all.
    const started = (await repo.readVoiceSession('call-6'))!;
    await repo.writeVoiceSession('call-6', {
      ...started,
      place: { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' },
    });

    let turn = await runVoiceTurn('call-6', { spokenText: 'Berwick' }, { repo });
    let recap = '';
    for (let i = 0; i < 14 && !turn.isDone; i += 1) {
      if (turn.speakText.includes('find you some quotes')) recap = turn.speakText;
      turn = await runVoiceTurn('call-6', { spokenText: recap ? 'yes' : 'option C' }, { repo });
    }

    // The recap was spoken and answered out loud, and the call did not end there.
    expect(recap).toContain('find you some quotes');
    expect(turn.isDone).toBe(true);
    expect(turn.speakText).toContain('bye for now');
    expect(turn.resultId).toBeTruthy();

    // The page opens this the moment the call ends.
    expect((await repo.readVoiceSession('call-6'))?.resultId).toBe(turn.resultId);
  });
});

/**
 * The shape Retell actually posts.
 *
 * A custom tool nests its arguments under `args` unless its "args only" switch is on. Reading only
 * the flat shape meant every turn reached the pipeline empty: no error, no warning, just the same
 * question asked for ever while Retell's call log showed the words being sent correctly.
 */
describe('the turn body', () => {
  const app = createApp();

  beforeEach(() => {
    setRepository(new MemoryRepository());
    clearSchemaCache();
    resetChatSpend();
    setAiClient(new MockAiClient());
  });

  const said = async (body: object, sessionId = 'shape-1') => {
    await request(app).post('/api/v1/voice/turn').query({ sessionId }).send(body);
    const res = await request(app).get('/api/v1/voice/session').query({ sessionId });
    return res.body.turns.at(-1)?.said;
  };

  it('reads what was said whether it is nested or flat', async () => {
    expect(await said({ name: 'voice_turn', args: { spokenText: 'In Pakenham 3810' } }, 'shape-nested')).toBe('In Pakenham 3810');
    expect(await said({ spokenText: 'In Pakenham 3810' }, 'shape-flat')).toBe('In Pakenham 3810');
  });

  /* Every call sharing one session document is worse than having no id at all: each caller
     inherits the last one's answers, and nothing anywhere reports it. */
  it('refuses a session id that is really an unsubstituted variable', async () => {
    const res = await request(app)
      .post('/api/v1/voice/turn')
      .query({ sessionId: '{{session_id}}' })
      .send({ args: { spokenText: 'hello' } });

    expect(res.status).toBe(200);
    expect(res.body.speakText).toContain('start again');
    expect(res.body.isDone).toBe(false);
  });

  it('falls back to the session id inside the call payload', async () => {
    await request(app)
      .post('/api/v1/voice/turn')
      .send({ args: { spokenText: 'hello there' }, call: { retell_llm_dynamic_variables: { session_id: 'from-body' } } });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'from-body' });
    expect(res.body.found).toBe(true);
    expect(res.body.turns[0].said).toBe('hello there');
  });
});

/**
 * Voice, then typing, then voice again - one conversation.
 *
 * Pressing the mic a second time used to start from nothing: a new session, an empty checklist,
 * and a caller asked their suburb twice in one sitting. The page holds the checklist by then, so
 * it hands it back and the new call begins where the last one stopped.
 */
describe('a second call in the same conversation', () => {
  const app = createApp();
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    resetChatSpend();
    setAiClient(new MockAiClient());
  });

  it('carries the checklist the page already holds', async () => {
    const checklist = { suburb: 'Berwick, VIC, 3806', material: 'colorbond', _ui: { turn: 4, lastAsked: 'material' } };
    const place = { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick', displayLabel: 'Berwick, VIC, 3806' };

    const res = await request(app)
      .post('/api/v1/voice/create-call')
      .send({ checklist: JSON.stringify(checklist), place: JSON.stringify(place) });

    expect(res.status).toBe(200);
    const stored = await repo.readVoiceSession(res.body.sessionId as string);
    expect(stored?.checklist).toMatchObject({ suburb: 'Berwick, VIC, 3806', material: 'colorbond' });
    expect(stored?.place).toMatchObject({ suburb: 'Berwick' });
    /* Only this call's turns belong to this call; the page already has the earlier ones. The one
       exception is the greeting, which is this call's opening line and nothing else's. */
    expect(stored?.turns).toHaveLength(1);
    expect(stored?.turns[0]).toMatchObject({ n: 0, said: '', wrote: '' });
    /* The opening line, whatever it turned out to be. It is the recap only when the page carried
       `checklistDisplay` too - the checklist alone is what the pipeline needs, not what is read
       out - and this call carried no display, so it opens like any other. */
    expect(stored?.turns[0]!.spoke).toBe(res.body.greeting);
  });

  it('keeps the greeting when the page has nothing to carry', async () => {
    const res = await request(app).post('/api/v1/voice/create-call').send({});
    expect(res.status).toBe(200);

    /* A session is written even with nothing carried, because the greeting has to survive a
       reload: Retell speaks it from a dynamic variable and never tells this service it did, so
       turn zero is the only record that the call opened at all. */
    const stored = await repo.readVoiceSession(res.body.sessionId as string);
    expect(stored?.checklist).toEqual({});
    expect(stored?.turns).toHaveLength(1);
    expect(stored?.turns[0]).toMatchObject({ n: 0, said: '', offered: [] });
    expect(stored?.turns[0]!.spoke).toBe(res.body.greeting);
  });

  it('numbers the first spoken turn 1, so the greeting does not take its place', async () => {
    const created = await request(app).post('/api/v1/voice/create-call').send({});
    const sessionId = created.body.sessionId as string;

    await request(app)
      .post(`/api/v1/voice/turn?sessionId=${sessionId}`)
      .send({ spokenText: 'I need a fence in Berwick' });

    const turns = (await repo.readVoiceSession(sessionId))!.turns;
    expect(turns.map((turn) => turn.n)).toEqual([0, 1]);
    // The greeting has no written form, so the handover still offers the real last question.
    const session = await request(app).get(`/api/v1/voice/session?sessionId=${sessionId}`);
    expect(session.body.message).toBeTruthy();
  });
});

/**
 * The first thing said on a call, given what the conversation already knows.
 *
 * A caller who typed half a brief and then pressed the microphone was being greeted like a
 * stranger, because the greeting was static text inside the Retell flow. It is written here now
 * and handed over as a dynamic variable, exactly the way `{{speak_text}}` is - so it is still our
 * sentence and not the speech model's.
 */
describe('the opening line', () => {
  it('is the ordinary greeting when nothing came before', () => {
    expect(greetingFor({})).toBe(OPENING_LINE);
    expect(greetingFor({ display: {}, message: '', options: [] })).toBe(OPENING_LINE);
  });

  it('picks the conversation up instead of starting again', () => {
    const said = greetingFor({
      display: { suburb: { title: 'Suburb', value: 'Pakenham, VIC, 3810' }, material: { title: 'Material', value: 'Treated pine' } },
      message: 'How long is the fence?',
      options: options(['10 metres', 10], ['15 metres', 15], ['Other', '__other__']),
    });

    expect(said).toContain('Welcome back');
    expect(said).toContain('Treated pine');
    expect(said).toContain('How long is the fence?');
    expect(said).toContain('Option A, 10 metres');
    expect(said).not.toContain('Option C');   // `__other__` is a text box, not something to say
    expect(said).not.toContain('thanks for calling');
  });

  it('says a suburb and a height the way they are spoken', () => {
    const said = greetingFor({
      display: { suburb: { title: 'Suburb', value: 'Berwick, VIC, 3806' }, heightKey: { title: 'Height', value: '1.8m' } },
      message: 'How long is the fence?',
    });

    expect(said).toContain('Victoria 3 8 0 6');
    expect(said).toContain('1 point 8 metres');
  });
});

/**
 * What the page gets back mid-call, and after it.
 *
 * The brief panel beside a live call could only ever fill in all at once when the call ended,
 * because the handover carried the checklist but not the two lists a panel actually draws.
 */
describe('the brief panel during a call', () => {
  const app = createApp();
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    resetChatSpend();
    setAiClient(new MockAiClient());
  });

  it('hands back what is answered and what is still to come', async () => {
    await runVoiceTurn('panel-1', { spokenText: 'I need a fence quote' }, { repo });
    await runVoiceTurn('panel-1', { spokenText: 'yes' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'panel-1' });

    expect(res.body.checklistDisplay).toBeDefined();
    const pending = res.body.checklistPending as { key: string; title: string }[];
    // In the order they will be asked, so a panel can draw them greyed underneath the answers.
    expect(pending[0]).toEqual({ key: 'suburb', title: 'Suburb' });
    expect(pending.map((entry) => entry.key)).toContain('material');
  });

  /* A transcript that keeps only the answer cannot show what it was chosen from - and a screen
     that has to say the rest in words ends up printing the spoken option read-out underneath the
     very choices it describes. */
  it('keeps the choices each turn offered, so every question can draw its own', async () => {
    await runVoiceTurn('offer-1', { spokenText: 'I need a fence quote' }, { repo });
    await runVoiceTurn('offer-1', { spokenText: 'yes' }, { repo });
    await runVoiceTurn('offer-1', { spokenText: 'Berwick 3806' }, { repo });
    await runVoiceTurn('offer-1', { spokenText: 'colorbond' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'offer-1' });
    const turns = res.body.turns as { n: number; wrote: string; offered: { label: string }[]; chose: string | null }[];

    // The material question offered real choices, and they are still on that turn.
    const asked = turns.find((turn) => /type of fence/i.test(turn.wrote));
    expect(asked).toBeDefined();
    expect(asked!.offered.map((option) => option.label)).toContain('Colorbond');

    /* The answer lives on the NEXT turn, because when this one was written it did not exist yet.
       That off-by-one is the whole rule a screen needs: fill the pill on turn n from n + 1. */
    const answer = turns[turns.indexOf(asked!) + 1];
    expect(answer!.chose).toBe('Colorbond');

    // The newest turn's offer is what the top-level `options` has always been.
    expect(turns.at(-1)!.offered).toEqual(res.body.options);
  });

  /* The object survives one hop and then goes through Firestore, a merge and a `JSON.parse`, and
     comes out reordered - so the panel reshuffles between the call and the results page. The
     ordered list is what a screen should draw from. */
  it('hands the answered half back as an ordered list, not only as an object', async () => {
    await runVoiceTurn('panel-3', { spokenText: 'I need a fence quote' }, { repo });
    await runVoiceTurn('panel-3', { spokenText: 'yes' }, { repo });
    await runVoiceTurn('panel-3', { spokenText: 'Berwick 3806' }, { repo });
    await runVoiceTurn('panel-3', { spokenText: 'colorbond' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'panel-3' });
    const answered = res.body.checklistAnswered as { key: string; title: string; value: string }[];

    // Same entries as the object, and every one of them carries the key it was stored under.
    expect(answered.length).toBe(Object.keys(res.body.checklistDisplay).length);
    for (const entry of answered) {
      expect(res.body.checklistDisplay[entry.key]).toEqual({ title: entry.title, value: entry.value });
    }
    // Asked in this order, so drawn in this order.
    const order = answered.map((entry) => entry.key);
    expect(order.indexOf('suburb')).toBeLessThan(order.indexOf('material'));
  });

  /* Tapping "Treated pine" in the text chat leaves "Treated pine" in the transcript. Saying it
     should leave the same thing, not "Treated pine. I need treated pine." */
  it('records which choice was picked, in the words it was offered in', async () => {
    await runVoiceTurn('panel-2', { spokenText: 'I need a fence' }, { repo });
    await runVoiceTurn('panel-2', { spokenText: 'yes' }, { repo });

    const started = (await repo.readVoiceSession('panel-2'))!;
    await repo.writeVoiceSession('panel-2', {
      ...started,
      place: { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' },
    });
    await runVoiceTurn('panel-2', { spokenText: 'Berwick' }, { repo });
    await runVoiceTurn('panel-2', { spokenText: 'Treated pine. I need treated pine.' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'panel-2' });
    const picked = res.body.turns.at(-1);

    expect(picked.said).toBe('Treated pine. I need treated pine.');
    expect(picked.chose).toBe('Treated pine');
  });

  /* "No, no." is not close enough to "No gates" for `matchSpokenToOption` to be sure of it - and it
     must not be, because a near-miss there records an answer nobody gave. The model reads it
     correctly anyway, so the chip comes from the answer that landed, not from what code matched. */
  it('names the choice even when only the model could resolve it', async () => {
    await runVoiceTurn('panel-4', { spokenText: 'I need a fence' }, { repo });
    await runVoiceTurn('panel-4', { spokenText: 'yes' }, { repo });

    const started = (await repo.readVoiceSession('panel-4'))!;
    await repo.writeVoiceSession('panel-4', {
      ...started,
      place: { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' },
    });
    await runVoiceTurn('panel-4', { spokenText: 'Berwick' }, { repo });
    await runVoiceTurn('panel-4', { spokenText: 'option C' }, { repo });   // Colorbond
    await runVoiceTurn('panel-4', { spokenText: 'option C' }, { repo });   // a height

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'panel-4' });
    const chose = (res.body.turns as { chose: string | null }[]).map((turn) => turn.chose);

    // Every turn that answered a multiple choice is named; the opener and the yes are not.
    expect(chose.filter(Boolean).length).toBeGreaterThanOrEqual(2);
    expect(chose).toContain('Colorbond');
  });

  it('leaves `chose` empty when they said something of their own', async () => {
    await runVoiceTurn('panel-3', { spokenText: 'I need a fence quote' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'panel-3' });
    expect(res.body.turns[0].chose).toBeNull();
  });
});

/**
 * A second call carries the conversation, and the greeting says so.
 */
describe('create-call, carrying a conversation', () => {
  const app = createApp();
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
  });

  it('stores the brief the page already holds', async () => {
    const res = await request(app)
      .post('/api/v1/voice/create-call')
      .send({
        checklist: JSON.stringify({ suburb: 'Berwick, VIC, 3806', material: 'colorbond', _ui: { turn: 4 } }),
        place: JSON.stringify({ latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick' }),
        options: JSON.stringify([{ label: '10 metres', value: 10 }]),
        checklistDisplay: JSON.stringify({ material: { title: 'Material', value: 'Colorbond' } }),
        message: 'How long is the fence?',
      });

    expect(res.status).toBe(200);
    const stored = await repo.readVoiceSession(res.body.sessionId as string);
    expect(stored?.checklist).toMatchObject({ material: 'colorbond' });
    expect(stored?.checklistDisplay).toMatchObject({ material: { title: 'Material', value: 'Colorbond' } });
    /* The greeting, and the choices it read out. `offered` is carried rather than left empty so
       the "turn n offers, turn n + 1 chose" rule survives the handover into a call. */
    expect(stored?.turns).toHaveLength(1);
    expect(stored?.turns[0]!.offered).toEqual([{ label: '10 metres', value: 10 }]);
    expect(stored?.turns[0]!.spoke).toContain('How long is the fence?');
  });
});

/**
 * Starting a call has its own ceiling.
 *
 * It was sharing the business submission route's limiter, which is documented as "two model calls
 * per submission" - a rationale that has nothing to do with minting a Retell token. The two
 * ceilings are for different costs and now move independently.
 */
describe('the ceiling on starting a call', () => {
  it('is not the business submission limiter', async () => {
    const { submitLimiter } = await import('../../src/http.js');
    const { voiceCallLimiter } = await import('../../src/client/limits.js');
    expect(voiceCallLimiter).not.toBe(submitLimiter);
  });
});

/**
 * A turn's identity is its number, not its position.
 *
 * Once a call passes `MAX_TURNS` the oldest turns are dropped and every index behind them shifts.
 * A page tracking "I have rendered the first N" then re-renders turns it already had, which in
 * React means new keys, a remounted list, and a visible flicker on every single reply.
 */
describe('turn numbering', () => {
  const app = createApp();
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    resetChatSpend();
    setAiClient(new MockAiClient());
  });

  it('numbers every turn from one, in order', async () => {
    await runVoiceTurn('n-1', { spokenText: 'I need a fence quote' }, { repo });
    await runVoiceTurn('n-1', { spokenText: 'yes' }, { repo });
    await runVoiceTurn('n-1', { spokenText: 'Berwick' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'n-1' });
    expect((res.body.turns as { n: number }[]).map((turn) => turn.n)).toEqual([1, 2, 3]);
  });

  it('keeps counting up when the oldest turns are dropped', async () => {
    const filler = Array.from({ length: 59 }, (_, index) => ({
      n: index + 1,
      at: new Date(Date.now() - (60 - index) * 1000).toISOString(),
      said: `said ${index + 1}`,
      spoke: '',
      wrote: '',
      offered: [],
      chose: null,
    }));
    await repo.writeVoiceSession('n-2', { checklist: {}, place: null, options: [], turns: filler, updatedAt: new Date().toISOString() });

    await runVoiceTurn('n-2', { spokenText: 'one more' }, { repo });
    await runVoiceTurn('n-2', { spokenText: 'and another' }, { repo });

    const stored = (await repo.readVoiceSession('n-2'))!;
    expect(stored.turns).toHaveLength(60);          // the oldest was dropped
    expect(stored.turns[0]!.n).toBe(2);             // so position 0 is no longer turn 1
    expect(stored.turns.at(-1)!.n).toBe(61);        // and numbering never restarted
  });

  /* `n` orders a call against itself. It cannot order a call against the messages typed either
     side of it, and a page holding both has to put them in one list. */
  it('stamps every turn with a time, so typed and spoken messages can be interleaved', async () => {
    await runVoiceTurn('n-3', { spokenText: 'I need a fence quote' }, { repo });
    await runVoiceTurn('n-3', { spokenText: 'yes' }, { repo });

    const res = await request(app).get('/api/v1/voice/session').query({ sessionId: 'n-3' });
    const times = (res.body.turns as { at: string }[]).map((turn) => Date.parse(turn.at));

    expect(times.every((time) => Number.isFinite(time))).toBe(true);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
