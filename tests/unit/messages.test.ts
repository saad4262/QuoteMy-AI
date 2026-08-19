import { describe, expect, it } from 'vitest';
import { LABELS, MESSAGES } from '../../src/messages.js';
import { CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, UNITS } from '../../src/vocab.js';

describe('fixed messages', () => {
  it('covers all three outcomes, and each one names what the buttons do', () => {
    for (const outcome of ['approved', 'nothingUsable', 'rejected'] as const) {
      expect(MESSAGES[outcome].opening.length).toBeGreaterThan(20);
      expect(MESSAGES[outcome].nextStep).toContain('contact button below');
    }
  });

  it('never speaks to the business in slugs or jargon', () => {
    const all = Object.values(MESSAGES)
      .flatMap((m) => [m.opening, m.nextStep])
      .join(' ');

    // whole words only - "confirm" is fine, "firm price" is not
    for (const banned of ['firm', 'submission', 'submit', 'compliant', 'criteria', 'onboarding']) {
      expect(all, `banned word: ${banned}`).not.toMatch(new RegExp(`\\b${banned}\\b`, 'i'));
    }
    for (const banned of ['_', '!', 'JSON', 'schema']) {
      expect(all).not.toContain(banned);
    }
  });
});

describe('labels', () => {
  it('has a human label for every value the frontend can receive', () => {
    for (const slug of [...MATERIALS, ...GATE_TYPES, ...CONDITIONS, ...REMOVES, ...UNITS]) {
      expect(LABELS[slug], `no label for ${slug}`).toBeTruthy();
      expect(LABELS[slug]).not.toContain('_');
    }
  });
});
