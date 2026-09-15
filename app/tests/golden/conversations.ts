import { MockAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { SAID_NOTHING } from '../../src/client/agent.js';
import { runChat } from '../../src/client/controller.js';
import type { ChatResponse, Checklist, Place, TurnExtraction } from '../../src/client/schemas.js';
import { MemoryRepository, type CapabilitiesDoc, type PricingDoc } from '../../src/store.js';

/**
 * The golden conversations: the behaviour this codebase has today, captured turn by turn so that a
 * refactor which changes any of it cannot pass unnoticed.
 *
 * Each conversation exists for a named guard, not for coverage. Every guard listed in `why` traces
 * to a real fault the comments in `mergeAndDecide.ts` and `formatResult.ts` describe - a field
 * skipped, a field asked twice, a suburb that loops forever, a value the model volunteered for a
 * question nobody asked. Those are the things a spec-driven rewrite can drop silently, so those are
 * what is pinned here.
 *
 * The pipeline is deterministic: `MockAiClient` is a pure function of its input and `tests/setup.ts`
 * pins `AI_PROVIDER=mock` and `STORE=memory`. Three conversations still need `scriptedAi`, because
 * the mock deliberately cannot produce what they test - see its definition below.
 */

// --- places -------------------------------------------------------------------------------------

export const BERWICK: Place = {
  latitude: -38.0362, longitude: 145.3478,
  suburb: 'Berwick', state: 'VIC', postcode: '3806', displayLabel: 'Berwick, VIC 3806',
};

/** ~12 km from Berwick: far enough to sit outside a 5 km radius, close enough to be offered back. */
export const PAKENHAM = { latitude: -38.07, longitude: 145.485, suburb: 'Pakenham', state: 'VIC', postcode: '3810' };

// --- seeding ------------------------------------------------------------------------------------

export function seedBusiness(
  repo: MemoryRepository,
  uid: string,
  businessName: string,
  pricingOverrides: Partial<PricingDoc> = {},
  capabilitiesOverrides: Partial<CapabilitiesDoc> = {},
): void {
  // Fixed, not `new Date()`: a timestamp that moves would put a diff in every snapshot on every run.
  const now = '2026-01-01T00:00:00.000Z';

  repo.addCandidate({
    uid,
    businessName,
    servicesProvided: ['fencing'],
    rating: 4.8,
    reviewCount: 120,
    isAutoAcceptEnabled: false,
    isAiAutoAcceptEnabled: true,
  });

  repo.savePricing(uid, {
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
  } as PricingDoc);

  repo.saveCapabilities(uid, {
    trade: 'fencing',
    schemaVersion: 1,
    updatedAt: now,
    businessName,
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
  } as CapabilitiesDoc);
}

// --- the scripted model -------------------------------------------------------------------------

/**
 * An `AiClient` that answers chosen messages with a chosen extraction, and hands everything else to
 * the ordinary `MockAiClient`.
 *
 * Needed because `MockAiClient.turn()` (`src/ai.ts:525`) can only ever fill the ONE field that was
 * last asked, and hardcodes `offTopic: false` with a comment saying judging a subject is the real
 * model's job. Three of the guards below are specifically about what happens when the model returns
 * something nobody asked for, so for those the mock cannot produce the input under test.
 *
 * Keyed by the customer's message rather than by call count, because a tapped option skips the model
 * entirely (`controller.ts:68`) and a counter would silently fall out of step.
 */
export function scriptedAi(reply: (message: string) => Partial<TurnExtraction> | null): AiClient {
  const fallback = new MockAiClient();

  return {
    model: 'scripted',
    async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
      const message = (call.user.split('\n\n')[0] ?? '').trim();
      const scripted = reply(message);
      if (!scripted) return fallback.callStructured(call);

      const data = {
        ...SAID_NOTHING,
        ...scripted,
        checklist: { ...SAID_NOTHING.checklist, ...(scripted.checklist ?? {}) },
      };
      return {
        data: call.schema.parse(data),
        usage: { name: call.name, ms: 0, tokensIn: 0, tokensOut: 0, retries: 0, costUsd: 0 },
      };
    },
  };
}

// --- the harness --------------------------------------------------------------------------------

export interface Turn {
  say: string;
  /**
   * The geocoded place the client's picker returned on this turn. Sticky afterwards, because the
   * real client holds it as its own selection state and sends it on every subsequent call - see the
   * comment in `tests/integration/client-chat.test.ts`.
   */
  place?: Place;
}

export interface Conversation {
  name: string;
  /** The guard this conversation exists to protect. */
  why: string;
  seed: (repo: MemoryRepository) => void;
  turns: Turn[];
  ai?: AiClient;
  /** Omitted means fencing, so every conversation written before there was a second trade is unchanged. */
  trade?: 'fencing' | 'tiling' | 'kitchen' | 'retaining_wall' | 'decking' | 'home_renovation';
}

/**
 * Drives a whole conversation exactly as the client does: each response's `checklist` - `_ui`
 * included - goes straight back in as the next turn's `knownChecklist`.
 */
export async function runScript(conversation: Conversation, repo: MemoryRepository): Promise<string> {
  conversation.seed(repo);

  const lines: string[] = [`# ${conversation.name}`, '', `Guards: ${conversation.why}`, ''];
  let checklist: Checklist | null = null;
  let place: Place | null = null;

  for (const [index, turn] of conversation.turns.entries()) {
    if (turn.place) place = turn.place;

    const response: ChatResponse = await runChat(
      {
        ...(conversation.trade ? { trade: conversation.trade } : {}),
        message: turn.say,
        sessionId: 'golden',
        place: place ? JSON.stringify(place) : '',
        knownChecklist: checklist ? JSON.stringify(checklist) : '',
      },
      [],
      { repo, ...(conversation.ai ? { ai: conversation.ai } : {}) },
    );

    checklist = response.checklist;
    /* The response tells the client where the customer now is, and the client sends that back next
       turn - `input.place ?? ui.place` in mergeAndDecide means a stale place in the request WINS
       over the one the server settled on. Echoing the last picked place instead put a customer who
       had just moved to a covered suburb straight back on the rejected one, and reopened the suburb
       question they had already answered. */
    place = response.place ?? null;
    lines.push(`## turn ${index + 1}`, '', `customer: ${JSON.stringify(turn.say)}`, ...(turn.place ? [`picked place: ${turn.place.displayLabel ?? turn.place.suburb}`] : []), '', '```json', JSON.stringify(response, null, 2), '```', '');
  }

  return lines.join('\n');
}

// --- the conversations --------------------------------------------------------------------------

const openTheChat: Turn[] = [{ say: 'I need a fence quote' }, { say: 'yes go ahead' }];

