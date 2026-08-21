/**
 * What each fixture SHOULD produce.
 *
 * This is the thing the project has been missing: a prompt or schema change can be scored instead
 * of eyeballed. Two real faults this session - a fully compliant submission rejected over an
 * unpriced extra, and a suburb quietly resolving to the wrong town - were both caught by a human
 * reading output. Neither would have survived a run of this.
 *
 * Every number below was verified by hand against the fixture text.
 */
export interface Expectation {
  file: string;
  approved: boolean;
  /** Exact values that must come out. Anything absent here is not scored. */
  pricing?: {
    gstIncluded?: boolean | null;
    minimumCharge?: number | null;
    baseLocation?: string | null;
    radiusKm?: number | null;
    rates?: Record<string, Record<string, number>>;
    removals?: { removes: string; pricePerMetre: number }[];
    gateCount?: number;
    siteConditionCount?: number;
  };
  tags?: string[];
}

export const EXPECTATIONS: Expectation[] = [
  {
    file: 'description-GOOD-southeast-fencing.txt',
    approved: true,
    pricing: {
      gstIncluded: true,
      minimumCharge: 850,
      baseLocation: 'Berwick',
      radiusKm: 30,
      rates: {
        timber_pine: { '0.9m': 62, '1.2m': 71, '1.5m': 79, '1.8m': 85, '2.1m': 104 },
        timber_hardwood: { '1.5m': 118, '1.8m': 132, '2.1m': 158 },
        colorbond: { '1.2m': 88, '1.5m': 96, '1.8m': 110, '2.1m': 128 },
        aluminium: { '1.2m': 165, '1.5m': 184, '1.8m': 210 },
        pool_aluminium: { '1.2m': 195, '1.35m': 215 },
        chainmesh: { '1.8m': 74, '2.4m': 92 },
        rural_wire: { '1.2m': 38 },
      },
      removals: [
        { removes: 'timber', pricePerMetre: 18 },
        { removes: 'metal', pricePerMetre: 24 },
      ],
      gateCount: 6,
      // Four, not three. "Rock or hand-dig only ... add $22 per metre" is one line naming TWO
      // conditions, and both must be stored: a customer whose site is hand-dig-only would
      // otherwise be quoted without the surcharge. Corrected after the first eval run.
      siteConditionCount: 4,
    },
  },
  {
    // Deliberately longer and more charming than the good one, with almost no usable price.
    // If this is ever approved, the review has gone soft.
    file: 'description-BAD-daves-fencing.txt',
    approved: false,
  },
];
