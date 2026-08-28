import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { setAiClient, MockAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { createApp } from '../../src/server.js';
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
    // Only this call's turns belong to this call; the page already has the earlier ones.
    expect(stored?.turns).toEqual([]);
  });

  it('starts clean when the page has nothing to carry', async () => {
    const res = await request(app).post('/api/v1/voice/create-call').send({});
    expect(res.status).toBe(200);
    expect(await repo.readVoiceSession(res.body.sessionId as string)).toBeNull();
  });
});
