import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/server.js';
import { MemoryRepository, setRepository, type CapabilitiesDoc, type PricingDoc } from '../../src/store.js';
import type { Checklist, UiState } from '../../src/client/schemas.js';
import { clearSchemaCache } from '../../src/client/schema.js';

/**
 * Drives the ported `client/fencing-chat` route the way the real client does: each turn's
 * response `checklist` (including `_ui`) is fed straight back in as the next turn's
 * `knownChecklist`. Nothing is asserted about intermediate internals - only the same wire
 * contract the frontend consumes (`MESSAGE-TO-CLIENT-DEV.md` / `CLIENT-UI-CHANGES.md`).
 */

const app = createApp();
let repo: MemoryRepository;

beforeEach(() => {
  repo = new MemoryRepository();
  setRepository(repo);
  clearSchemaCache(); // the schema is process-cached, so a test must not inherit another's
});

const BERWICK = { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick', state: 'VIC', postcode: '3806', displayLabel: 'Berwick, VIC 3806' };

function seedBusiness(uid: string, name: string, pricingOverrides: Partial<PricingDoc> = {}, capabilitiesOverrides: Partial<CapabilitiesDoc> = {}) {
  const now = new Date().toISOString();
  repo.addCandidate({
    uid,
    businessName: name,
    servicesProvided: ['fencing'],
    rating: 4.8,
    reviewCount: 120,
    isAutoAcceptEnabled: false,
    isAiAutoAcceptEnabled: true,
  });
  const pricing: PricingDoc = {
    trade: 'fencing',
    status: 'confirmed',
    schemaVersion: 1,
    updatedAt: now,
    confirmedAt: now,
    ratesSaved: 1,
    gstIncluded: true,
    enabledMaterials: ['colorbond'],
    rates: { colorbond: { '1.8m': 110 } },
    removals: [],
    gates: [],
    siteConditions: [],
    serviceArea: {
      baseLocation: 'Berwick',
      resolved: { suburb: 'Berwick', state: 'VIC', postcode: '3806', lat: BERWICK.latitude, lng: BERWICK.longitude, source: 'google' },
      radiusKm: 30,
      excludedAreas: [],
    },
    minimumCharge: 500,
    ...pricingOverrides,
  };
  const capabilities: CapabilitiesDoc = {
    trade: 'fencing',
    schemaVersion: 1,
    updatedAt: now,
    businessName: name,
    specs: [],
    permits: { included: null, fee: null },
    warranty: { years: null, text: null },
    tags: [],
    extras: [],
    inclusions: [],
    exclusions: [],
    otherOfferings: [],
    couldNotUse: [],
    ...capabilitiesOverrides,
  };
  repo.savePricing(uid, pricing);
  repo.saveCapabilities(uid, capabilities);
}

const chatTurn = (message: string, sessionId: string, place: unknown, knownChecklist: unknown) =>
  request(app)
    .post('/api/v1/client/fencing-chat')
    .send({
      message,
      sessionId,
      place: place ? JSON.stringify(place) : '',
      knownChecklist: knownChecklist ? JSON.stringify(knownChecklist) : '',
    });

describe('POST /client/fencing-chat', () => {
  it('walks a full conversation from opener to a priced result', async () => {
    seedBusiness('biz-1', 'Southeast Fencing & Gates');

    let res = await chatTurn('I need a fence quote', 's1', null, null);
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('message');
    expect(res.body.checklistComplete).toBe(false);
    let checklist = res.body.checklist;

    res = await chatTurn('yes go ahead', 's1', null, checklist);
    expect(res.body.expects).toBe('suburb');
    checklist = res.body.checklist;

    res = await chatTurn('Berwick', 's1', BERWICK, checklist);
    checklist = res.body.checklist;
    expect(checklist.suburb).toContain('Berwick');
    expect(res.body.type).toBe('question'); // straight on to material - the picker fills suburb in one step

    // The client holds `place` as its own current-selection state and includes it on every
    // subsequent call, the same way it always includes `sessionId` - `checklist.suburb` is a
    // display string derived fresh from `place` each turn, not something the round-trip alone
    // carries (mirrors `isMissing('suburb') = !place` in mergeAndDecide.ts).
    res = await chatTurn('colorbond', 's1', BERWICK, checklist);
    checklist = res.body.checklist;
    expect(checklist.material).toBe('colorbond');

    res = await chatTurn('1.8m', 's1', BERWICK, checklist);
    checklist = res.body.checklist;
    expect(checklist.heightKey).toBe('1.8m');

    res = await chatTurn('30', 's1', BERWICK, checklist);
    checklist = res.body.checklist;
    expect(checklist.lengthMeters).toBe(30);

    res = await chatTurn('none', 's1', BERWICK, checklist);
    checklist = res.body.checklist;
    expect(checklist.removal).toBe('none');

    res = await chatTurn('none', 's1', BERWICK, checklist);
    checklist = res.body.checklist;
    expect(checklist.conditions).toEqual([]);

    res = await chatTurn('none', 's1', BERWICK, checklist);
    checklist = res.body.checklist;
    expect(checklist.gateType).toBe('none');
    expect(res.body.type).toBe('confirmation');

    res = await chatTurn('yes', 's1', BERWICK, checklist);
    expect(res.body.type).toBe('result');
    expect(res.body.checklistComplete).toBe(true);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].businessName).toBe('Southeast Fencing & Gates');
    // 30m x $110/m, GST already included, above the $500 minimum
    expect(res.body.results[0].estimatedTotal).toBe(3300);
    expect(res.body.comparison.totalQuotesScreened).toBe(1);
  });

  it('never re-asks a field the client already has, and never shows more than 3 options + Other', async () => {
    const res = await chatTurn('material please', 's2', BERWICK, {
      suburb: 'Berwick, VIC 3806',
      material: null,
      heightKey: null,
      lengthMeters: null,
      removal: null,
      conditions: null,
      gateType: null,
      gateQty: null,
      existingPrice: null,
      _ui: { turn: 3, cursor: {}, lastAsked: 'material', lastQuestion: 'What type of fence are you after?', lastValues: [], lastType: 'question', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null } satisfies UiState,
    } satisfies Checklist);

    expect(res.body.checklist.suburb).toBe('Berwick, VIC 3806'); // untouched - already known, and not this turn's field
    expect(res.body.options.length).toBeLessThanOrEqual(4); // 3 real choices + Other
    expect(res.body.options.some((o: { value: string }) => o.value === '__other__')).toBe(true);
  });

  it('offers a real alternative when nobody publishes the exact material requested', async () => {
    seedBusiness('biz-2', 'Only Does Colorbond');

    const finished: Checklist = {
      suburb: 'Berwick, VIC 3806',
      material: 'aluminium', // this business has no aluminium rate at all
      heightKey: '1.8m',
      lengthMeters: 20,
      removal: 'none',
      conditions: [],
      gateType: 'none',
      gateQty: null,
      existingPrice: null,
      _ui: { turn: 9, cursor: {}, lastAsked: null, lastQuestion: '', lastValues: [], lastType: 'confirmation', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null },
    };

    const res = await chatTurn('yes', 's3', BERWICK, finished);

    expect(res.body.type).toBe('question');
    expect(res.body.noMatchReason).toBe('alternative');
    expect(res.body.checklistComplete).toBe(false);
    expect(res.body.alternatives.length).toBeGreaterThan(0);
    expect(res.body.alternatives[0].material).toBe('colorbond');
    expect(res.body.alternatives[0].heightKey).toBe('1.8m');
    expect(res.body.options.some((o: { value: string }) => o.value === 'alt:colorbond:1.8m')).toBe(true);

    // Tapping the alternative resolves both fields in one turn.
    const picked = await chatTurn('alt:colorbond:1.8m', 's3', BERWICK, res.body.checklist);
    expect(picked.body.checklist.material).toBe('colorbond');
    expect(picked.body.checklist.heightKey).toBe('1.8m');
  });

  it('reports honestly when nobody beats an existing quote, rather than showing the best available anyway', async () => {
    seedBusiness('biz-3', 'Southeast Fencing & Gates');

    const finished: Checklist = {
      suburb: 'Berwick, VIC 3806',
      material: 'colorbond',
      heightKey: '1.8m',
      lengthMeters: 30,
      removal: 'none',
      conditions: [],
      gateType: 'none',
      gateQty: null,
      existingPrice: 1000, // far cheaper than the $3300 this business would charge
      _ui: { turn: 9, cursor: {}, lastAsked: null, lastQuestion: '', lastValues: [], lastType: 'confirmation', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null },
    };

    const res = await chatTurn('yes', 's4', BERWICK, finished);

    expect(res.body.type).toBe('result');
    expect(res.body.results).toHaveLength(0);
    expect(res.body.noMatchReason).toBe('notCheaper');
    expect(res.body.message).toContain('already a good one');
  });

  it('asks for the suburb once, even when the client stops sending `place`', async () => {
    // The loop this fixes: `isMissing('suburb')` tests the geocoded place object, not the display
    // string, so a client that sent `place` on the picker turn and not afterwards had the suburb
    // question come straight back. It is now carried in `_ui` with the rest of the state.
    seedBusiness('biz-6', 'Southeast Fencing & Gates');

    let res = await chatTurn('I need a fence quote', 's6', null, null);
    res = await chatTurn('yes', 's6', null, res.body.checklist);
    expect(res.body.expects).toBe('suburb');

    // `place` sent once, on the turn the picker answered.
    res = await chatTurn('Berwick', 's6', BERWICK, res.body.checklist);
    expect(res.body.checklist.suburb).toContain('Berwick');

    // ...and never again. Three more turns with no `place` at all.
    for (const message of ['colorbond', '1.8m', '30']) {
      res = await chatTurn(message, 's6', null, res.body.checklist);
      expect(res.body.checklist.suburb).toContain('Berwick');
      expect(res.body.expects).toBeUndefined(); // never re-asked
    }
    expect(res.body.checklist.material).toBe('colorbond');
    expect(res.body.checklist.lengthMeters).toBe(30);
  });

  it('builds its questions and options from the published schema, not from compiled constants', async () => {
    // The whole point of reading `schema/{trade}` at runtime: a business-side vocabulary change
    // must reach a customer's screen with no redeploy. Publishing a schema whose materials and
    // question wording exist nowhere in this codebase proves the chat really reads it.
    clearSchemaCache();
    setRepository(
      Object.assign(repo, {
        async getTradeSchema() {
          return {
            core: { materials: ['space_fence', 'lava_fence'], gateTypes: ['pedestrian_single'], conditions: ['sloped'], removes: ['timber', 'any'] },
            labels: { materials: { space_fence: 'Space fence', lava_fence: 'Lava fence' } },
            questions: { material: 'Which kind of fence, then?' },
            extras: {},
          };
        },
      }),
    );

    const res = await chatTurn('material please', 's7', BERWICK, {
      suburb: 'Berwick, VIC 3806',
      material: null, heightKey: null, lengthMeters: null, removal: null,
      conditions: null, gateType: null, gateQty: null, existingPrice: null,
      _ui: { turn: 3, cursor: {}, lastAsked: 'material', lastQuestion: 'x', lastValues: [], lastType: 'question', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null, place: BERWICK } satisfies UiState,
    } satisfies Checklist);

    // The schema's own wording, whatever prefix the turn adds ("Sorry, I didn't catch that — ").
    expect(res.body.message.toLowerCase()).toContain('which kind of fence, then?');
    const values = res.body.options.map((o: { value: string }) => o.value);
    expect(values).toContain('space_fence'); // schema's materials
    expect(values).toContain('lava_fence');
    expect(values).not.toContain('colorbond'); // compiled vocabulary is NOT being used
    const labels = res.body.options.map((o: { label: string }) => o.label);
    expect(labels).toContain('Space fence'); // schema's labels

    clearSchemaCache();
  });

  it('remembers a suburb nobody covers and stops offering it back', async () => {
    // No business seeded at all - nobody covers anywhere.
    const finished: Checklist = {
      suburb: 'Nowhereville',
      material: 'colorbond',
      heightKey: '1.8m',
      lengthMeters: 30,
      removal: 'none',
      conditions: [],
      gateType: 'none',
      gateQty: null,
      existingPrice: null,
      _ui: { turn: 9, cursor: {}, lastAsked: null, lastQuestion: '', lastValues: [], lastType: 'confirmation', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null },
    };
    const place = { latitude: -37.0, longitude: 144.0, suburb: 'Nowhereville', displayLabel: 'Nowhereville' };

    const res = await chatTurn('yes', 's5', place, finished);
    expect(res.body.checklist.suburb).toBeNull(); // put back to missing, not left as a dead answer
    expect(res.body.checklist._ui.rejectedPlaces.length).toBeGreaterThan(0);

    // The client re-sends the same place next turn (it still has it) - it must not count as
    // a real answer again, or the conversation loops forever on the same failed suburb.
    const again = await chatTurn('Nowhereville', 's5', place, res.body.checklist);
    expect(again.body.checklist.suburb).toBeNull();
  });
});

