import { describe, expect, it } from 'vitest';
import { buildRejectionReport } from '../../src/report.js';
import { buildApprovalReport } from '../../src/report.js';
import { verifyExtraction } from '../../src/verify.js';
import type { Extraction } from '../../src/schemas.js';

const review = {
  approved: false,
  opening: 'I have been through the details you sent. A few numbers are still needed before your profile can go live.',
  whyUpdatesNeeded: 'Customers get an instant quote from your rates, so a range or "POA" keeps you out of their results.',
  fixes: [
    { kind: 'unclear' as const, what: 'Add a firm per-metre rate for Colorbond, glass pool fencing and rural fencing.', example: 'Colorbond 1.8m - $110/m (your figure)' },
    { kind: 'missing' as const, what: 'Say whether your prices include GST.', example: null },
  ],
};

describe('rejection report', () => {
  it('is assembled by code in a fixed order, so it never varies between runs', () => {
    const a = buildRejectionReport(review);
    const b = buildRejectionReport(review);
    expect(a.report).toBe(b.report);
    expect(a.report).toMatchInlineSnapshot(`
      "I have been through the details you sent. A few numbers are still needed before your profile can go live.

      ## Why this matters

      Customers get an instant quote from your rates, so a range or "POA" keeps you out of their results.

      ## What we still need

      1. Say whether your prices include GST.

      ## What needs to be clearer

      2. Add a firm per-metre rate for Colorbond, glass pool fencing and rural fencing.
         - e.g. \`Colorbond 1.8m - $110/m (your figure)\`

      ## What to do next

      Update your details and send them through again for approval. If something above does not look right, use the contact button below and one of our team will go through it with you."
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
