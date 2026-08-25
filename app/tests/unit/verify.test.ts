import { describe, expect, it } from 'vitest';
import { verifyExtraction } from '../../src/verify.js';
import type { Extraction } from '../../src/schemas.js';

const empty: Extraction = {
  businessName: null,
  gstIncluded: null,
  gstSourceQuote: null,
  serviceArea: { baseLocation: null, radiusKm: null, radiusSourceQuote: null, excludedAreas: [] },
  minimumCharge: null,
  minimumChargeSourceQuote: null,
  rates: [],
  removals: [],
  gates: [],
  siteConditions: [],
  specs: [],
  permits: { included: null, fee: null, sourceQuote: null },
  warranty: { years: null, text: null, sourceQuote: null },
  extras: [],
  inclusions: [],
  exclusions: [],
  tags: [],
  otherOfferings: [],
  couldNotUse: [],
};

const withRate = (over: Partial<Extraction>): Extraction => ({ ...empty, ...over });

describe('quote verification', () => {
  const text = 'Treated pine 1.8m high - $85 per metre installed.';

  it('keeps a rate whose source sentence really appears in the text', () => {
    const r = verifyExtraction(
      withRate({
        rates: [{ material: 'timber_pine', heightM: 1.8, pricePerMetre: 85, sourceQuote: 'Treated pine 1.8m high - $85 per metre installed.' }],
      }),
      text,
      'fencing',
    );
    expect(r.pricing.rates.timber_pine).toEqual({ '1.8m': 85 });
    expect(r.status).toBe('verified');
    expect(r.ratesKept).toBe(1);
  });

  it('drops an invented number whose source sentence is nowhere in the text', () => {
    const r = verifyExtraction(
      withRate({
        rates: [{ material: 'timber_pine', heightM: 1.8, pricePerMetre: 999, sourceQuote: 'Treated pine 1.8m - $999 per metre' }],
      }),
      text,
      'fencing',
    );
    expect(r.pricing.rates).toEqual({});
    expect(r.status).toBe('unverified');
    expect(r.couldNotUse.join(' ')).toContain('could not find that figure');
  });

  it('drops an implausible rate even when its source sentence is genuine', () => {
    // The $8500/m case from testing: a real sentence attached to a wrong figure.
    const genuine = 'Hardwood 1.8m - $8500 per metre';
    const r = verifyExtraction(
      withRate({ rates: [{ material: 'timber_hardwood', heightM: 1.8, pricePerMetre: 8500, sourceQuote: genuine }] }),
      genuine,
      'fencing',
    );
    expect(r.pricing.rates).toEqual({});
    expect(r.couldNotUse.join(' ')).toContain('outside the range we accept');
  });

  it('never lets a height band key come from model text', () => {
    const line = 'Colorbond 2.1m - $128 per metre';
    const r = verifyExtraction(
      withRate({ rates: [{ material: 'colorbond', heightM: 2.1, pricePerMetre: 128, sourceQuote: line }] }),
      line,
      'fencing',
    );
    expect(Object.keys(r.pricing.rates.colorbond ?? {})).toEqual(['2.1m']);
  });
});

describe('vocabulary', () => {
  it('rejects an invented material rather than filing it under the nearest value', () => {
    const line = 'Bamboo screening 1.8m - $70 per metre';
    const r = verifyExtraction(
      // strict json_schema should make this impossible; this is the second gate
      withRate({ rates: [{ material: 'bamboo_screening' as never, heightM: 1.8, pricePerMetre: 70, sourceQuote: line }] }),
      line,
      'fencing',
    );
    expect(r.pricing.rates).toEqual({});
    expect(r.couldNotUse.join(' ')).toContain('bamboo_screening');
  });

  it('drops tags outside the closed list', () => {
    const r = verifyExtraction(withRate({ tags: ['insured', 'award-winning' as never] }), 'text', 'fencing');
    expect(r.capabilities.tags).toEqual(['insured']);
  });
});

describe('status', () => {
  it('is unverified when no core rate survives, even though review approved', () => {
    const r = verifyExtraction(empty, 'some text', 'fencing');
    expect(r.status).toBe('unverified');
    expect(r.couldNotUse.join(' ')).toContain('No usable rates');
  });
});

