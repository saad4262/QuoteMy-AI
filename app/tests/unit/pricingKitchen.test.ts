import { describe, expect, it } from 'vitest';
import { quoteKitchen, type KitchenBrief } from '../../src/client/pricing/kitchen.js';
import type { KitchenVerifiedPricing } from '../../src/verify/index.js';

/**
 * Which installation price a kitchen quote is allowed to use.
 *
 * The golden conversations cannot reach this. `MockAiClient` returns `jobType: null` on every rate,
 * so offline every price lands in `general` and the lookup never has to choose. A real model reads
 * the price list's own headings - and Beky Kitchens prints its three sizes under "Installation-only
 * pricing", which is a section of a document, not a restriction on who may be quoted.
 *
 * Live, that meant a customer REPLACING a kitchen was told nobody prices a kitchen that size, by
 * the one business that prices all three. The size was never the problem, so the sentence they read
 * was untrue as well as unhelpful.
 */

const business = {
  uid: 'b1',
  businessName: 'Beky Kitchens',
  suburb: 'Pakenham',
  distanceKm: 4,
  isAutoAcceptEnabled: false,
} as never;

const pricing = (rates: KitchenVerifiedPricing['rates']): KitchenVerifiedPricing =>
  ({
    gstIncluded: true,
    supplyModels: ['supply_and_install', 'labour_only'],
    enabledKitchenSizes: ['small', 'standard', 'large'],
    rates,
    cabinetSupply: [],
    benchtops: [],
    removals: [{ removes: 'any', price: 950 }],
    prep: [],
    extras: [],
    minimumCharge: 450,
    siteMeasureFee: null,
    travelFee: null,
    serviceArea: { baseLocation: 'Pakenham', resolved: null, radiusKm: 30, excludedAreas: [] },
  }) as unknown as KitchenVerifiedPricing;

const brief = (over: Partial<KitchenBrief> = {}): KitchenBrief => ({
  jobType: 'replacement',
  kitchenSize: 'large',
  benchtop: null,
  removal: null,
  extras: [],
  supply: 'labour_only',
  ...over,
});

const SIZED = [
  { size: 'small', label: null, price: 1950, unit: 'per_job' as const },
  { size: 'standard', label: null, price: 2850, unit: 'per_job' as const },
  { size: 'large', label: null, price: 4250, unit: 'per_job' as const },
];

describe('the installation rate a kitchen quote uses', () => {
  it('prefers the bucket written for this job', () => {
    const quote = quoteKitchen(business, pricing({ replacement: SIZED, general: [{ size: 'large', label: null, price: 9999, unit: 'per_job' }] }), brief());
    expect('blocked' in quote).toBe(false);
    expect((quote as { rateKey: string }).rateKey).toBe('replacement');
    expect((quote as { total: number }).total).toBe(4250);
  });

  it('falls back to the general bucket', () => {
    const quote = quoteKitchen(business, pricing({ general: SIZED }), brief());
    expect((quote as { rateKey: string }).rateKey).toBe('general');
    expect((quote as { total: number }).total).toBe(4250);
  });

  /* The one that shipped broken. */
  it('uses a price published under another job type rather than refusing to quote', () => {
    const quote = quoteKitchen(business, pricing({ install_only: SIZED }), brief());
    expect('blocked' in quote, 'a business pricing all three sizes must not read as pricing none').toBe(false);
    expect((quote as { total: number }).total).toBe(4250);
  });

  /* Same rule as the cabinetry package: never show a total below what they will be charged. */
  it('takes the dearest when several other job types price the same size', () => {
    const quote = quoteKitchen(
      business,
      pricing({
        install_only: [{ size: 'large', label: null, price: 4250, unit: 'per_job' }],
        new_kitchen: [{ size: 'large', label: null, price: 5600, unit: 'per_job' }],
      }),
      brief(),
    );
    expect((quote as { total: number }).total).toBe(5600);
  });

  it('still refuses when nobody prices that size at all', () => {
    const quote = quoteKitchen(business, pricing({ install_only: [{ size: 'small', label: null, price: 1950, unit: 'per_job' }] }), brief());
    expect(quote).toHaveProperty('blocked', 'kitchenSize');
  });

  /* A per-cabinet price cannot quote a kitchen: this chat never asks how many cabinets there are. */
  it('never quotes from a per-item row, whatever bucket it is in', () => {
    const quote = quoteKitchen(business, pricing({ install_only: [{ size: null, label: 'Base cabinet', price: 180, unit: 'per_item' }] }), brief());
    expect(quote).toHaveProperty('blocked', 'kitchenSize');
  });
});
