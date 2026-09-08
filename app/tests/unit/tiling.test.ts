import { beforeEach, describe, expect, it } from 'vitest';
import { runChat } from '../../src/client/controller.js';
import { clearSchemaCache, loadTradeSchema } from '../../src/client/schema.js';
import { TRADE_PRICING } from '../../src/client/pricing/spec.js';
import { TRADE_FIELDS } from '../../src/client/fieldSpec.js';
import { turnSchemaFor } from '../../src/client/schemas.js';
import { chatPrompt, extractionPrompt, reviewPrompt } from '../../src/prompts.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { quoteTiling } from '../../src/client/pricing/tiling.js';
import { verifyExtraction } from '../../src/verify/index.js';
import type { TilingExtraction } from '../../src/schemas.js';
import { TRADE_VOCAB } from '../../src/vocab.js';

/**
 * Tiling exists, end to end, at the level a smoke test can prove offline.
 *
 * Compiling is not the same as working: every registry in this codebase is exhaustive over `Trade`,
 * so adding 'tiling' to `TRADES` makes the compiler demand a row everywhere - and a row can be
 * present and wrong. These check that the rows actually joined up, that the chat asks tiling's
 * questions rather than fencing's, and that the verifier's gates hold on tiling's shape.
 *
 * The full conversation coverage is the tiling golden set (B10); this is the floor beneath it.
 */

const BERWICK = { latitude: -38.03, longitude: 145.34, suburb: 'Berwick', state: 'VIC', postcode: '3806', displayLabel: 'Berwick, VIC 3806' };

let repo: MemoryRepository;

beforeEach(() => {
  repo = new MemoryRepository();
  setRepository(repo);
  clearSchemaCache();
});

describe('the tiling trade is wired up', () => {
  it('loads its own vocabulary, not fencing\'s', async () => {
    const schema = await loadTradeSchema('tiling', repo);

    expect(schema.trade).toBe('tiling');
    expect(schema.core.jobTypes).toContain('bathroom');
    expect(schema.core.tileTypes).toContain('porcelain');
    // The thing that would be most wrong: fencing's lists seeded into a tiler's document.
    expect(schema.core.materials).toBeUndefined();
    expect(schema.core.gateTypes).toBeUndefined();

    expect(schema.labels.jobTypes?.kitchen_splashback).toBe('Kitchen splashback');
    expect(schema.fields.map((f) => f.key)).toEqual([
      'suburb',
      'jobType',
      'tileType',
      'areaSqm',
      'supply',
      'removal',
      'waterproofing',
      'conditions',
      'existingPrice',
    ]);
  });

  it('prices by the square metre, keyed on the job and the tile', () => {
    expect(TRADE_PRICING.tiling.quantityField).toBe('areaSqm');
    expect(TRADE_PRICING.tiling.unit).toBe('m2');
    expect(TRADE_PRICING.tiling.rateKeys).toEqual(['jobType', 'tileType']);
    // Fencing is untouched by any of it.
    expect(TRADE_PRICING.fencing.unit).toBe('m');
  });

  it('has its own publish rules and its own extraction prompt', () => {
    expect(reviewPrompt('tiling')).toContain('TILING PUBLISH RULES');
    expect(reviewPrompt('tiling')).not.toContain('FENCING PUBLISH RULES');
    expect(reviewPrompt('fencing')).toContain('FENCING PUBLISH RULES');

    expect(extractionPrompt('tiling')).toContain('RATES CARRY THEIR OWN UNIT');
    expect(extractionPrompt('tiling')).not.toContain('timber_pine');
  });

  /**
   * The model's own contract, per trade.
   *
   * Before this the turn schema was hand-written as fencing's, so a tiling conversation asked the
   * model for a fence material and gave it nowhere to put a tile. Deriving it from the field spec
   * is only safe if fencing's contract came out unchanged - these two assertions are what say so.
   */
  it('gives the model exactly the fields that trade is asking about', () => {
    const keysOf = (fields: Parameters<typeof turnSchemaFor>[0]) =>
      Object.keys((turnSchemaFor(fields) as unknown as { shape: { checklist: { shape: object } } }).shape.checklist.shape);

    expect(keysOf(TRADE_FIELDS.fencing)).toEqual([
      'material',
      'heightKey',
      'lengthMeters',
      'removal',
      'conditions',
      'gateType',
      'gateQty',
      'existingPrice',
    ]);

    expect(keysOf(TRADE_FIELDS.tiling)).toEqual([
      'jobType',
      'tileType',
      'areaSqm',
      'supply',
      'removal',
      'waterproofing',
      'conditions',
      'existingPrice',
    ]);

    // A suburb is never the model's to fill - it is real only once picked off the Google list.
    expect(keysOf(TRADE_FIELDS.tiling)).not.toContain('suburb');
  });

  it('briefs the model in its own trade\'s words', () => {
    expect(chatPrompt('tiling')).toContain('tiling quote conversation');
    expect(chatPrompt('tiling')).toContain('tileType');
    expect(chatPrompt('tiling')).not.toContain('gateQty');
    expect(chatPrompt('fencing')).toContain('fencing quote conversation');
  });

  it('keeps its closed lists separate from fencing\'s', () => {
    expect(TRADE_VOCAB.tiling.core.tileTypes).toContain('natural_stone');
    expect(TRADE_VOCAB.tiling.core.materials).toBeUndefined();
    expect(TRADE_VOCAB.fencing.core.tileTypes).toBeUndefined();
  });
});

