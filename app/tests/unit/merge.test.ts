import { beforeEach, describe, expect, it } from 'vitest';
import { MockAiClient, setAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { runFencingChat } from '../../src/client/controller.js';
import { mergeAndDecide } from '../../src/client/mergeAndDecide.js';
import { clearSchemaCache, loadTradeSchema, type TradeSchema } from '../../src/client/schema.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { BERWICK } from '../golden/conversations.js';
import type { Checklist, Place, TurnExtraction, UiState } from '../../src/client/schemas.js';

/**
 * The merge engine on its own, without a model or a repository in the way. These are the rules
 * that decide what the customer is asked next, so each test here is a conversation bug that
 * actually reached a customer.
 */

const PLACE: Place = { latitude: -38.03, longitude: 145.34, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' };
const PAKENHAM: Place = { latitude: -38.07, longitude: 145.48, suburb: 'Pakenham', displayLabel: 'Pakenham, VIC 3810' };

let schema: TradeSchema;

beforeEach(async () => {
  setRepository(new MemoryRepository());
  clearSchemaCache();
  schema = await loadTradeSchema('fencing');
});

const ui = (over: Partial<UiState> = {}): UiState => ({
  turn: 7,
  cursor: {},
  lastAsked: null,
  lastQuestion: '',
  lastValues: [],
  lastType: 'question',
  fixing: false,
  rejectedPlaces: [],
  nearbyPlaces: {},
  suburbHint: null,
  place: PLACE,
  ...over,
});

const turn = (checklist: Partial<TurnExtraction['checklist']> = {}, over: Partial<TurnExtraction> = {}): TurnExtraction => ({
  ack: '',
  clearFields: [],
  suggestedSuburb: null,
  wantsMoreOptions: false,
  confirmed: false,
  offTopic: false,
  askedAbout: null,
  namedOffList: null,
  askedKind: null,
  pictureOf: null,
  mentionedOldFence: false,
  checklist: {
    material: null, heightKey: null, lengthMeters: null, removal: null,
    conditions: null, gateType: null, gateQty: null, existingPrice: null,
    ...checklist,
  },
  ...over,
});

const partial = (over: Partial<Checklist> = {}): Partial<Checklist> => ({
  suburb: 'Berwick, VIC 3806', material: 'colorbond', heightKey: '1.8m', lengthMeters: 15,
  removal: 'none', conditions: null, gateType: null, gateQty: null, existingPrice: null,
  ...over,
});

const run = (message: string, known: Partial<Checklist>, turnExtraction: TurnExtraction, place: Place | null = PLACE) =>
  mergeAndDecide({
    sessionId: 's', message, place, known, turnExtraction,
    docFacts: {}, docSuburbHint: null, haystackText: message + ' ', schema,
  });

describe('a negative answer only answers the question that was asked', () => {
  it('does not let "none" for site conditions silently answer the gate question', () => {
    // What the customer did: tapped "Nothing tricky" (value "none") for site conditions.
    // What the model did: helpfully filled gateType: "none" as well.
    // The `mentioned()` guard cannot catch this - the word "none" IS in what they wrote - so the
    // gate question was never asked and the recap claimed they wanted no gates.
    const state = run(
      'none',
      partial({ _ui: ui({ lastAsked: 'conditions' }) }),
      turn({ conditions: [], gateType: 'none' }),
    );

    expect(state.checklist.conditions).toEqual([]); // the field they actually answered
    expect(state.checklist.gateType).toBeNull(); // NOT answered on their behalf
    expect(state.nextField).toBe('gateType'); // so it still gets asked
  });

  it('accepts the negative for the field that WAS asked', () => {
    const state = run('none', partial({ _ui: ui({ lastAsked: 'gateType' }) }), turn({ gateType: 'none' }));
    expect(state.checklist.gateType).toBe('none');
  });

  it('still lets one sentence fill several fields when the values are real', () => {
    // The reason the guard cannot simply forbid unasked fields: this has to keep working.
    const state = run(
      'about 30m of colorbond, 1.8m high',
      partial({ material: null, heightKey: null, lengthMeters: null, _ui: ui({ lastAsked: 'material' }) }),
      turn({ material: 'colorbond', heightKey: '1.8m', lengthMeters: 30 }),
    );

    expect(state.checklist.material).toBe('colorbond');
    expect(state.checklist.heightKey).toBe('1.8m');
    expect(state.checklist.lengthMeters).toBe(30);
  });

  it('lets a correction clear a field, negatives included', () => {
    // "fixing" mode is the one time an unasked field may move - the customer is telling us we got
    // something wrong, so they are allowed to talk about a field we are not currently asking about.
    const state = run(
      'actually there are no gates',
      partial({ gateType: 'pedestrian_single', gateQty: 2, _ui: ui({ lastAsked: 'conditions' }) }),
      turn({ gateType: 'none' }),
    );
    expect(state.checklist.gateType).toBe('none');
  });
});

describe('"something is wrong" reopens the field the customer named', () => {
  const settled = () =>
    partial({
      suburb: 'Pakenham, VIC 3810', material: 'timber_pine', heightKey: '1.2m', lengthMeters: 10,
      removal: 'timber', conditions: ['sloped'], gateType: 'pedestrian_single', gateQty: 1,
      _ui: ui({ lastAsked: null, lastQuestion: 'what should I fix?', lastType: 'message', fixing: true, place: PAKENHAM }),
    });

  it('reopens the suburb picker, which needs the confirmed place dropped as well', () => {
    // The suburb is re-derived from the confirmed place every turn and `isMissing` tests that
    // place, not the checklist value - so emptying the field alone was silently undone and the
    // customer was handed the same recap back with no way to change anything.
    const state = run('the suburb is wrong', settled(), turn({}, { clearFields: ['suburb'] }), null);

    expect(state.checklist.suburb).toBeNull();
    expect(state.place).toBeNull();
    expect(state.nextField).toBe('suburb');
  });

  it('understands "I want to change X" even when the model reports nothing', () => {
    // Verified against the live model: it reads "the suburb is wrong" as a correction but
    // returned an empty clearFields for "I want to change the suburb". The field names are ours,
    // so they are recognised in code too - typos included, "subrub" came off a real screenshot.
    const state = run('i want to change the subrub', settled(), turn({}, { clearFields: [] }), null);

    expect(state.checklist.suburb).toBeNull();
    expect(state.nextField).toBe('suburb');
  });

  it('clears only the field named, not the rest of the brief', () => {
    const state = run('the height is wrong', settled(), turn({}, { clearFields: [] }), null);

    expect(state.nextField).toBe('heightKey');
    expect(state.checklist.suburb).toContain('Pakenham');
    expect(state.checklist.material).toBe('timber_pine');
    expect(state.checklist.lengthMeters).toBe(10);
  });

  it('keeps a correction that arrives with its own replacement value', () => {
    // "Make it 2 gates" names a field and answers it in the same breath. Clearing it would throw
    // the new answer away and ask for it again - and a bare "gates" must not re-open the gate
    // TYPE either, which the customer never said was wrong.
    const state = run('actually make it 2 gates', settled(), turn({ gateQty: 2 }, { clearFields: [] }), null);

    expect(state.checklist.gateQty).toBe(2);
    expect(state.checklist.gateType).toBe('pedestrian_single');
    expect(state.nextField).toBeNull();
  });

  it('reads a mistyped field name, because that is what people type', () => {
    // Two adjacent letters swapped is the commonest typo there is, and the model returned nothing
    // for any of these. "lenght" is the one a customer actually sent - they were handed back an
    // unchanged recap and had no way to change the length at all.
    for (const [message, expected] of [
      ['lenght', 'lengthMeters'],
      ['hieght', 'heightKey'],
      ['matrial', 'material'],
      ['the subrub', 'suburb'],
    ] as const) {
      const state = run(message, settled(), turn({}, { clearFields: [] }), null);
      expect(state.nextField, message).toBe(expected);
    }
  });

  it('clears the field even when the model echoes the whole brief back with it', () => {
    // Straight off the live model: asked to change the length it returned clearFields
    // ["lengthMeters"] correctly, and then echoed the entire brief - 15 metres included. Reading
    // that echo as "they gave a new value" left the field exactly as it was, and the customer was
    // handed the same recap for a second time.
    const echoed = {
      material: 'timber_pine', heightKey: '1.2m', lengthMeters: 10, removal: 'timber',
      conditions: ['sloped'], gateType: 'pedestrian_single', gateQty: 1, existingPrice: null,
    };
    const state = run('lenght', settled(), turn(echoed, { clearFields: ['lengthMeters'] }), null);

    expect(state.checklist.lengthMeters).toBeNull();
    expect(state.nextField).toBe('lengthMeters');
    // ...and nothing else in the brief moved
    expect(state.checklist.material).toBe('timber_pine');
    expect(state.checklist.gateQty).toBe(1);
  });

  it('says so when it cannot tell which field they meant, instead of repeating the recap', () => {
    // Falling through to the recap hands back the identical message and reads as being ignored.
    const state = run('asdfgh', settled(), turn({}, { clearFields: [] }), null);

    expect(state.fixingUnresolved).toBe(true);
    expect(state.nextField).toBeNull(); // nothing was reopened - there was nothing to reopen
  });

  it('does not call a turn unresolved when the customer did give a new value', () => {
    const state = run('make it 25 metres', settled(), turn({ lengthMeters: 25 }, { clearFields: [] }), null);

    expect(state.checklist.lengthMeters).toBe(25);
    expect(state.fixingUnresolved).toBe(false);
  });

  it('ignores field words entirely when the customer is not correcting anything', () => {
    // "The height is 1.8m" during a normal turn is an answer, not a request to empty the height.
    const state = run(
      '1.8m',
      partial({ heightKey: null, _ui: ui({ lastAsked: 'heightKey', fixing: false }) }),
      turn({ heightKey: '1.8m' }),
    );
    expect(state.checklist.heightKey).toBe('1.8m');
  });
});

describe('something that is not about a fence', () => {
  it('contributes nothing to the brief, however confident the document reader was', () => {
    // A takeaway menu attached instead of a quote. The reader is regex and does not know what it
    // is reading - "Total for 2 pizzas: $39.50" matched the total pattern and became the
    // customer's existing quote, which then counted as "they answered something" and suppressed
    // the off-topic reply entirely. Verified against the live model, which called it correctly.
    const state = mergeAndDecide({
      sessionId: 's', message: 'here is my quote', place: null, haystackText: 'here is my quote pizza',
      docFacts: { existingPrice: 39.5 }, docSuburbHint: null, schema, known: {},
      turnExtraction: turn({ existingPrice: 39.5 }, { offTopic: true }),
    });

    expect(state.offTopic).toBe(true);
    expect(state.checklist.existingPrice).toBeNull();
  });

  it('never outranks an answer to the question actually on screen', () => {
    // The model reads sentences and can misjudge one. A tap, or a typed answer to the current
    // question, is resolved in code rather than by the model - so it survives regardless.
    const state = run(
      'colorbond',
      partial({ material: null, _ui: ui({ lastAsked: 'material' }) }),
      turn({}, { offTopic: true }),
    );

    expect(state.checklist.material).toBe('colorbond');
    expect(state.offTopic).toBe(false); // a real answer landed, so the turn was not off topic
  });

  it('never outranks a yes on the recap', () => {
    const complete = partial({ conditions: [], gateType: 'none', _ui: ui({ lastType: 'confirmation' }) });
    const state = run('yes', complete, turn({}, { confirmed: true, offTopic: true }));

    expect(state.saidYes).toBe(true);
    expect(state.offTopic).toBe(false);
  });
});

describe('the suburb is asked once', () => {
  it('remembers the picked place when a later turn sends no place at all', () => {
    const state = run('colorbond', partial({ _ui: ui({ lastAsked: 'material' }) }), turn({ material: 'colorbond' }), null);

    expect(state.place).not.toBeNull();
    expect(state.checklist.suburb).toContain('Berwick');
    expect(state.missing).not.toContain('suburb');
  });

  it('forgets a place the customer was told nobody covers', () => {
    const state = run(
      'Berwick',
      partial({ _ui: ui({ lastAsked: 'suburb', rejectedPlaces: ['berwick-vic-3806'], place: null }) }),
      turn(),
      { ...PLACE, displayLabel: 'Berwick, VIC 3806' },
    );

    expect(state.place).toBeNull();
    expect(state.nextField).toBe('suburb');
  });
});

describe('the search waits for a yes', () => {
  it('does not run the matcher on the recap turn itself', () => {
    const complete = partial({ conditions: [], gateType: 'none', _ui: ui({ lastAsked: 'gateType', lastType: 'question' }) });
    const state = run('none', complete, turn({ gateType: 'none' }));

    expect(state.nextField).toBeNull(); // brief is complete
    expect(state.needsMatcher).toBe(false); // but nothing is searched for yet
  });

  it('runs it once the customer agrees to the recap', () => {
    const complete = partial({ conditions: [], gateType: 'none', _ui: ui({ lastType: 'confirmation' }) });
    const state = run('yes', complete, turn({}, { confirmed: true }));

    expect(state.saidYes).toBe(true);
    expect(state.needsMatcher).toBe(true);
  });
});

describe('a bare number only answers the question that was asked', () => {
  /* What the customer did: asked "what height are you after?", typed "15m".
     What happened: 15 is not a height anybody builds at, so it was correctly refused as one -
     and then quietly became the LENGTH, because 15 is a fine number of metres and `mentioned()`
     only checks the number appears in what they wrote. The length question was never asked, and
     the customer had answered it without knowing. They found out at the recap. */
  it('does not let a height that was refused become the length', () => {
    const state = run(
      '15m',
      partial({ heightKey: null, lengthMeters: null, _ui: ui({ lastAsked: 'heightKey', lastValues: ['1.2m', '1.5m', '1.8m', '__other__'] }) }),
      turn({ heightKey: '0.15m', lengthMeters: 15 }),
    );

    expect(state.checklist.heightKey).toBeNull(); // not a height they can have
    expect(state.checklist.lengthMeters).toBeNull(); // and NOT quietly the length either
    expect(state.nextField).toBe('heightKey'); // so the question comes back
  });

  it('still takes the number for the field it was actually asked for', () => {
    const state = run(
      '30',
      partial({ lengthMeters: null, _ui: ui({ lastAsked: 'lengthMeters' }) }),
      turn({ lengthMeters: 30 }),
    );

    expect(state.checklist.lengthMeters).toBe(30);
  });

  /* A sentence is not a bare number. Naming several things at once is the whole point of free
     text, and this guard must not cost it. */
  it('leaves a sentence naming several things alone', () => {
    const state = run(
      'about 30 metres of colorbond, 1.8 high',
      partial({ material: null, heightKey: null, lengthMeters: null, _ui: ui({ lastAsked: 'material' }) }),
      turn({ material: 'colorbond', heightKey: '1.8m', lengthMeters: 30 }),
    );

    expect(state.checklist.material).toBe('colorbond');
    expect(state.checklist.heightKey).toBe('1.8m');
    expect(state.checklist.lengthMeters).toBe(30);
  });

  /* While they are correcting something, every field is open by design - `mayOverwrite` is
     already true everywhere - and a bare number is how a correction usually arrives. */
  it('leaves a correction alone', () => {
    const state = run(
      '20',
      partial({ lengthMeters: 15, _ui: ui({ lastAsked: 'lengthMeters', fixing: true }) }),
      turn({ lengthMeters: 20 }),
    );

    expect(state.checklist.lengthMeters).toBe(20);
  });
});

/**
 * Asking about a fence is not choosing one.
 *
 * Straight off two screenshots, a week apart. The customer typed "colorbon, timber pine, aluminium
 * ... from these which is best?? and avalibilty of color bewtween all these?" while the material
 * question was on screen, and the brief filled itself in with Treated pine - a fence they had
 * explicitly not picked - and moved on to the height. The first fix caught the model reporting a
 * value out of a question and missed the route that needs no model at all, which is why the second
 * screenshot looked exactly like the first.
 */
describe('a question names things without choosing them', () => {
  const ASKED = { askedAbout: 'avalibilty of color bewtween all these?', askedKind: 'advice' as const };
  const COMPARING = 'colorbon , timber pine , aluminium ... from these which is best ?? and avalibilty of color bewtween all these?';

  it('does not choose a fence out of a sentence comparing three of them', () => {
    const state = run(COMPARING, partial({ material: null, _ui: ui({ lastAsked: 'material' }) }), turn({ material: 'colorbond' }, ASKED));

    expect(state.checklist.material).toBeNull();
    // And the question they were asked is still waiting for them.
    expect(state.missing).toContain('material');
  });

  /**
   * The same sentence with the model contributing nothing, because the model was never the
   * problem: `validate` runs the whole message through the vocabulary and finds a material
   * ANYWHERE in it, so "timber pine" scored two words and won on its own.
   */
  it('does not choose one in code either, with nothing from the model at all', () => {
    const state = run(COMPARING, partial({ material: null, _ui: ui({ lastAsked: 'material' }) }), turn({}, ASKED));

    expect(state.checklist.material).toBeNull();
  });

  /**
   * The other direction, and the one that matters just as much: a question does not cancel an
   * answer that arrived with it. Erring towards asking again is right; erring into asking twice is
   * the complaint this whole conversation started with.
   */
  it('still takes the answer when they answer and ask in the same breath', () => {
    const asked = { askedAbout: 'do i need a council permit?', askedKind: 'advice' as const };
    const state = run(
      'aluminium, do i need a council permit?',
      partial({ material: null, _ui: ui({ lastAsked: 'material' }) }),
      turn({ material: 'aluminium' }, asked),
    );

    expect(state.checklist.material).toBe('aluminium');
  });

  /**
   * "Aluminium" is a word in `aluminium` AND in `pool_aluminium`, so a version of this that counted
   * how many choices the sentence touched threw away an answer somebody had given in plain words.
   * What disqualifies a value is another choice being NAMED, not a word being shared.
   */
  it('is not confused by two choices sharing a word', () => {
    const asked = { askedAbout: 'is it any good on a slope?', askedKind: 'advice' as const };
    const state = run(
      'aluminium thanks, is it any good on a slope?',
      partial({ material: null, _ui: ui({ lastAsked: 'material' }) }),
      turn({ material: 'aluminium' }, asked),
    );

    expect(state.checklist.material).toBe('aluminium');
  });

  /**
   * The leftovers have to SAY it, not merely fail to contradict it.
   *
   * "Can you tell me which fence type is better, treated pine or colorbond?" leaves "can you tell
   * me" once their question is cut out - which names no fence at all, so the treated pine the
   * vocabulary found was read entirely out of the question. An earlier version only checked that
   * nothing else was named, and "can you tell me" names nothing else either, so it let it through.
   */
  it('does not accept a value that only the question said', () => {
    const asked = { askedAbout: 'which fence type is better treated pine or colorbond ?', askedKind: 'advice' as const };
    const state = run(
      'can you tell me which fence type is better treated pine or colorbond ?',
      partial({ material: null, _ui: ui({ lastAsked: 'material' }) }),
      turn({ material: 'colorbond' }, asked),
    );

    expect(state.checklist.material).toBeNull();
    expect(state.missing).toContain('material');
  });

  /**
   * The same two fences weighed up, with the model failing to flag it as a question at all - which
   * it does. So the shortcut is guarded whether or not a question was reported: it is a fuzzy match
   * over a sentence with no judgement in it, and "treated pine" outscoring "colorbond" two words to
   * one is not somebody choosing a fence.
   */
  it('does not pick the higher-scoring of two fences when no question was flagged', () => {
    const state = run(
      'treated pine or colorbond, what do you reckon?',
      partial({ material: null, _ui: ui({ lastAsked: 'material' }) }),
      turn({}),
    );

    expect(state.checklist.material).toBeNull();
  });

  /** A tap carries no question at all, so none of this applies to the commonest turn there is. */
  it('leaves a tapped option exactly as it was', () => {
    const state = run('colorbond', partial({ material: null, _ui: ui({ lastAsked: 'material' }) }), turn({}));

    expect(state.checklist.material).toBe('colorbond');
  });
});

/**
 * A fence type nobody on the list builds.
 *
 * Off a screenshot of a voice call: the caller heard three choices, said "okay okay, please select
 * the tubular steel", and was told "Sorry, I didn't catch that" - then read the same three choices
 * again. It had caught it perfectly; tubular steel is simply not in the trade's vocabulary. The
 * list is what businesses near them publish rates against and it is short, so this is not a rare
 * customer being difficult - it is most of the fences sold in Australia.
 *
 * So it is taken as their answer and the brief moves on. Nobody turns out to quote it, and the
 * results turn is where that is said, with the whole brief in hand to offer alternatives against.
 */
describe('a fence type the vocabulary has no slug for', () => {
  const asked = ui({ lastAsked: 'material', lastValues: ['aluminium', 'pool_aluminium', 'pool_glass'] });

  it('takes what they named and carries on', () => {
    const state = run(
      'okay okay, please select the tubular steel',
      partial({ material: null, _ui: asked }),
      turn({}, { namedOffList: 'tubular steel' }),
    );

    expect(state.checklist.material).toBe('other:tubular-steel');
    // Asked and answered - the question does not come back, and the next one is asked.
    expect(state.missing).not.toContain('material');
    expect(state.offListChoice).toEqual({ field: 'material', label: 'Tubular steel' });
  });

  /**
   * The marker is the safety. A bare `tubular-steel` in a checklist is indistinguishable from a
   * canonical slug, and one slug meaning two things is the failure this product guards hardest
   * against - so what a customer named carries a prefix that no vocabulary value can have.
   */
  it('survives the next turn, and is never mistaken for one of ours', () => {
    const chosen = partial({ material: 'other:tubular-steel', _ui: ui({ lastAsked: 'heightKey' }) });
    const state = run('1.8m', chosen, turn({ heightKey: '1.8m' }));

    // `validate` runs over the echoed checklist every turn, and used to wipe it.
    expect(state.checklist.material).toBe('other:tubular-steel');
    expect(state.missing).not.toContain('material');
    // Read back to the customer in their own words, never as the marker.
    expect(state.labelFor('material', 'other:tubular-steel')).toBe('Tubular steel');
  });

  /** It is only off-list if it is genuinely absent. A model that reports one of ours here is wrong. */
  it('ignores it when the vocabulary does have the thing they named', () => {
    const state = run('colorbond', partial({ material: null, _ui: asked }), turn({}, { namedOffList: 'Colorbond' }));

    expect(state.checklist.material).toBe('colorbond');
    expect(state.offListChoice).toBeNull();
  });

  /** A clause is a misread, not a fence. "Tubular steel" is two words; a sentence is not. */
  it('refuses a whole sentence', () => {
    const state = run(
      'I was thinking maybe something in a nice dark steel if that is possible',
      partial({ material: null, _ui: asked }),
      turn({}, { namedOffList: 'something in a nice dark steel if that is possible' }),
    );

    expect(state.checklist.material).toBeNull();
  });

  /** Only ever the field on screen. It cannot reach across and answer something else. */
  it('does not answer a field that was not asked', () => {
    const state = run(
      'tubular steel',
      partial({ material: null, _ui: ui({ lastAsked: 'lengthMeters' }) }),
      turn({}, { namedOffList: 'tubular steel' }),
    );

    expect(state.checklist.material).toBeNull();
  });

  /** A real answer always wins - this is the last thing tried, never the first. */
  it('is not consulted when they answered from the list', () => {
    const state = run(
      'colorbond, is tubular steel a thing?',
      partial({ material: null, _ui: asked }),
      turn({ material: 'colorbond' }, { namedOffList: 'tubular steel', askedAbout: 'is tubular steel a thing?', askedKind: 'advice' }),
    );

    expect(state.checklist.material).toBe('colorbond');
    expect(state.offListChoice).toBeNull();
  });

  /** Weighing several up is choosing none, and that stays true here. */
  it('takes nothing from a turn that was only a question', () => {
    const state = run(
      'is tubular steel better than colorbond',
      partial({ material: null, _ui: asked }),
      turn({}, { namedOffList: 'tubular steel', askedAbout: 'is tubular steel better than colorbond', askedKind: 'advice' }),
    );

    expect(state.checklist.material).toBeNull();
  });
});

/**
 * "My fence blew over" and then, six questions later, "nothing to remove".
 *
 * Both cannot be true, and the one that gets believed is whichever arrived last - which takes the
 * removal charge out of a quote for a job that starts by pulling a fence down. Nobody would spot
 * that until the day.
 */
describe('a fence they said was already there', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
  });

  /** Reports an old fence on the turn it is mentioned, and nothing else out of the ordinary. */
  function mentionsOldFence(said: string): AiClient {
    const inner = new MockAiClient();
    return {
      model: 'mentions',
      async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
        const base = await inner.callStructured(call);
        if (call.name !== 'turn' || !call.user.includes(said)) return base;
        const reported = base.data as { checklist: Record<string, unknown> };
        return {
          ...base,
          data: call.schema.parse({
            ...reported,
            checklist: { ...reported.checklist, material: null },
            ack: "No worries, we'll get that sorted for you",
            mentionedOldFence: true,
          }),
        };
      },
    };
  }

  async function upToRemoval(script: string[]) {
    let checklist: Checklist | null = null;
    let place: Place | null = null;
    let response = null as Awaited<ReturnType<typeof runFencingChat>> | null;

    for (const text of script) {
      if (text === 'Berwick') place = BERWICK;
      response = await runFencingChat(
        {
          message: text,
          sessionId: 'oldfence',
          place: place ? JSON.stringify(place) : '',
          knownChecklist: checklist ? JSON.stringify(checklist) : '',
        },
        [],
        { repo },
      );
      checklist = response.checklist;
      place = response.place ?? null;
    }
    return response!;
  }

  const brief = (damage: string) => [
    'I need a fence quote',
    'yes go ahead',
    'Berwick',
    damage,
    'colorbond',
    '1.8m',
    '20',
    'none',
  ];

  it('puts the removal question back once when they say there is nothing to take away', async () => {
    const damage = 'my fence blew over in the storm last night';
    setAiClient(mentionsOldFence(damage));

    const response = await upToRemoval(brief(damage));

    expect(response.message).toContain("there's a fence there already");
    expect(response.checklist.removal ?? null).toBeNull();
    expect(response.checklistPending.some((entry) => entry.key === 'removal')).toBe(true);
  });

  /* Asked twice it stops being a check and becomes an argument - and they may well mean it, since
     a fence that blew over may already have been carted away. */
  it('takes the same answer the second time without asking again', async () => {
    const damage = 'my fence blew over in the storm last night';
    setAiClient(mentionsOldFence(damage));

    const response = await upToRemoval([...brief(damage), 'none']);

    expect(response.message).not.toContain("there's a fence there already");
    expect(response.checklist.removal).toBe('none');
  });

  it('says nothing when they never mentioned an old fence', async () => {
    setAiClient(new MockAiClient());

    const response = await upToRemoval(brief('colorbond please'));

    expect(response.message).not.toContain("there's a fence there already");
    expect(response.checklist.removal).toBe('none');
  });
});