describe('the finished quote is written where the frontend can listen for it', () => {
  const finished = (overrides: Partial<Checklist> = {}): Checklist => ({
    suburb: 'Berwick, VIC 3806',
    material: 'colorbond',
    heightKey: '1.8m',
    lengthMeters: 20,
    removal: 'none',
    conditions: [],
    gateType: 'none',
    gateQty: null,
    existingPrice: null,
    _ui: { turn: 9, cursor: {}, lastAsked: null, lastQuestion: '', lastValues: [], lastType: 'confirmation', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null, place: BERWICK },
    ...overrides,
  });

  it('writes a result turn, under an id nobody could guess', async () => {
    seedBusiness('biz-r1', 'Southeast Fencing & Gates');
    const res = await chatTurn('yes', 'sr1', BERWICK, finished());

    expect(res.body.type).toBe('result');
    expect(res.body.resultId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    const saved = await repo.getQuoteResult(res.body.resultId);
    expect(saved?.displayState).toBe('ready');
    expect(saved?.results).toHaveLength(1);
    expect(saved?.comparison).not.toBeNull();
    expect(saved?.checklist.material).toBe('colorbond');
    // Session mechanics are not part of a quote.
    expect(saved?.checklist._ui).toBeUndefined();
  });

  it('writes a result with nothing in it, because that is still what the customer must see', async () => {
    seedBusiness('biz-r2', 'Southeast Fencing & Gates');
    // 20m at $110 is $2,200, so nothing here beats a quote they already hold at $1,000. That is a
    // finished answer with an empty results list, and the page has to render it.
    const res = await chatTurn('yes', 'sr2', BERWICK, finished({ existingPrice: 1000 }));

    expect(res.body.type).toBe('result');
    expect(res.body.noMatchReason).toBe('notCheaper');

    const saved = await repo.getQuoteResult(res.body.resultId);
    expect(saved?.results).toEqual([]);
    expect(saved?.noMatchReason).toBe('notCheaper');
    expect(saved?.intent).toBe('compare_quote');
  });

  it('writes nothing on a turn that is still asking', async () => {
    seedBusiness('biz-r3', 'Southeast Fencing & Gates');
    const res = await chatTurn('I need a fence', 'sr3', null, null);

    expect(res.body.type).not.toBe('result');
    expect(res.body.resultId).toBeUndefined();
  });
});