describe('a tiling conversation', () => {
  const turn = async (message: string, checklist: unknown, place?: unknown) =>
    runChat(
      {
        trade: 'tiling',
        message,
        sessionId: 'tile-1',
        place: place ? JSON.stringify(place) : '',
        knownChecklist: checklist ? JSON.stringify(checklist) : '',
      },
      [],
      { repo },
    );

  it('asks tiling\'s questions, in tiling\'s words', async () => {
    let response = await turn('I need a quote for tiling', null);
    expect(response.trade).toBe('tiling');

    response = await turn('yes', response.checklist);
    expect(response.message).toContain('suburb');

    response = await turn('Berwick', response.checklist, BERWICK);
    // The first real question is the job, not a fence material.
    expect(response.message).toBe('What are you having tiled?');
    expect(response.options.map((o) => o.label)).toContain('Bathroom');

    response = await turn('bathroom', response.checklist, BERWICK);
    expect(response.message).toBe('What tile are you using?');
    expect(response.options.map((o) => o.label)).toContain('Porcelain');
  });
});

describe('a tiling job is actually priced', () => {
  const now = '2026-01-01T00:00:00.000Z';

  /** One tiler in Pakenham, with both kinds of rate on its list - per m² and one fixed room price. */
  function seedTiler(): void {
    repo.addCandidate({
      uid: 'paky',
      businessName: 'Paky Tiles',
      servicesProvided: ['tiling'],
      rating: 4.9,
      reviewCount: 80,
      isAutoAcceptEnabled: false,
      isAiAutoAcceptEnabled: true,
    });

    repo.savePricing('paky', {
      trade: 'tiling',
      status: 'confirmed',
      schemaVersion: 2,
      updatedAt: now,
      confirmedAt: now,
      ratesSaved: 3,
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
      tileSupply: [],
      prep: [],
      removals: [{ removes: 'ceramic', pricePerSqm: 45 }],
      waterproofing: [{ area: 'bathroom', price: 950 }],
      siteConditions: [],
      serviceArea: {
        baseLocation: 'Pakenham',
        resolved: { suburb: 'Pakenham', state: 'VIC', postcode: '3810', lat: -38.07, lng: 145.48, source: 'google' },
        radiusKm: 25,
        excludedAreas: [],
      },
      minimumCharge: 350,
      callOutFee: null,
      travelFee: null,
    } as never);

    repo.saveCapabilities('paky', {
      trade: 'tiling',
      businessName: 'Paky Tiles',
      warranty: { text: 'Workmanship warranty as per contract' },
      tags: [],
      extras: [],
      inclusions: [],
      exclusions: [],
      otherOfferings: [],
      couldNotUse: [],
      schemaVersion: 2,
      updatedAt: now,
    } as never);
  }

  const run = async (says: string[]) => {
    let checklist: unknown = null;
    let response = null as Awaited<ReturnType<typeof runChat>> | null;
    for (const message of says) {
      response = await runChat(
        {
          trade: 'tiling',
          message,
          sessionId: 'price-1',
          place: JSON.stringify(BERWICK),
          knownChecklist: checklist ? JSON.stringify(checklist) : '',
        },
        [],
        { repo },
      );
      checklist = response.checklist;
    }
    return response!;
  };

  beforeEach(() => seedTiler());

  it('prices a per-square-metre job off the tile-specific rate', async () => {
    const response = await run([
      'I need tiling done',
      'yes',
      'Pakenham',
      'floor_only',
      'porcelain',
      '20',
      'labour_only',
      'any',
      'none',
      'none',
      'yes',
    ]);

    expect(response.type).toBe('result');
    expect(response.results).toHaveLength(1);
    // $72/m2 for porcelain - the specific row, not the $65 general one - plus $45/m2 removal,
    // across 20m2. GST is already included in the published rates.
    expect(response.results[0]!.estimatedTotal).toBe((72 + 45) * 20);
    expect(response.results[0]!.ratePerMeter).toBe(117);
    expect(response.results[0]!.businessName).toBe('Paky Tiles');
  });

  it('prices a room the business sells as one price, and adds what is measured on top', async () => {
    const response = await run([
      'I need tiling done',
      'yes',
      'Pakenham',
      'bathroom',
      'porcelain',
      '8',
      'labour_only',
      'any',
      'bathroom',
      'none',
      'yes',
    ]);

    expect(response.type).toBe('result');
    /* The bathroom package is $4,850 whatever the area, the removal is $45/m2 across 8m2, and the
       waterproofing is its own $950. A per-job rate does not multiply by the area - getting that
       wrong would quote this bathroom at nearly forty thousand dollars. */
    expect(response.results[0]!.estimatedTotal).toBe(4850 + 45 * 8 + 950);
  });

  /* A splashback is on the first page of jobs and this tiler has not published a price for one, so
     it is the natural case for "nobody near you can do that" - and the sentence must be tiling's. */
  /**
   * Correcting an answer by naming the field.
   *
   * The words that name a field used to live in one table keyed on fencing's names - heightKey,
   * gateType - so "no, the tile's wrong" could never reopen anything. They belong to the field now.
   */
  it('reopens the field the customer names', async () => {
    let response = await run([
      'I need tiling done',
      'yes',
      'Pakenham',
      'floor_only',
      'porcelain',
      '20',
      'labour_only',
      'any',
      'none',
      'none',
    ]);
    // The recap, before they confirm.
    expect(response.type).toBe('confirmation');

    const say = async (message: string, checklist: unknown) =>
      runChat(
        { trade: 'tiling', message, sessionId: 'price-1', place: JSON.stringify(BERWICK), knownChecklist: JSON.stringify(checklist) },
        [],
        { repo },
      );

    response = await say('no', response.checklist);
    response = await say("the tile's wrong", response.checklist);

    expect(response.message).toBe('What tile are you using?');
    expect(response.checklist.tileType).toBeFalsy();
    // And the answers they did not query are untouched.
    expect(response.checklist.areaSqm).toBe(20);
  });

  /* Nobody prices the job as asked - and that is not the end of it. The businesses covering this
     customer can quote SOMETHING, and being shown the nearest of those beats being shown a dead end
     next to a business that could have done the work. Fencing has done this all along; tiling fell
     straight through, because the search was written against fencing's rate table. */
  it('offers the nearest thing a tiler does publish, rather than a dead end', async () => {
    const response = await run([
      'I need tiling done',
      'yes',
      'Pakenham',
      'kitchen_splashback',
      'porcelain',
      '12',
      'labour_only',
      'none',
      'none',
      'none',
      'yes',
    ]);

    expect(response.type).toBe('question');
    expect(response.results).toHaveLength(0);
    // The room leads and the tile qualifies it, which is the opposite of fencing's sentence.
    expect(response.message).toContain('Nobody near you does kitchen splashback in Porcelain');
    expect(response.message).toContain('The closest they can do is floor only in Porcelain');
    expect(response.message).toContain('Paky Tiles');
    expect(response.alternatives?.length).toBeGreaterThan(0);
    expect(response.options.map((option) => option.value)).toContain('no');
    // Never fencing's words in a tiling conversation.
    expect(response.message).not.toContain('fence');
    expect(response.message).not.toContain(' at ');
  });

  /* And when there really is nothing to offer, the dead end is still the honest answer. This tiler
     publishes no removal at all, so every combination it does publish blocks for the same reason -
     there is no nearer job, only the same refusal at a different tile. */
  it('still says so plainly when there is no nearest thing either', async () => {
    const current = await repo.getPricing('paky', 'tiling');
    await repo.savePricing('paky', { ...(current as never), removals: [] } as never);

    const response = await run([
      'I need tiling done',
      'yes',
      'Pakenham',
      'floor_only',
      'porcelain',
      '20',
      'labour_only',
      'ceramic',
      'none',
      'none',
      'yes',
    ]);

    expect(response.type).toBe('result');
    expect(response.results).toHaveLength(0);
    expect(response.message).toContain('take up that kind of old tile');
  });
});

