import { describe, expect, it } from 'vitest';
import { buildRejectionReport } from '../../src/report.js';
import { buildApprovalReport } from '../../src/report.js';
import { verifyExtraction } from '../../src/verify.js';
import type { Extraction } from '../../src/schemas.js';

const fixes = [
  {
    kind: 'unclear' as const,
    what: 'Add a per-metre price for Colorbond, glass pool fencing and rural fencing.',
    example: 'Colorbond 1.8m - $110/m (your figure)',
  },
  { kind: 'missing' as const, what: 'Say whether your prices include GST.', example: null },
];

describe('rejection report', () => {
  it('is assembled by code in a fixed order, so it never varies between runs', () => {
    const a = buildRejectionReport(fixes);
    const b = buildRejectionReport(fixes);
    expect(a.report).toBe(b.report);
    expect(a.report).toMatchInlineSnapshot(`
      "We have been through the details you sent. A few things need updating before your profile can go live.

      ## What we still need

      1. Say whether your prices include GST.

      ## What needs to be clearer

      2. Add a per-metre price for Colorbond, glass pool fencing and rural fencing.
         - e.g. \`Colorbond 1.8m - $110/m (your figure)\`

      ## What to do next

      Update your details and send them through again for approval. If something above does not look right, use the contact button below and one of our team will go through it with you."
    `);
  });

  it('returns only what admin needs - the business block is assembled from fixed messages', () => {
    const built = buildRejectionReport(fixes);
    expect(Object.keys(built).sort()).toEqual(['counts', 'report', 'reportWordCount']);
  });

  it('stays inside the 250-word limit and reports its own length', () => {
    const built = buildRejectionReport(fixes);
    expect(built.reportWordCount).toBeLessThan(250);
    expect(built.counts).toEqual({ missing: 1, unclear: 1 });
  });
});

describe('approval report', () => {
  const line = 'Treated pine 1.8m high - $85 per metre installed.';
  const extraction: Extraction = {
    businessName: 'Southeast Fencing',
    gstIncluded: true,
    gstSourceQuote: line,
    serviceArea: { baseLocation: 'Berwick', radiusKm: 30, radiusSourceQuote: line, excludedAreas: [] },
    minimumCharge: null,
    minimumChargeSourceQuote: null,
    rates: [{ material: 'timber_pine', heightM: 1.8, pricePerMetre: 85, sourceQuote: line }],
    removals: [],
    gates: [],
    siteConditions: [],
    extras: [],
    inclusions: [],
    exclusions: [],
    tags: ['insured'],
    unmapped: [],
  };

  it('renders enum slugs as human labels, never raw', () => {
    const verified = verifyExtraction(extraction, line, 'fencing');
    const { report } = buildApprovalReport(verified);
    expect(report).toContain('Treated pine');
    expect(report).not.toContain('timber_pine');
    expect(report).toContain('| Treated pine | 1.8m | $85 |');
  });

  it('says so plainly when nothing could be verified', () => {
    const verified = verifyExtraction({ ...extraction, rates: [] }, line, 'fencing');
    const { report } = buildApprovalReport(verified);
    expect(verified.status).toBe('unverified');
    expect(report).toContain('could not match any of your rates');
  });
});
