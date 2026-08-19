import { describe, expect, it } from 'vitest';
import { buildRejectionReport } from '../../src/report.js';
import { buildApprovalReport } from '../../src/report.js';
import { verifyExtraction } from '../../src/verify.js';
import type { Extraction } from '../../src/schemas.js';

const review = {
  approved: false,
  opening: 'Thanks for sending your pricing through - there is good detail here.',
  whyUpdatesNeeded: 'Customers get an instant quote straight from your rates.',
  fixes: [
    { kind: 'unclear' as const, what: 'Add a firm per-metre rate for Colorbond, glass pool fencing and rural fencing.', example: 'Colorbond 1.8m - $110/m (your figure)' },
    { kind: 'missing' as const, what: 'Say whether your prices include GST.', example: null },
  ],
  closing: 'Add those in and send it through again.',
};

describe('rejection report', () => {
  it('is assembled by code in a fixed order, so it never varies between runs', () => {
    const a = buildRejectionReport(review);
    const b = buildRejectionReport(review);
    expect(a.report).toBe(b.report);
    expect(a.report).toMatchInlineSnapshot(`
      "Thanks for sending your pricing through - there is good detail here.

      ## Why this matters

      Customers get an instant quote straight from your rates.

      ## What is missing

      - Say whether your prices include GST.

      ## Needs to be clearer

      - Add a firm per-metre rate for Colorbond, glass pool fencing and rural fencing.
        - e.g. \`Colorbond 1.8m - $110/m (your figure)\`

      Add those in and send it through again."
    `);
  });

  it('stays inside the 250-word limit and reports its own length', () => {
    const built = buildRejectionReport(review);
    expect(built.reportWordCount).toBeLessThan(250);
    expect(built.missing).toHaveLength(1);
    expect(built.unclear).toHaveLength(1);
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
    const { report } = buildApprovalReport(verified, 'Your pricing is saved.');
    expect(report).toContain('Treated pine');
    expect(report).not.toContain('timber_pine');
    expect(report).toContain('| Treated pine | 1.8m | $85 |');
  });

  it('says so plainly when nothing could be verified', () => {
    const verified = verifyExtraction({ ...extraction, rates: [] }, line, 'fencing');
    const { report } = buildApprovalReport(verified, 'ignored opening');
    expect(verified.status).toBe('unverified');
    expect(report).toContain('could not match any of the rates');
  });
});