export const CONVERSATIONS: Conversation[] = [
  {
    name: '01 happy path, every answer tapped',
    why: 'the zero-LLM tapped path, field order, and a priced result end to end',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },  // on screen: page 1 of materials
      { say: '1.8m' },       // on screen: page 1 of heights
      { say: '20' },         // on screen: page 1 of lengths
      { say: 'none' },       // pinned: nothing to remove
      { say: 'none' },       // pinned: nothing tricky
      { say: 'none' },       // pinned: no gates -> gate quantity must be skipped
      { say: 'yes' },
    ],
  },

  {
    name: '02 happy path, every answer free text',
    why: 'the model path, oneOf/heightKeyFrom/conditionsFrom resolution, and mentioned()',
    seed: (repo) =>
      seedBusiness(repo, 'biz-2', 'Aluminium Specialists', {
        enabledMaterials: ['aluminium'],
        rates: { aluminium: { '1.8m': 130 } },
        removals: [{ removes: 'timber', pricePerMetre: 25 }],
        gates: [{ gateType: 'pedestrian_single', material: null, price: 600, isFromPrice: false }],
      }),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'aluminium' },              // page 2 - not on screen, so the model reads it
      { say: '1800mm' },                 // heightKeyFrom normalises to 1.8m
      { say: '30 metres' },
      { say: 'old timber fence' },       // word-overlap scoring, not an exact slug
      { say: 'nothing tricky' },         // an explicit empty answer, not "unanswered"
      { say: 'a single pedestrian gate' },
      { say: '2 gates' },
      { say: 'yes please' },
    ],
  },

  {
    name: '03 one sentence naming several things',
    why: 'multi-field fill in a single turn, and that a volunteered negative is still refused',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    ai: scriptedAi((message) =>
      message.startsWith('30m colorbond')
        ? { checklist: { material: 'colorbond', lengthMeters: 30, removal: 'none' } }
        : null,
    ),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      // Material and length land together. `removal: "none"` does NOT, because a negative only ever
      // answers the question actually on screen - mergeAndDecide.ts:272-281.
      { say: '30m colorbond fence, none to remove' },
      { say: '1.8m' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '04 asking for more options until they run out',
    why: 'cursor paging and the exhausted wrap-around',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'something else' }, // page 2
      { say: 'something else' }, // page 3
      { say: 'something else' }, // wraps, and says so
    ],
  },

  {
    name: '05 recap, no, correct the height, recap again',
    why: 'saidNo, fixing mode, and clearFields emptying exactly one field',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },
      { say: '1.2m' },
      { say: '20' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'no' },                    // recap is wrong
      { say: 'the height is wrong' },   // names the field -> reopened
      { say: '1.8m' },
      { say: 'yes' },
    ],
  },

  {
    name: '06 correcting with something that resolves to nothing, then a typo that does',
    why: 'fixingUnresolved, and the FIELD_ALIASES typo tolerance that fixed "lenght"',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },
      { say: '1.8m' },
      { say: '20' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'no' },
      { say: 'the blue one' },  // names no field and changes nothing -> must not hand back the recap
      { say: 'lenght' },        // one transposition away from "length" -> must reopen it
      { say: '30' },
      { say: 'yes' },
    ],
  },

  {
    name: '07 nobody covers this suburb, so covered ones are offered',
    why: 'rejectedPlaces, nearbyPlaces, and that the same place cannot fail forever',
    seed: (repo) =>
      seedBusiness(repo, 'biz-3', 'Pakenham Fencing', {
        serviceArea: {
          baseLocation: 'Pakenham',
          resolved: { ...PAKENHAM, lat: PAKENHAM.latitude, lng: PAKENHAM.longitude, source: 'google' },
          radiusKm: 5, // Berwick is ~12 km away, so it falls outside
          excludedAreas: [],
        },
      }),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },
      { say: '1.8m' },
      { say: '20' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },        // matcher runs, nobody reaches Berwick, Pakenham is offered back
      { say: 'Pakenham' },   // tapped from the offer - coordinates came back with it
      { say: 'yes' },
    ],
  },

  {
    name: '08 a real gate, so the quantity IS asked',
    why: 'the dependsOn rule in the direction that breaks loudly if it is inverted',
    seed: (repo) =>
      seedBusiness(repo, 'biz-4', 'Gates Included', {
        gates: [{ gateType: 'pedestrian_single', material: null, price: 600, isFromPrice: false }],
      }),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },
      { say: '1.8m' },
      { say: '20' },
      { say: 'none' },
      { say: 'none' },
      { say: 'pedestrian_single' }, // on screen -> gate quantity must now be asked
      { say: '2' },
      { say: 'yes' },
    ],
  },

  {
    name: '09 the model volunteers "no gates" while site conditions were asked',
    why: 'isNegative() - a negative answers only the question on screen',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    ai: scriptedAi((message) =>
      message === 'none of that' ? { checklist: { conditions: [], gateType: 'none' } } : null,
    ),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },
      { say: '1.8m' },
      { say: '20' },
      { say: 'none' },
      /* The message has to carry the word "none" for this to be the real test. `mentioned()` looks
         for the value's own words in what the customer wrote, so "nothing tricky" blocks a
         volunteered `gateType: "none"` on its own and isNegative never runs - the guard would look
         covered while being untested. It cannot be a bare "none" either, because that is on screen
         and would take the tapped path without consulting the model at all. */
      { say: 'none of that' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '10 an off-topic message mid-conversation',
    why: 'offTopic answers once and does not advance or derail the brief',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    /* The reply to the off-topic turn carries no options, so the turn after it has no field "on
       screen" - and `MockAiClient` can only ever fill the field that was last asked. A real model
       reads the message against the "Already established" block (`agent.ts:121`) and answers
       normally, which is what the second entry scripts. Without it this conversation would pin the
       mock's limitation as though it were the product's behaviour. */
    ai: scriptedAi((message) =>
      message === 'I want GTA 6' ? { offTopic: true }
      : message === 'colorbond' ? { checklist: { material: 'colorbond' } }
      : null,
    ),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'I want GTA 6' }, // nothing recorded, no question advanced
      { say: 'colorbond' },    // the conversation carries on exactly where it was
      { say: '1.8m' },
      { say: '20' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '11 they already hold a quote, and nothing beats it',
    why: 'intent, the beating filter, and the honest notCheaper answer',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    ai: scriptedAi((message) =>
      message.includes('$2,000') ? { checklist: { existingPrice: 2000 } } : null,
    ),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },
      { say: '1.8m' },
      { say: '20' }, // 20m x $110 = $2,200, which does not beat what they hold
      { say: 'none' },
      { say: 'none' },
      { say: "none, and I've been quoted $2,000 already" },
      { say: 'yes' },
    ],
  },

  {
    name: '14 changing the suburb after answering everything',
    why: 'clearing the place, and that the response says so rather than leaving a stale one standing',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },
      { say: '1.8m' },
      { say: '20' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'no' },
      // The one thing allowed to empty a field. Emptying `suburb` alone would be undone on the next
      // turn - the display string is re-derived from the confirmed place - so the PLACE is dropped,
      // and `response.place` has to say so or a client echoing its own copy puts it straight back.
      { say: 'I want to change the suburb' },
    ],
  },

  {
    name: '13 a height nobody builds at',
    why: 'an off-list measure is refused rather than silently rounded to the nearest one',
    seed: (repo) => seedBusiness(repo, 'biz-1', 'Southeast Fencing & Gates'),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'colorbond' },
      // 1.65m is a real number and not a height anyone builds. Snapping it to 1.8m would be a
      // different fence at a different price, so it is handed back rather than rounded.
      { say: '1.65m' },
      { say: '1.8m' },
      { say: '20' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '12 nobody can quote the brief, so alternatives are offered',
    why: 'the alternatives fallback and the alt: prefix resolving two fields at once',
    seed: (repo) => seedBusiness(repo, 'biz-5', 'Only Does Colorbond'),
    turns: [
      ...openTheChat,
      { say: 'Berwick', place: BERWICK },
      { say: 'aluminium' }, // nobody publishes a rate for it
      { say: '1.8m' },
      { say: '20' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
      { say: 'alt:colorbond:1.8m' }, // one tap moves material and height together
    ],
  },
];

// --- tiling -------------------------------------------------------------------------------------