describe('conflation guard', () => {
  it('keeps a rate and its removal separate rather than adding them', () => {
    const line = 'Timber 1.8m $85/m, plus $15/m if we take the old fence away';
    const r = verifyExtraction(
      withRate({
        rates: [{ material: 'timber_pine', heightM: 1.8, pricePerMetre: 85, sourceQuote: line }],
        removals: [{ removes: 'timber', pricePerMetre: 15, sourceQuote: line }],
      }),
      line,
      'fencing',
    );
    expect(r.pricing.rates.timber_pine).toEqual({ '1.8m': 85 });
    expect(r.pricing.removals).toEqual([{ removes: 'timber', pricePerMetre: 15 }]);
  });
});

describe('the long tail', () => {
  const line = 'Bamboo screening 1.8m high - $70 per metre';

  const offering = (over: Record<string, unknown> = {}) =>
    withRate({
      otherOfferings: [
        { slug: null, label: 'Bamboo screening', pricePerMetre: 70, heightM: 1.8, unit: 'per_metre', sourceQuote: line, ...over },
      ],
    } as never);

  it('keeps what the closed list has no home for, instead of losing it', () => {
    const r = verifyExtraction(offering(), line, 'fencing');
    expect(r.otherOfferings).toEqual([
      { slug: 'bamboo-screening', label: 'Bamboo screening', pricePerMetre: 70, heightM: 1.8, unit: 'per_metre' },
    ]);
  });

  it('applies the same number gates as a core rate', () => {
    const invented = verifyExtraction(offering({ sourceQuote: 'Bamboo screening - $70 per metre' }), line, 'fencing');
    expect(invented.otherOfferings).toHaveLength(0);
    expect(invented.couldNotUse.join(' ')).toContain('Could not find');

    const absurd = verifyExtraction(offering({ pricePerMetre: 8500 }), line, 'fencing');
    expect(absurd.otherOfferings).toHaveLength(0);
    expect(absurd.couldNotUse.join(' ')).toContain('outside the range');
  });

  it('will not let the model invent a slug - only reuse one it was shown', () => {
    const madeUp = verifyExtraction(offering({ slug: 'something-the-model-made-up' }), line, 'fencing');
    expect(madeUp.otherOfferings[0]?.slug).toBe('bamboo-screening'); // built from the label instead

    const shown = verifyExtraction(offering({ slug: 'bamboo-fence' }), line, 'fencing', ['bamboo-fence']);
    expect(shown.otherOfferings[0]?.slug).toBe('bamboo-fence'); // it was on the list, so it stands
  });
});

describe('consistency checks', () => {
  it('never lets one of two prices for the same thing vanish silently', () => {
    const text = 'Treated pine 1.8m - $85 per metre\nTreated pine 1.8m - $95 per metre';
    const r = verifyExtraction(
      withRate({
        rates: [
          { material: 'timber_pine', heightM: 1.8, pricePerMetre: 85, sourceQuote: 'Treated pine 1.8m - $85 per metre' },
          { material: 'timber_pine', heightM: 1.8, pricePerMetre: 95, sourceQuote: 'Treated pine 1.8m - $95 per metre' },
        ],
      }),
      text,
      'fencing',
    );

    expect(r.pricing.rates.timber_pine).toEqual({ '1.8m': 85 }); // the first stands
    expect(r.couldNotUse.join(' ')).toContain('twice');
    expect(r.couldNotUse.join(' ')).toContain('which one is right');
  });

  it('flags a taller fence that costs less, without throwing the figure away', () => {
    const text = 'Treated pine 1.8m - $85 per metre\nTreated pine 2.1m - $62 per metre';
    const r = verifyExtraction(
      withRate({
        rates: [
          { material: 'timber_pine', heightM: 1.8, pricePerMetre: 85, sourceQuote: 'Treated pine 1.8m - $85 per metre' },
          { material: 'timber_pine', heightM: 2.1, pricePerMetre: 62, sourceQuote: 'Treated pine 2.1m - $62 per metre' },
        ],
      }),
      text,
      'fencing',
    );

    expect(r.pricing.rates.timber_pine).toEqual({ '1.8m': 85, '2.1m': 62 }); // both kept
    expect(r.couldNotUse.join(' ')).toContain('the taller one costs less');
  });

  it('says nothing when prices rise with height, as they should', () => {
    const text = 'Treated pine 1.8m - $85 per metre\nTreated pine 2.1m - $104 per metre';
    const r = verifyExtraction(
      withRate({
        rates: [
          { material: 'timber_pine', heightM: 1.8, pricePerMetre: 85, sourceQuote: 'Treated pine 1.8m - $85 per metre' },
          { material: 'timber_pine', heightM: 2.1, pricePerMetre: 104, sourceQuote: 'Treated pine 2.1m - $104 per metre' },
        ],
      }),
      text,
      'fencing',
    );
    expect(r.couldNotUse.join(' ')).not.toContain('taller');
  });

  it('flags removal costing more than putting a fence up', () => {
    const line = 'Timber 1.8m $85/m. Removal of old fence $120 per metre.';
    const r = verifyExtraction(
      withRate({
        rates: [{ material: 'timber_pine', heightM: 1.8, pricePerMetre: 85, sourceQuote: line }],
        removals: [{ removes: 'timber', pricePerMetre: 120, sourceQuote: line }],
      }),
      line,
      'fencing',
    );

    expect(r.pricing.removals).toHaveLength(1); // kept, not dropped
    expect(r.couldNotUse.join(' ')).toContain('more than your cheapest fence');
  });
});

