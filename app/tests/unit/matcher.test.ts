import { describe, expect, it } from 'vitest';
import { matchBusinesses } from '../../src/client/matcher.js';
import { MemoryRepository, type ServiceExtract } from '../../src/store.js';
import type { Trade } from '../../src/vocab.js';

/**
 * Step 12 of `docs/DYNAMIC-SCHEMA-PLAN.md` claims the service documents are read concurrently. That
 * is a claim about timing, and a green test suite says nothing about it - so this counts how many
 * reads are in flight at once rather than trusting that the code looks parallel.
 */

const BERWICK = { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' };

/** Records the high-water mark of concurrent reads, and holds each one open long enough to see it. */
class CountingRepository extends MemoryRepository {
  inFlight = 0;
  peak = 0;
  reads = 0;

  constructor(private readonly howMany: number) {
    super();
    for (let i = 0; i < howMany; i += 1) {
      this.addCandidate({
        uid: `biz-${i}`,
        businessName: `Business ${i}`,
        servicesProvided: ['fencing'],
        rating: null,
        reviewCount: null,
        isAutoAcceptEnabled: false,
        isAiAutoAcceptEnabled: false,
      });
    }
  }

  override async getServiceExtract(uid: string, _trade: Trade): Promise<ServiceExtract | null> {
    this.reads += 1;
    this.inFlight += 1;
    this.peak = Math.max(this.peak, this.inFlight);
    await new Promise((resolve) => setTimeout(resolve, 1));
    this.inFlight -= 1;

    return {
      status: 'confirmed',
      pricing: {
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
      },
      capabilities: null,
    };
  }
}

describe('matchBusinesses', () => {
  it('reads the service documents concurrently, not one after another', async () => {
    const repo = new CountingRepository(60);
    const result = await matchBusinesses('fencing', BERWICK, 'Berwick', repo);

    expect(result.matched).toBe(true);
    expect(result.totalCovering).toBe(60);
    expect(repo.reads).toBe(60);
    // Serial would peak at 1. This must be genuinely parallel.
    expect(repo.peak).toBeGreaterThan(1);
  });

  it('caps how many it opens at once, so a serverless function does not run out of sockets', async () => {
    const repo = new CountingRepository(200);
    await matchBusinesses('fencing', BERWICK, 'Berwick', repo);

    expect(repo.reads).toBe(200);
    expect(repo.peak).toBeLessThanOrEqual(25);
  });

  it('returns the businesses in a stable order however the reads finish', async () => {
    const first = await matchBusinesses('fencing', BERWICK, 'Berwick', new CountingRepository(30));
    const second = await matchBusinesses('fencing', BERWICK, 'Berwick', new CountingRepository(30));
    expect(first.businesses.map((b) => b.uid)).toEqual(second.businesses.map((b) => b.uid));
  });
});