/**
 * One tiler covering Berwick from Pakenham, priced both ways: per square metre for a plain floor,
 * one fixed price for a bathroom. That mix is the whole reason tiling is a second trade rather than
 * a second vocabulary, so every conversation below is driven against a business that has both.
 */
export function seedTiler(
  repo: MemoryRepository,
  uid: string,
  businessName: string,
  pricingOverrides: Record<string, unknown> = {},
): void {
  const now = '2026-01-01T00:00:00.000Z';

  repo.addCandidate({
    uid,
    businessName,
    servicesProvided: ['tiling'],
    rating: 4.9,
    reviewCount: 80,
    isAutoAcceptEnabled: false,
    isAiAutoAcceptEnabled: true,
  });

  repo.savePricing(uid, {
    trade: 'tiling',
    status: 'confirmed',
    schemaVersion: 2,
    updatedAt: now,
    confirmedAt: now,
    ratesSaved: 4,
    gstIncluded: true,
    supplyModels: ['supply_and_install', 'labour_only'],
    enabledJobTypes: ['floor_only', 'bathroom'],
    rates: {
      floor_only: [
        { tileType: null, price: 65, unit: 'per_sqm' },
        { tileType: 'porcelain', price: 72, unit: 'per_sqm' },
      ],
      bathroom: [{ tileType: null, price: 4850, unit: 'per_job' }],
    },
    tileSupply: [{ label: 'Urban Grey Porcelain 600x600', tileType: 'porcelain', pricePerSqm: 45 }],
    prep: [],
    removals: [{ removes: 'ceramic', pricePerSqm: 45 }],
    waterproofing: [{ area: 'bathroom', price: 950 }],
    siteConditions: [{ condition: 'second_storey', extraPerSqm: null, extraPercent: 10 }],
    serviceArea: {
      baseLocation: 'Pakenham',
      resolved: { suburb: 'Pakenham', state: 'VIC', postcode: '3810', lat: PAKENHAM.latitude, lng: PAKENHAM.longitude, source: 'google' },
      radiusKm: 25,
      excludedAreas: [],
    },
    minimumCharge: 350,
    callOutFee: null,
    travelFee: null,
    ...pricingOverrides,
  } as unknown as PricingDoc);

  repo.saveCapabilities(uid, {
    trade: 'tiling',
    businessName,
    warranty: { text: 'Workmanship warranty as per contract' },
    tags: [],
    extras: [],
    inclusions: [],
    exclusions: [],
    otherOfferings: [],
    couldNotUse: [],
    schemaVersion: 2,
    updatedAt: now,
  } as unknown as CapabilitiesDoc);
}

// --- kitchen ------------------------------------------------------------------------------------

/**
 * Beky Kitchens, from `SOPS/kitchen.pdf` - a real submission's real figures, so a wrong total here
 * is a wrong total a customer would actually have been shown.
 *
 * This business is why kitchen is a third trade rather than a third vocabulary. It sells no unit at
 * all: the installation is one price by SIZE, and the eight itemised lines around it are most of
 * the money. A per-cabinet row is in here too, priced and stored and deliberately unreachable from
 * a quote - the conversation never asks for a cabinet count, so nothing can multiply by one.
 */
export function seedKitchenFitter(
  repo: MemoryRepository,
  uid: string,
  businessName: string,
  pricingOverrides: Record<string, unknown> = {},
): void {
  const now = '2026-01-01T00:00:00.000Z';

  repo.addCandidate({
    uid,
    businessName,
    servicesProvided: ['kitchen'],
    rating: 4.7,
    reviewCount: 64,
    isAutoAcceptEnabled: false,
    isAiAutoAcceptEnabled: true,
  });

  repo.savePricing(uid, {
    trade: 'kitchen',
    status: 'confirmed',
    schemaVersion: 1,
    updatedAt: now,
    confirmedAt: now,
    ratesSaved: 4,
    gstIncluded: true,
    supplyModels: ['supply_and_install', 'labour_only'],
    enabledKitchenSizes: ['small', 'standard', 'large'],
    rates: {
      /* Filed under `general`, which is the common case: one installation price list covering a
         new kitchen, a replacement and an install-only job alike. The per-item row is real and is
         never quotable - see the note above. */
      general: [
        { size: 'small', label: null, price: 1950, unit: 'per_job' },
        { size: 'standard', label: null, price: 2850, unit: 'per_job' },
        { size: 'large', label: null, price: 4250, unit: 'per_job' },
        { size: null, label: 'Base cabinet installation', price: 180, unit: 'per_item' },
      ],
    },
    cabinetSupply: [{ label: 'Standard Custom Kitchen Cabinet Package', price: 8950, unit: 'per_job' }],
    benchtops: [
      { material: 'laminate', price: 850 },
      { material: 'timber', price: 1150 },
      { material: 'stone', price: 1250 },
    ],
    removals: [
      { removes: 'full_demolition', price: 1650 },
      { removes: 'cabinets_only', price: 950 },
      { removes: 'benchtop_only', price: 380 },
    ],
    prep: [{ type: 'wall_prep', price: 350, unit: 'per_job' }],
    extras: [
      { type: 'island', label: 'Standard island installation', price: 650, unit: 'per_item', isFromPrice: false },
      { type: 'pantry', label: 'Pantry cabinet installation', price: 420, unit: 'per_item', isFromPrice: false },
      { type: 'splashback_prep', label: 'Splashback preparation', price: 480, unit: 'per_job', isFromPrice: false },
      { type: 'sink', label: 'Sink installation', price: 320, unit: 'per_item', isFromPrice: false },
      { type: null, label: 'Cabinet handle installation', price: 35, unit: 'per_item', isFromPrice: false },
    ],
    serviceArea: {
      baseLocation: 'Pakenham',
      resolved: { suburb: 'Pakenham', state: 'VIC', postcode: '3810', lat: PAKENHAM.latitude, lng: PAKENHAM.longitude, source: 'google' },
      radiusKm: 30,
      excludedAreas: [],
    },
    minimumCharge: 450,
    siteMeasureFee: 120,
    travelFee: 85,
    ...pricingOverrides,
  } as unknown as PricingDoc);

  repo.saveCapabilities(uid, {
    trade: 'kitchen',
    businessName,
    warranty: { text: 'Workmanship warranty as per contract' },
    tags: [],
    inclusions: [],
    exclusions: [],
    otherOfferings: [],
    couldNotUse: [],
    schemaVersion: 1,
    updatedAt: now,
  } as unknown as CapabilitiesDoc);
}

const openKitchen: Turn[] = [{ say: 'I need a kitchen quote' }, { say: 'yes go ahead' }];

