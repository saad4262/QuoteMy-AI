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