/**
 * Pricing a room for a business that prices surfaces.
 *
 * Tilers quote off a rate card - floor so much a metre, wall so much a metre - and hardly any of
 * them publish one figure for "a bathroom". Customers ask for the room, because that is what they
 * are having done. The first tiling business onboarded published five tile types across floor and
 * wall, every waterproofing area, removal and a minimum charge, and quoted NOTHING: every customer
 * asking for a bathroom was told nobody nearby prices that job.
 */
describe('a room quoted from surface rates', () => {
  const surfacePricer = {
    gstIncluded: true,
    supplyModels: ['labour_only'],
    enabledJobTypes: ['floor_only', 'wall_only'],
    rates: {
      floor_only: [{ tileType: 'ceramic', price: 60, unit: 'per_sqm' }],
      wall_only: [{ tileType: 'ceramic', price: 65, unit: 'per_sqm' }],
    },
    tileSupply: [],
    prep: [],
    removals: [],
    waterproofing: [],
    siteConditions: [],
    serviceArea: { baseLocation: 'Pakenham', radiusKm: 25, excludedAreas: [], resolved: null },
    minimumCharge: null,
    callOutFee: null,
    travelFee: null,
  } as unknown as Parameters<typeof quoteTiling>[1];

  const business = { distanceKm: 5, rating: null, reviewCount: null } as unknown as Parameters<typeof quoteTiling>[0];

  const ask = (jobType: string, pricing = surfacePricer) =>
    quoteTiling(business, pricing, {
      jobType,
      tileType: 'ceramic',
      areaSqm: 10,
      supply: 'labour_only',
      removal: null,
      waterproofing: null,
      conditions: [],
    }) as never as { total?: number; badges?: string[]; blocked?: string };

  it('prices a bathroom off the floor and wall rates, taking the dearer', () => {
    const quote = ask('bathroom');

    // A room is floor AND wall, and the customer gives one area for the lot, so which is which
    // cannot be known. $65 rather than $60: the number shown must not be under what they charge.
    expect(quote.blocked).toBeUndefined();
    expect(quote.total).toBe(650);
    expect(quote.badges).toContain('Priced per m² for this room');
  });

  /* A splashback is wall tiling and nothing else. Pricing it off a floor rate would be a number
     this business never published - the reason the fallback follows each job's real surfaces
     rather than reaching for whatever rate happens to be there. */
  it('will not price a splashback from a floor rate', () => {
    const floorsOnly = { ...surfacePricer, rates: { floor_only: surfacePricer.rates.floor_only } };

    expect(ask('kitchen-splashback', floorsOnly).blocked).toBe('jobType');
    expect(ask('kitchen-splashback').total).toBe(650); // the wall rate, when they publish one
  });

  it('leaves a published room price alone', () => {
    const packaged = {
      ...surfacePricer,
      rates: { ...surfacePricer.rates, bathroom: [{ tileType: null, price: 4850, unit: 'per_job' }] },
    };
    const quote = ask('bathroom', packaged as typeof surfacePricer);

    // Their own figure for the room, not one built from the surfaces underneath it.
    expect(quote.total).toBe(4850);
    expect(quote.badges).not.toContain('Priced per m² for this room');
  });

  /* A room package is one price for the whole job, so it says nothing about how big THIS room is.
     Standing in for a room whose area we were told would be quoting a number nobody wrote. */
  it('does not stand a per-job floor package in for a room', () => {
    const packagedFloor = {
      ...surfacePricer,
      rates: { floor_only: [{ tileType: 'ceramic', price: 900, unit: 'per_job' }] },
    };

    expect(ask('balcony', packagedFloor as typeof surfacePricer).blocked).toBe('jobType');
  });
});