export const KITCHEN_CONVERSATIONS: Conversation[] = [
  {
    name: '30 kitchen, install only, the customer buys the cabinets',
    why: 'the third trade end to end: no quantity question at all, size as the rate key, and a total built from one job price plus fixed items',
    trade: 'kitchen',
    seed: (repo) => seedKitchenFitter(repo, 'kitchen-1', 'Beky Kitchens'),
    turns: [
      ...openKitchen,
      { say: 'Berwick', place: BERWICK },
      { say: 'install_only' },
      { say: 'standard' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '31 kitchen, supply and install, so the cabinetry is in the price',
    why: 'the labour/material split, which is the whole reason this trade copies tiling: the same job with the cabinetry package on top, and $8,950 is the difference',
    trade: 'kitchen',
    seed: (repo) => seedKitchenFitter(repo, 'kitchen-1', 'Beky Kitchens'),
    turns: [
      ...openKitchen,
      { say: 'Berwick', place: BERWICK },
      { say: 'replacement' },
      { say: 'standard' },
      { say: 'supply_and_install' },
      { say: 'stone' },
      { say: 'full_demolition' },
      { say: 'island' },
      { say: 'yes' },
    ],
  },

  {
    name: '32 kitchen, nobody prices a kitchen that size',
    why: "the alternatives fallback on the one trade that used to have none - this fitter publishes small and the customer asked for large, and the answer is Beky Kitchens' own $2,070 rather than a sentence telling them to guess a different size. Also the bucket name staying off the screen: the rate is filed under `general`, which is storage and not a word anybody chose, so the offer reads \"Small - a galley or one run\" and not \"general for Small\"",
    trade: 'kitchen',
    seed: (repo) =>
      seedKitchenFitter(repo, 'kitchen-1', 'Beky Kitchens', {
        enabledKitchenSizes: ['small'],
        rates: { general: [{ size: 'small', label: null, price: 1950, unit: 'per_job' }] },
      }),
    turns: [
      ...openKitchen,
      { say: 'Berwick', place: BERWICK },
      { say: 'new_kitchen' },
      { say: 'large' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '33 kitchen, correcting the size from the recap',
    why: 'a correction re-asks one field and keeps the rest, on a trade whose corrected field is the one the price is found by',
    trade: 'kitchen',
    seed: (repo) => seedKitchenFitter(repo, 'kitchen-1', 'Beky Kitchens'),
    turns: [
      ...openKitchen,
      { say: 'Berwick', place: BERWICK },
      { say: 'replacement' },
      { say: 'small' },
      { say: 'labour_only' },
      { say: 'laminate' },
      { say: 'cabinets_only' },
      { say: 'none' },
      { say: 'no' },
      { say: 'the size is wrong' },
      { say: 'large' },
      { say: 'yes' },
    ],
  },
];

/**
 * Berwick Retaining Wall, as the business pipeline would have stored it.
 *
 * The two rate buckets are the point and are worth reading side by side: the same four wall systems
 * appear under both supply models at very different prices, which is what makes `supply` a rate KEY
 * in this trade rather than the add-on branch it is in tiling and kitchen.
 *
 * Every `heightBand` is null, which is the common case and NOT a gap in the fixture: builders
 * publish one rate per system covering every height they build. Conversation 43 overrides one
 * bucket with banded rows so the prefer-then-fall-back lookup is exercised too.
 */
export function seedWallBuilder(
  repo: MemoryRepository,
  uid: string,
  businessName: string,
  pricingOverrides: Record<string, unknown> = {},
): void {
  const now = '2026-01-01T00:00:00.000Z';

  repo.addCandidate({
    uid,
    businessName,
    servicesProvided: ['retaining_wall'],
    rating: 4.8,
    reviewCount: 52,
    isAutoAcceptEnabled: false,
    isAiAutoAcceptEnabled: true,
  });

  repo.savePricing(uid, {
    trade: 'retaining_wall',
    status: 'confirmed',
    schemaVersion: 1,
    updatedAt: now,
    confirmedAt: now,
    ratesSaved: 9,
    gstIncluded: true,
    supplyModels: ['supply_and_install', 'labour_only'],
    enabledWallTypes: ['timber_sleeper', 'timber_post', 'concrete_sleeper', 'steel_post', 'premium_timber', 'tiered'],
    rates: {
      labour_only: [
        { wallType: 'timber_sleeper', heightBand: null, pricePerMetre: 145 },
        { wallType: 'timber_post', heightBand: null, pricePerMetre: 155 },
        { wallType: 'concrete_sleeper', heightBand: null, pricePerMetre: 185 },
        { wallType: 'steel_post', heightBand: null, pricePerMetre: 195 },
      ],
      supply_and_install: [
        { wallType: 'timber_sleeper', heightBand: null, pricePerMetre: 285 },
        { wallType: 'premium_timber', heightBand: null, pricePerMetre: 325 },
        { wallType: 'concrete_sleeper', heightBand: null, pricePerMetre: 395 },
        { wallType: 'steel_post', heightBand: null, pricePerMetre: 425 },
        { wallType: 'tiered', heightBand: null, pricePerMetre: 450 },
      ],
    },
    drainage: [
      { type: 'full_package', price: 650, unit: 'per_job' },
      { type: 'ag_pipe', price: 55, unit: 'per_metre' },
      { type: 'drainage_gravel', price: 85, unit: 'per_metre' },
      { type: 'geotextile_fabric', price: 35, unit: 'per_metre' },
      { type: 'drainage_outlet', price: 180, unit: 'per_item' },
    ],
    removals: [
      { removes: 'timber_wall', price: 85, unit: 'per_metre' },
      { removes: 'concrete_sleeper_wall', price: 125, unit: 'per_metre' },
      { removes: 'steel_post', price: 95, unit: 'per_item' },
    ],
    /* Stored and shown, never quotable: the customer cannot supply hours or a post count, so none
       of these reaches `quoteTotal`. They are here so the seed is the real shape rather than a
       tidied one. */
    groundworks: [
      { type: 'excavation', price: 95, unit: 'per_hour' },
      { type: 'post_holes', price: 75, unit: 'per_item' },
      { type: 'footings', price: 95, unit: 'per_item' },
      { type: 'site_cleanup', price: 250, unit: 'per_job' },
    ],
    siteConditions: [
      { condition: 'restricted_access', price: 450, percent: null, unit: 'per_job' },
      { condition: 'rock', price: 180, percent: null, unit: 'per_hour' },
    ],
    extras: [
      { type: 'caps', label: 'Timber cap installation', price: 65, unit: 'per_metre', isFromPrice: false },
      { type: 'steps', label: 'Standard retaining wall step', price: 450, unit: 'per_item', isFromPrice: false },
      { type: null, label: 'Fence post interface preparation', price: 180, unit: 'per_item', isFromPrice: false },
    ],
    serviceArea: {
      baseLocation: 'Berwick',
      resolved: { suburb: 'Berwick', state: 'VIC', postcode: '3806', lat: BERWICK.latitude, lng: BERWICK.longitude, source: 'google' },
      radiusKm: 30,
      excludedAreas: [],
    },
    minimumCharge: 650,
    siteInspectionFee: 150,
    travelFee: 95,
    ...pricingOverrides,
  } as unknown as PricingDoc);

  repo.saveCapabilities(uid, {
    trade: 'retaining_wall',
    businessName,
    engineering: {
      text: 'Walls over 1m generally need engineering and a building permit. We arrange it from $850.',
      price: 850,
      isFromPrice: true,
    },
    warranty: { text: 'Ten year workmanship warranty' },
    tags: [],
    inclusions: [],
    exclusions: [],
    otherOfferings: [],
    couldNotUse: [],
    schemaVersion: 1,
    updatedAt: now,
  } as unknown as CapabilitiesDoc);
}

const openWall: Turn[] = [{ say: 'I need a retaining wall quote' }, { say: 'yes go ahead' }];

export const RETAINING_WALL_CONVERSATIONS: Conversation[] = [
  {
    name: '40 retaining wall, installation only, the customer buys the sleepers',
    why: 'the fourth trade end to end: its own questions in its own order, supply asked SECOND because it picks the rate table, and a per-linear-metre total off the cheaper of the two columns',
    trade: 'retaining_wall',
    seed: (repo) => seedWallBuilder(repo, 'wall-1', 'Berwick Retaining Wall'),
    turns: [
      ...openWall,
      { say: 'Berwick', place: BERWICK },
      { say: 'concrete_sleeper' },
      { say: 'labour_only' },
      { say: '20' },
      { say: '0.9m' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '41 retaining wall, supply and install, so the sleepers are in the rate',
    why: 'the same wall under the other supply model - $185 a metre becomes $395 - which is the rate-table swap that makes this trade different from tiling, where the material is added on top instead',
    trade: 'retaining_wall',
    seed: (repo) => seedWallBuilder(repo, 'wall-1', 'Berwick Retaining Wall'),
    turns: [
      ...openWall,
      { say: 'Berwick', place: BERWICK },
      { say: 'concrete_sleeper' },
      { say: 'supply_and_install' },
      { say: '20' },
      { say: '0.9m' },
      { say: 'concrete_sleeper_wall' },
      { say: 'full_package' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '42 retaining wall, nobody builds it under the model they asked for',
    why: 'a builder who installs customer-supplied materials and does not supply them is a different failure from one who does not build that wall at all - and the customer is offered what IS quotable rather than told nobody covers them',
    trade: 'retaining_wall',
    seed: (repo) =>
      seedWallBuilder(repo, 'wall-1', 'Berwick Retaining Wall', {
        supplyModels: ['labour_only'],
        rates: {
          labour_only: [
            { wallType: 'timber_sleeper', heightBand: null, pricePerMetre: 145 },
            { wallType: 'concrete_sleeper', heightBand: null, pricePerMetre: 185 },
          ],
        },
      }),
    turns: [
      ...openWall,
      { say: 'Berwick', place: BERWICK },
      { say: 'concrete_sleeper' },
      { say: 'supply_and_install' },
      { say: '20' },
      { say: '0.9m' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '43 retaining wall, a builder who does band their rates by height',
    why: 'the nullable third key: a row written for this exact height beats the general one, and a height past every band they published falls back to the DEAREST rather than the nearest - nobody may be shown a total below what they will be charged',
    trade: 'retaining_wall',
    seed: (repo) =>
      seedWallBuilder(repo, 'wall-1', 'Berwick Retaining Wall', {
        rates: {
          supply_and_install: [
            { wallType: 'concrete_sleeper', heightBand: '0.6m', pricePerMetre: 340 },
            { wallType: 'concrete_sleeper', heightBand: '0.9m', pricePerMetre: 395 },
            { wallType: 'concrete_sleeper', heightBand: '1.2m', pricePerMetre: 465 },
          ],
        },
      }),
    turns: [
      ...openWall,
      { say: 'Berwick', place: BERWICK },
      { say: 'concrete_sleeper' },
      { say: 'supply_and_install' },
      { say: '20' },
      { say: '1.2m' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '44 retaining wall, correcting the supply model from the recap',
    why: 'a correction re-asks one field and keeps the rest, on the field this trade prices from - and the total has to move by the whole cost of the materials, not by a line item',
    trade: 'retaining_wall',
    seed: (repo) => seedWallBuilder(repo, 'wall-1', 'Berwick Retaining Wall'),
    turns: [
      ...openWall,
      { say: 'Berwick', place: BERWICK },
      { say: 'timber_sleeper' },
      { say: 'supply_and_install' },
      { say: '15' },
      { say: '0.6m' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'no' },
      { say: 'who supplies is wrong' },
      { say: 'labour_only' },
      { say: 'yes' },
    ],
  },
];

/**
 * Berwick Decks, as the business pipeline would have stored it.
 *
 * Read the three price groups together, because they are the point of this trade: the rates are per
 * SQUARE METRE of deck, the balustrade is per LINEAR metre along its edge, and a stair flight is one
 * price each. A quote here multiplies three different quantities, which nothing else in the product
 * does, and conversation 41 is the one that proves it.
 *
 * `high_level` deliberately carries fewer boards than `ground_level`: a builder who does not lay
 * spotted gum a storey up is a normal, publishable price list, and conversation 42 is what happens
 * to a customer who asks for one.
 */
export function seedDeckBuilder(
  repo: MemoryRepository,
  uid: string,
  businessName: string,
  pricingOverrides: Record<string, unknown> = {},
): void {
  const now = '2026-01-01T00:00:00.000Z';

  repo.addCandidate({
    uid,
    businessName,
    servicesProvided: ['decking'],
    rating: 4.9,
    reviewCount: 78,
    isAutoAcceptEnabled: false,
    isAiAutoAcceptEnabled: true,
  });

  repo.savePricing(uid, {
    trade: 'decking',
    status: 'confirmed',
    schemaVersion: 1,
    updatedAt: now,
    confirmedAt: now,
    ratesSaved: 16,
    gstIncluded: true,
    enabledDeckMaterials: ['treated_pine', 'merbau', 'spotted_gum', 'blackbutt', 'composite'],
    enabledDeckHeights: ['ground_level', 'low_level', 'elevated', 'high_level'],
    rates: {
      ground_level: [
        { material: 'treated_pine', pricePerSqm: 280 },
        { material: 'merbau', pricePerSqm: 420 },
        { material: 'spotted_gum', pricePerSqm: 445 },
        { material: 'blackbutt', pricePerSqm: 465 },
        { material: 'composite', pricePerSqm: 520 },
      ],
      low_level: [
        { material: 'treated_pine', pricePerSqm: 310 },
        { material: 'merbau', pricePerSqm: 455 },
        { material: 'composite', pricePerSqm: 560 },
      ],
      elevated: [
        { material: 'treated_pine', pricePerSqm: 390 },
        { material: 'merbau', pricePerSqm: 540 },
        { material: 'composite', pricePerSqm: 650 },
      ],
      high_level: [
        { material: 'treated_pine', pricePerSqm: 470 },
        { material: 'merbau', pricePerSqm: 640 },
      ],
    },
    /* Per LINEAR metre, every one of them. A balustrade stored per_sqm would be charged against the
       deck's floor area, which on a 40m2 deck is three times the railing that exists. */
    balustrades: [
      { type: 'timber', price: 220, unit: 'per_metre' },
      { type: 'aluminium', price: 290, unit: 'per_metre' },
      { type: 'steel', price: 340, unit: 'per_metre' },
      { type: 'wire', price: 380, unit: 'per_metre' },
      { type: 'glass', price: 520, unit: 'per_metre' },
    ],
    /* A flight at one price, and a per-step row that can never be quoted from - this conversation
       deliberately never asks how many steps, because a customer guessing produces a wrong price
       rather than a missing one. It is stored because the builder published it. */
    stairs: [
      { grade: 'timber', label: 'Standard timber flight up to 5 steps', price: 950, unit: 'per_job' },
      { grade: 'hardwood', label: 'Hardwood flight up to 5 steps', price: 1350, unit: 'per_job' },
      { grade: null, label: 'Each additional step above five', price: 140, unit: 'per_item' },
    ],
    screens: [
      { type: 'timber_batten', price: 340, unit: 'per_sqm' },
      { type: 'merbau', price: 420, unit: 'per_sqm' },
    ],
    removals: [
      { removes: 'timber_deck', price: 85, unit: 'per_sqm' },
      { removes: 'composite_deck', price: 95, unit: 'per_sqm' },
    ],
    siteConditions: [
      { condition: 'restricted_access', price: 450, percent: null, unit: 'per_job' },
      /* Charged by the hour, so it can never reach a total: nobody knows how many hours of rock
         there are until the ground is open. Stored, shown, and named as not included. */
      { condition: 'rock', price: 180, percent: null, unit: 'per_hour' },
    ],
    extras: [
      { type: 'skirting', label: 'Deck skirting', price: 180, unit: 'per_metre', isFromPrice: false },
      { type: 'oiling', label: 'Deck oiling', price: 38, unit: 'per_sqm', isFromPrice: false },
    ],
    serviceArea: {
      baseLocation: 'Berwick',
      resolved: { suburb: 'Berwick', state: 'VIC', postcode: '3806', lat: BERWICK.latitude, lng: BERWICK.longitude, source: 'google' },
      radiusKm: 20,
      excludedAreas: [],
    },
    minimumCharge: 1200,
    siteInspectionFee: 150,
    designFee: null,
    travelFee: 90,
    ...pricingOverrides,
  } as unknown as PricingDoc);

  repo.saveCapabilities(uid, {
    trade: 'decking',
    businessName,
    engineering: {
      text: 'Whether a deck needs a permit depends on the site. We arrange engineering from $890.',
      price: 890,
      isFromPrice: true,
    },
    warranty: { text: 'Ten year workmanship warranty' },
    tags: [],
    inclusions: [],
    exclusions: [],
    otherOfferings: [],
    couldNotUse: [],
    schemaVersion: 1,
    updatedAt: now,
  } as unknown as CapabilitiesDoc);
}

const openDeck: Turn[] = [{ say: 'I need a decking quote' }, { say: 'yes go ahead' }];

export const DECKING_CONVERSATIONS: Conversation[] = [
  {
    name: '50 decking, a plain ground-level deck in treated pine',
    why: 'the fifth trade end to end: height asked FIRST because it decides the build, then the board, and a per-square-metre total with nothing added',
    trade: 'decking',
    seed: (repo) => seedDeckBuilder(repo, 'deck-1', 'Berwick Decks'),
    turns: [
      ...openDeck,
      { say: 'Berwick', place: BERWICK },
      { say: 'ground_level' },
      { say: 'treated_pine' },
      { say: '24' },
      { say: 'freestanding' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '51 decking, an elevated deck with a balustrade and stairs',
    why: 'THE quote this trade exists to get right - three different quantities in one total: 25m2 of deck, 12 LINEAR metres of balustrade along its edge, and one stair flight. A balustrade multiplied by the deck area instead of its length would be out by more than double',
    trade: 'decking',
    seed: (repo) => seedDeckBuilder(repo, 'deck-1', 'Berwick Decks'),
    turns: [
      ...openDeck,
      { say: 'Berwick', place: BERWICK },
      { say: 'elevated' },
      { say: 'merbau' },
      { say: '25' },
      { say: 'attached' },
      { say: 'timber_deck' },
      { say: 'timber' },
      { say: '12' },
      { say: 'timber' },
      { say: '1' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '52 decking, a board nobody lays at that height',
    why: 'the builder lays spotted gum on the ground and not a storey up, which is a normal price list - so the customer is offered what IS quotable rather than told nobody covers them, and the height weighs more than the board in what is offered back',
    trade: 'decking',
    seed: (repo) => seedDeckBuilder(repo, 'deck-1', 'Berwick Decks'),
    turns: [
      ...openDeck,
      { say: 'Berwick', place: BERWICK },
      { say: 'high_level' },
      { say: 'spotted_gum' },
      { say: '30' },
      { say: 'attached' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '53 decking, no balustrade, so its length is never asked',
    why: 'the conditional field: `balustradeLm` hangs off `balustrade` with dependsOn, so saying "no balustrade" must skip the length question entirely rather than asking for the length of something that does not exist',
    trade: 'decking',
    seed: (repo) => seedDeckBuilder(repo, 'deck-1', 'Berwick Decks'),
    turns: [
      ...openDeck,
      { say: 'Berwick', place: BERWICK },
      { say: 'low_level' },
      { say: 'composite' },
      { say: '18' },
      { say: 'freestanding' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '54 decking, correcting the board from the recap',
    why: 'a correction re-asks one field and keeps the rest, on the field that headlines the quote - and the total has to move by the difference between two boards at the same height',
    trade: 'decking',
    seed: (repo) => seedDeckBuilder(repo, 'deck-1', 'Berwick Decks'),
    turns: [
      ...openDeck,
      { say: 'Berwick', place: BERWICK },
      { say: 'ground_level' },
      { say: 'composite' },
      { say: '20' },
      { say: 'freestanding' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'no' },
      { say: 'the decking is wrong' },
      { say: 'merbau' },
      { say: 'yes' },
    ],
  },
];

/**
 * A renovator, and the shape no trade before it has: a CATALOGUE.
 *
 * Every figure here is Berwick Home Renovations' own, from the document this trade was built from.
 * The rate table is rooms at flat prices with no unit on any of them - which is this trade's
 * correct shape and the whole reason rule 2a exists - and the three lists beside it are the work
 * this business also sells and that a customer can never be quoted for: surfaces by the square
 * metre, items each, and labour by the hour.
 *
 * Those three are seeded deliberately. A conversation that never sees them cannot prove they stay
 * out of a total, and staying out of a total is the single thing this trade's pricing module exists
 * to guarantee.
 */
export function seedRenovator(
  repo: MemoryRepository,
  uid: string,
  businessName: string,
  pricingOverrides: Record<string, unknown> = {},
): void {
  const now = '2026-01-01T00:00:00.000Z';

  repo.addCandidate({
    uid,
    businessName,
    servicesProvided: ['home_renovation'],
    rating: 4.8,
    reviewCount: 64,
    isAutoAcceptEnabled: false,
    isAiAutoAcceptEnabled: true,
  });

  repo.savePricing(uid, {
    trade: 'home_renovation',
    status: 'confirmed',
    schemaVersion: 1,
    updatedAt: now,
    confirmedAt: now,
    ratesSaved: 13,
    gstIncluded: true,
    enabledRooms: [
      'bathroom',
      'ensuite',
      'kitchen',
      'laundry',
      'bedroom',
      'living_room',
      'dining_room',
      'home_office',
      'hallway',
      'open_plan',
    ],
    /* Keyed by ROOM, and every price is flat with no unit. `supply` is null on all of them, which
       is this trade's common case rather than a gap: the renovator says once, at the top of their
       list, that the prices are labour and the materials are quoted separately.
       The bathroom, kitchen and laundry carry a SECOND row - the strip-out, as a job in its own
       right. That is one price on the list read two ways, and `pricing/homeRenovation.ts` refuses
       to charge it twice. */
    rates: {
      bathroom: [
        { jobType: 'full_renovation', supply: null, price: 6850, unit: 'per_job' },
        { jobType: 'demolition_only', supply: null, price: 1450, unit: 'per_job' },
      ],
      ensuite: [{ jobType: 'full_renovation', supply: null, price: 5950, unit: 'per_job' }],
      kitchen: [
        { jobType: 'full_renovation', supply: null, price: 4850, unit: 'per_job' },
        { jobType: 'demolition_only', supply: null, price: 1650, unit: 'per_job' },
      ],
      laundry: [
        { jobType: 'full_renovation', supply: null, price: 3850, unit: 'per_job' },
        { jobType: 'demolition_only', supply: null, price: 750, unit: 'per_job' },
      ],
      bedroom: [{ jobType: 'full_renovation', supply: null, price: 2850, unit: 'per_job' }],
      living_room: [{ jobType: 'full_renovation', supply: null, price: 3250, unit: 'per_job' }],
      dining_room: [{ jobType: 'full_renovation', supply: null, price: 2450, unit: 'per_job' }],
      home_office: [{ jobType: 'full_renovation', supply: null, price: 2750, unit: 'per_job' }],
      hallway: [{ jobType: 'full_renovation', supply: null, price: 1850, unit: 'per_job' }],
      open_plan: [{ jobType: 'full_renovation', supply: null, price: 8500, unit: 'per_job' }],
    },
    supplyModels: ['labour_only', 'supply_and_install'],
    materialPackages: [{ label: 'Kitchen cabinetry package', price: 8950, unit: 'per_job' }],
    removals: [
      { removes: 'bathroom_strip', price: 1450 },
      { removes: 'kitchen_strip', price: 1650 },
      { removes: 'laundry_strip', price: 750 },
      { removes: 'small_room', price: 750 },
      { removes: 'full_interior', price: 4250 },
    ],
    extras: [
      { type: 'waterproofing', label: 'Bathroom waterproofing', price: 950, unit: 'per_job', isFromPrice: false },
      /* The four painting lines this trade really publishes, and the reason `single_trade` exists.
         A customer wanting a room painted is buying THIS, not a room renovation - and which of the
         four is used is named in the quote's badges rather than picked silently. */
      { type: 'painting', label: 'Standard room painting', price: 1250, unit: 'per_job', isFromPrice: false },
      { type: 'painting', label: 'Ceiling painting', price: 650, unit: 'per_job', isFromPrice: false },
      { type: 'painting', label: 'Full interior repaint', price: 6500, unit: 'per_job', isFromPrice: false },
      { type: 'flooring', label: 'Floor preparation', price: 650, unit: 'per_job', isFromPrice: false },
      { type: 'benchtop', label: 'Stone benchtop installation', price: 1250, unit: 'per_job', isFromPrice: false },
      { type: 'wardrobe', label: 'Built-in wardrobe installation', price: 1850, unit: 'per_job', isFromPrice: false },
      { type: 'site_protection', label: 'Site protection', price: 350, unit: 'per_job', isFromPrice: false },
      { type: 'waste_disposal', label: 'General renovation waste', price: 550, unit: 'per_job', isFromPrice: false },
      { type: 'project_management', label: 'Project management', price: 3500, unit: 'per_job', isFromPrice: false },
      /* Priced per square metre, so it can never reach a total: this conversation asks for no area,
         and adding 75 would quote the customer one square metre of tiling. Stored, shown, and named
         in a badge as measured on site. The same treatment decking gives rock by the hour. */
      { type: 'tiling', label: 'Floor tiling', price: 75, unit: 'per_sqm', isFromPrice: false },
    ],
    surfaces: [
      { label: 'Standard wall plastering', pricePerSqm: 65 },
      { label: 'Timber flooring', pricePerSqm: 95 },
    ],
    perItem: [
      { label: 'Internal door installation', price: 280 },
      { label: 'Base cabinet installation', price: 180 },
    ],
    /* Charged by the hour, so they can never reach a total: nobody knows how many hours of
       carpentry there are until the walls are open. Stored, shown, and named as not included. */
    hourly: [
      { label: 'General carpentry', price: 95, unit: 'per_hour' },
      { label: 'Finish carpentry', price: 110, unit: 'per_hour' },
    ],
    serviceArea: {
      baseLocation: 'Berwick',
      resolved: { suburb: 'Berwick', state: 'VIC', postcode: '3806', lat: BERWICK.latitude, lng: BERWICK.longitude, source: 'google' },
      radiusKm: 30,
      excludedAreas: [],
    },
    minimumCharge: 450,
    siteInspectionFee: 150,
    consultationFee: 180,
    travelFee: 95,
    ...pricingOverrides,
  } as unknown as PricingDoc);

  repo.saveCapabilities(uid, {
    trade: 'home_renovation',
    businessName,
    warranty: { text: 'Ten year workmanship warranty' },
    tags: [],
    inclusions: [],
    exclusions: [
      'Building permits, engineering and council fees',
      'Electrical, plumbing and gas work',
      'Asbestos removal',
    ],
    otherOfferings: [],
    couldNotUse: [],
    schemaVersion: 1,
    updatedAt: now,
  } as unknown as CapabilitiesDoc);
}

const openReno: Turn[] = [{ say: 'I need a renovation quote' }, { say: 'yes go ahead' }];

export const HOME_RENOVATION_CONVERSATIONS: Conversation[] = [
  {
    name: '60 renovation, a bathroom with the customer buying the materials',
    why: 'the sixth trade end to end: the room asked first because it IS the job, a flat price with no unit anywhere in it, and a total that is the room plus the strip-out and nothing else. The badge must say the customer supplies the materials, because that is the biggest single difference between two renovators quoting the same room',
    trade: 'home_renovation',
    seed: (repo) => seedRenovator(repo, 'reno-1', 'Berwick Home Renovations'),
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bathroom' },
      { say: 'full_renovation' },
      { say: 'labour_only' },
      { say: 'bathroom_strip' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '61 renovation, a kitchen with the renovator supplying everything',
    why: 'THE distinction this trade’s own document calls fundamental. The same room is the labour figure or that plus every material in it, and nothing in the number says which - so the cabinetry package has to enter the total here and must NOT in conversation 60. Two extras priced per job come in with it; the waterproofing does not, because nobody asked for it',
    trade: 'home_renovation',
    seed: (repo) => seedRenovator(repo, 'reno-1', 'Berwick Home Renovations'),
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'kitchen' },
      { say: 'full_renovation' },
      { say: 'supply_and_install' },
      { say: 'kitchen_strip' },
      { say: 'benchtop' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '62 renovation, asking for work that is only sold by the square metre and by the hour',
    why: 'THE quote this trade exists to get right, and the one thing its pricing module is for. Floor tiling is $75 per square metre and carpentry is $95 an hour - both real, both published, both asked for - and neither may enter the total, because this conversation asks for no area and no hours. They must appear as badges saying so instead. A total containing 75 or 95 is this trade’s worst failure: it shows a customer a number far below what they will actually be charged',
    trade: 'home_renovation',
    seed: (repo) => seedRenovator(repo, 'reno-1', 'Berwick Home Renovations'),
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bedroom' },
      { say: 'full_renovation' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'tiling' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '63 renovation, stripping a room out and nothing more',
    why: 'the second job type against a room the renovator also renovates, reached through optionsKeyedBy - and the double-charge guard. "Bathroom demolition $1,450" is ONE price on the list stored as both a demolition_only rate and a removal, so a customer who wants only the strip-out must be charged $1,450 and never $2,900. The strip-out question is not even asked here, because the strip-out IS the job',
    trade: 'home_renovation',
    seed: (repo) => seedRenovator(repo, 'reno-1', 'Berwick Home Renovations'),
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bathroom' },
      { say: 'demolition_only' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '65 renovation, one job and not a room - just the painting',
    why: 'the answer this trade had no word for. A customer typing "i want to colour my room" was given `fit_out_only` - fitting what they had already bought - and the brief said cabinets. Nothing errored; the wrong job went on towards a price. What makes it quotable is that the renovator really does publish "Standard room painting $1,250", so the quote comes from the EXTRA rather than from a room rate. Two things to read in the snapshot: the strip-out question is never asked, because painting a room strips nothing out - and the badge NAMES the line the price came from, because four painting prices are published and picking one silently would be the same fault in a new place',
    trade: 'home_renovation',
    seed: (repo) => seedRenovator(repo, 'reno-1', 'Berwick Home Renovations'),
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bedroom' },
      { say: 'single_trade' },
      { say: 'labour_only' },
      { say: 'painting' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '66 renovation, one job nobody nearby prices',
    why: 'the honest refusal on the same path. This renovator publishes painting and flooring and does not publish plastering, so a customer wanting only plastering cannot be quoted by them - and must NOT be quoted a room renovation instead, which is exactly the silent substitution `single_trade` was added to stop. They are offered what IS priced',
    trade: 'home_renovation',
    seed: (repo) => seedRenovator(repo, 'reno-1', 'Berwick Home Renovations'),
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bedroom' },
      { say: 'single_trade' },
      { say: 'labour_only' },
      { say: 'plastering' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '67 renovation, asking for something nobody has a word for',
    why: 'the dead end a customer cannot see coming. They do not know what we cover, so answering "wallpaper hanging" and being asked the same question again reads as a broken assistant - and it was: the answer was dropped with nothing said. `schemas.ts` has always held that telling somebody "sorry, I didn\'t catch that" is a lie and a dead end, and that the honest place to find out nobody does it is the results screen. That worked for single-choice fields and silently did not for multi-choice ones, which is every extras and conditions question in the product. Their own words are kept under the `other:` marker, carried to the end, and nothing ever reaches a business document',
    trade: 'home_renovation',
    seed: (repo) => seedRenovator(repo, 'reno-1', 'Berwick Home Renovations'),
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bedroom' },
      { say: 'single_trade' },
      { say: 'labour_only' },
      { say: 'wallpaper hanging' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '64 renovation, correcting the room from the recap',
    why: 'a correction re-asks one field and keeps the rest, on the field that headlines the quote and finds the rate. The total has to move by the difference between two rooms - and the job type has to survive, even though its options are keyed off the room that just changed',
    trade: 'home_renovation',
    seed: (repo) => seedRenovator(repo, 'reno-1', 'Berwick Home Renovations'),
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bedroom' },
      { say: 'full_renovation' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'no' },
      { say: 'the room is wrong' },
      { say: 'living_room' },
      { say: 'yes' },
    ],
  },
];

export const TRADE_CHANGE_CONVERSATIONS: Conversation[] = [
  {
    name: '70 changing trade, confirmed - the answers go and the conversation does not',
    why: 'the escape hatch `routeTrade` never had. Its `settled` branch returns the conversation\'s trade without reading the message at all, which is right - re-routing on a stray word would throw away everything answered - but it left a customer who picked the wrong service stuck in it for ever. Two turns, never one: this asks before it clears anything, so a wrong guess costs a turn instead of a filled-in brief. What must survive the clear is `_ui.history`, which lives INSIDE the checklist - throwing it away would make the assistant forget the conversation it is in the middle of',
    trade: 'home_renovation',
    seed: (repo) => {
      seedRenovator(repo, 'reno-1', 'Berwick Home Renovations');
      seedBusiness(repo, 'fence-1', 'Berwick Fencing');
    },
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bathroom' },
      { say: 'full_renovation' },
      // Four answers in. Now they realise they picked the wrong service.
      { say: 'i want fencing' },
      { say: 'trade-change:yes' },
    ],
  },

  {
    name: '71 changing trade, declined - nothing is lost',
    why: 'the half that matters more, because it is what makes the trigger safe to be generous with. A regex over free text is wrong sometimes; saying no must put the customer back exactly where they were, with every answer intact and the question they were on still waiting. If this snapshot ever shows a cleared field, the confirmation step is not doing its job',
    trade: 'home_renovation',
    seed: (repo) => {
      seedRenovator(repo, 'reno-1', 'Berwick Home Renovations');
      seedBusiness(repo, 'fence-1', 'Berwick Fencing');
    },
    turns: [
      ...openReno,
      { say: 'Berwick', place: BERWICK },
      { say: 'bathroom' },
      { say: 'full_renovation' },
      { say: 'i want fencing' },
      { say: 'trade-change:no' },
      // Straight back into the renovation, answering the question that was on screen.
      { say: 'labour_only' },
    ],
  },
];

const openTiling: Turn[] = [{ say: 'I need a tiling quote' }, { say: 'yes go ahead' }];

export const TILING_CONVERSATIONS: Conversation[] = [
  {
    name: '20 tiling, a plain floor priced by the square metre',
    why: 'the second trade end to end: its own questions in its own order, the tile-specific rate beating the general one, and a per-m2 total',
    trade: 'tiling',
    seed: (repo) => seedTiler(repo, 'tile-1', 'Paky Tiles'),
    turns: [
      ...openTiling,
      { say: 'Berwick', place: BERWICK },
      { say: 'floor_only' },
      { say: 'porcelain' },
      { say: '20' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '21 tiling, a bathroom the business sells at one price',
    why: 'a per_job rate is NOT multiplied by the area - the error that would quote a bathroom at forty thousand dollars - while removal and waterproofing still add on top',
    trade: 'tiling',
    seed: (repo) => seedTiler(repo, 'tile-1', 'Paky Tiles'),
    turns: [
      ...openTiling,
      { say: 'Berwick', place: BERWICK },
      { say: 'bathroom' },
      { say: 'porcelain' },
      { say: '8' },
      { say: 'labour_only' },
      { say: 'any' },
      { say: 'bathroom' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '22 tiling, the business supplies the tiles',
    why: 'supply_and_install adds the business own published tile price per m2 - never a figure from a web search',
    trade: 'tiling',
    seed: (repo) => seedTiler(repo, 'tile-1', 'Paky Tiles'),
    turns: [
      ...openTiling,
      { say: 'Berwick', place: BERWICK },
      { say: 'floor_only' },
      { say: 'porcelain' },
      { say: '20' },
      { say: 'supply_and_install' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '23 tiling, a percentage surcharge on an upstairs job',
    why: 'a percent surcharge loads the rate and the per-m2 extras and never a fixed item, the same rule fencing has',
    trade: 'tiling',
    seed: (repo) => seedTiler(repo, 'tile-1', 'Paky Tiles'),
    turns: [
      ...openTiling,
      { say: 'Berwick', place: BERWICK },
      { say: 'floor_only' },
      { say: 'porcelain' },
      { say: '20' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'none' },
      { say: 'second_storey' },
      { say: 'yes' },
    ],
  },

  {
    name: '24 tiling, nobody prices that job',
    why: 'the no-match sentence is tiling own - never "the businesses near you do not offer that fence type"',
    trade: 'tiling',
    seed: (repo) => seedTiler(repo, 'tile-1', 'Paky Tiles'),
    turns: [
      ...openTiling,
      { say: 'Berwick', place: BERWICK },
      { say: 'kitchen_splashback' },
      { say: 'porcelain' },
      { say: '3' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'yes' },
    ],
  },

  {
    name: '25 tiling, correcting the tile from the recap',
    why: 'saying which field is wrong reopens THAT field - the words belong to the field, not to a table keyed on fencing names',
    trade: 'tiling',
    seed: (repo) => seedTiler(repo, 'tile-1', 'Paky Tiles'),
    turns: [
      ...openTiling,
      { say: 'Berwick', place: BERWICK },
      { say: 'floor_only' },
      { say: 'porcelain' },
      { say: '20' },
      { say: 'labour_only' },
      { say: 'none' },
      { say: 'none' },
      { say: 'none' },
      { say: 'no' },
      { say: "the tile's wrong" },
      { say: 'ceramic' },
      { say: 'yes' },
    ],
  },
];
