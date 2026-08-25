import { beforeEach, describe, expect, it } from 'vitest';
import { mergeAndDecide } from '../../src/client/mergeAndDecide.js';
import { clearSchemaCache, loadTradeSchema, type TradeSchema } from '../../src/client/schema.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
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