describe('the tiling verifier', () => {
  const text = [
    'Standard floor tiling $65 per m2.',
    'Porcelain floor tiling $72 per m2.',
    'Complete standard bathroom package $4,850.',
    'Ceramic tile removal $45 per m2.',
    'Standard bathroom waterproofing $950.',
    'Minimum job charge $350. Site inspection $95.',
    'Based in Pakenham, we travel 25km. All prices include GST.',
  ].join('\n');

  const extraction = (over: Partial<TilingExtraction> = {}): TilingExtraction =>
    ({
      businessName: 'Paky Tiles',
      gstIncluded: true,
      gstSourceQuote: 'All prices include GST.',
      serviceArea: { baseLocation: 'Pakenham', radiusKm: 25, radiusSourceQuote: 'we travel 25km', excludedAreas: [] },
      minimumCharge: 350,
      minimumChargeSourceQuote: 'Minimum job charge $350.',
      callOutFee: 95,
      callOutFeeSourceQuote: 'Site inspection $95.',
      travelFee: null,
      travelFeeSourceQuote: null,
      rates: [
        { jobType: 'floor_only', tileType: null, price: 65, unit: 'per_sqm', sourceQuote: 'Standard floor tiling $65 per m2.' },
        { jobType: 'floor_only', tileType: 'porcelain', price: 72, unit: 'per_sqm', sourceQuote: 'Porcelain floor tiling $72 per m2.' },
        { jobType: 'bathroom', tileType: null, price: 4850, unit: 'per_job', sourceQuote: 'Complete standard bathroom package $4,850.' },
      ],
      tileSupply: [],
      supplyModels: ['supply_and_install', 'labour_only'],
      prep: [],
      removals: [{ removes: 'ceramic', pricePerSqm: 45, sourceQuote: 'Ceramic tile removal $45 per m2.' }],
      waterproofing: [{ area: 'bathroom', price: 950, sourceQuote: 'Standard bathroom waterproofing $950.' }],
      siteConditions: [],
      extras: [],
      warranty: { text: null, sourceQuote: null },
      inclusions: [],
      exclusions: [],
      tags: [],
      otherOfferings: [],
      couldNotUse: [],
      ...over,
    }) as TilingExtraction;

  it('keeps a per-square-metre rate and a per-job rate in the same table', () => {
    const result = verifyExtraction(extraction(), text, 'tiling');

    expect(result.status).toBe('verified');
    expect(result.ratesKept).toBe(3);
    expect(result.pricing.rates.floor_only).toEqual([
      { tileType: null, price: 65, unit: 'per_sqm' },
      { tileType: 'porcelain', price: 72, unit: 'per_sqm' },
    ]);
    // The whole point of the unit living on the row: $4,850 is one price, not a rate per metre.
    expect(result.pricing.rates.bathroom).toEqual([{ tileType: null, price: 4850, unit: 'per_job' }]);
  });

  it('drops a rate whose source sentence is nowhere in the text', () => {
    const result = verifyExtraction(
      extraction({
        rates: [
          { jobType: 'wall_only', tileType: 'subway', price: 78, unit: 'per_sqm', sourceQuote: 'Subway wall tiling $78 per m2.' },
        ],
      }),
      text,
      'tiling',
    );

    expect(result.ratesKept).toBe(0);
    expect(result.status).toBe('unverified');
    expect(result.couldNotUse.join(' ')).toContain('could not find that figure');
  });

  it('refuses a tile type the vocabulary has no home for, rather than filing it under the nearest', () => {
    const result = verifyExtraction(
      extraction({
        rates: [
          { jobType: 'floor_only', tileType: 'bamboo' as never, price: 65, unit: 'per_sqm', sourceQuote: 'Standard floor tiling $65 per m2.' },
        ],
      }),
      text,
      'tiling',
    );

    expect(result.ratesKept).toBe(0);
    expect(result.couldNotUse.join(' ')).toContain('not a tile type we hold');
  });

  it('flags a per-square-metre rate that is really a room price', () => {
    const result = verifyExtraction(
      extraction({
        rates: [
          { jobType: 'bathroom', tileType: null, price: 4850, unit: 'per_sqm', sourceQuote: 'Complete standard bathroom package $4,850.' },
        ],
      }),
      text,
      'tiling',
    );

    // Above the per-m2 ceiling entirely, so it is dropped rather than merely flagged.
    expect(result.ratesKept).toBe(0);
    expect(result.couldNotUse.join(' ')).toContain('outside the range we accept');
  });
});
