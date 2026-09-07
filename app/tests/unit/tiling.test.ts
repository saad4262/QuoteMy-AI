import { beforeEach, describe, expect, it } from 'vitest';
import { runChat } from '../../src/client/controller.js';
import { clearSchemaCache, loadTradeSchema } from '../../src/client/schema.js';
import { TRADE_PRICING } from '../../src/client/pricing/spec.js';
import { extractionPrompt, reviewPrompt } from '../../src/prompts.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
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
