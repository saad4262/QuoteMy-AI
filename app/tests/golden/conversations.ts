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
  trade?: 'fencing' | 'tiling';
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