describe('build specs', () => {
  const line = 'Posts are 100x100mm H4 pine, 3 rails of 75x50mm per bay.';
  const depth = 'Posts go 700mm deep at 2.4m centres as standard.';

  it('merges a spec written across several sentences into one entry per material', () => {
    const r = verifyExtraction(
      withRate({
        specs: [
          { material: 'timber_pine', postSize: '100x100mm H4 pine', postSpacingM: null, postDepthMm: null,
            holeDiameterMm: null, footing: null, railCount: 3, railSize: '75x50mm', infill: null,
            cappingSize: null, cappingExtraPerMetre: null, sourceQuote: line },
          { material: 'timber_pine', postSize: null, postSpacingM: 2.4, postDepthMm: 700,
            holeDiameterMm: null, footing: null, railCount: null, railSize: null, infill: null,
            cappingSize: null, cappingExtraPerMetre: null, sourceQuote: depth },
        ],
      } as never),
      `${line}\n${depth}`,
      'fencing',
    );

    expect(r.capabilities.specs).toHaveLength(1);
    // a later null must never wipe a value already found
    expect(r.capabilities.specs[0]).toMatchObject({
      material: 'timber_pine', postSize: '100x100mm H4 pine', railCount: 3, postSpacingM: 2.4, postDepthMm: 700,
    });
  });

  it('keeps a spec whose sentence is not in the text out entirely', () => {
    const r = verifyExtraction(
      withRate({
        specs: [
          { material: 'timber_pine', postSize: '90x90mm', postSpacingM: null, postDepthMm: null,
            holeDiameterMm: null, footing: null, railCount: null, railSize: null, infill: null,
            cappingSize: null, cappingExtraPerMetre: null, sourceQuote: 'Posts are 90x90mm' },
        ],
      } as never),
      line,
      'fencing',
    );
    expect(r.capabilities.specs).toHaveLength(0);
  });
});

describe('surcharge stated two ways', () => {
  it('keeps the first and asks which is right, rather than applying both', () => {
    const text = 'Sloped blocks add $14 per metre.\nSloped blocks are charged at 10% instead.';
    const r = verifyExtraction(
      withRate({
        siteConditions: [
          { condition: 'sloped', extraPerMetre: 14, extraPercent: null, sourceQuote: 'Sloped blocks add $14 per metre.' },
          { condition: 'sloped', extraPerMetre: null, extraPercent: 10, sourceQuote: 'Sloped blocks are charged at 10% instead.' },
        ],
      } as never),
      text,
      'fencing',
    );

    expect(r.pricing.siteConditions).toHaveLength(1);
    expect(r.pricing.siteConditions[0]).toEqual({ condition: 'sloped', extraPerMetre: 14, extraPercent: null });
    expect(r.couldNotUse.join(' ')).toContain('twice');
  });
});
