import { describe, expect, it } from 'vitest';
import { LABELS, MESSAGES, TRADE_LABELS } from '../../src/messages.js';
import {
  CONDITIONS,
  DECK_TAGS,
  GATE_TYPES,
  KITCHEN_TAGS,
  MATERIALS,
  REMOVES,
  RW_TAGS,
  TAGS,
  TILE_TAGS,
  TRADES,
  UNITS,
} from '../../src/vocab.js';
import {
  deckingExtractionSchema,
  extractionSchema,
  kitchenExtractionSchema,
  retainingWallExtractionSchema,
  tilingExtractionSchema,
} from '../../src/schemas.js';
import type { Trade } from '../../src/vocab.js';

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

/**
 * Every closed value a trade can emit, read off its own extraction schema rather than from a list
 * kept by hand here - a hand-kept list goes stale the first time a schema gains an enum, which is
 * exactly the kind of silence this test exists to break.
 */
function enumValues(schema: unknown): string[] {
  const found = new Set<string>();
  const seen = new Set<unknown>();

  (function walk(node: unknown): void {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);

    const record = node as Record<string, unknown>;
    const def = (record._def ?? record.def) as Record<string, unknown> | undefined;

    if (def && (def.typeName === 'ZodEnum' || def.type === 'enum')) {
      const options = (record.options ?? def.entries ?? def.values) as unknown;
      const values = Array.isArray(options) ? options : Object.values((options ?? {}) as object);
      for (const value of values) if (typeof value === 'string') found.add(value);
    }

    for (const key of Object.keys(record)) walk(record[key]);
    if (def) for (const key of Object.keys(def)) walk(def[key]);
  })(schema);

  return [...found];
}

const SCHEMAS: Record<Trade, unknown> = {
  fencing: extractionSchema,
  tiling: tilingExtractionSchema,
  kitchen: kitchenExtractionSchema,
  retaining_wall: retainingWallExtractionSchema,
  decking: deckingExtractionSchema,
};

/* Tags are the one closed list with no label behind it, on purpose: they are written as words
   already (`pool-compliant`, `insured`) and they are a capability, not a priced line. */
const TAG_LISTS: Record<Trade, readonly string[]> = {
  fencing: TAGS,
  tiling: TILE_TAGS,
  kitchen: KITCHEN_TAGS,
  retaining_wall: RW_TAGS,
  decking: DECK_TAGS,
};

describe('every trade can put words to everything it emits', () => {
  /**
   * The business screen renders a slug as `labels[slug] ?? slug`, so a missing label is not an
   * error anywhere - it is the raw slug printed to the tradesperson who priced the line. Two were
   * found this way and neither had ever failed a test: tiling's whole `prep` list, and `per_hour`
   * on tiling and kitchen, whose prep rates may be charged by the hour while the shared `UNITS`
   * list carries only the four flat ones.
   */
  it.each(TRADES)('%s labels every value in its own extraction schema', (trade) => {
    const labels = TRADE_LABELS[trade];
    const tags = new Set(TAG_LISTS[trade]);

    for (const value of enumValues(SCHEMAS[trade])) {
      if (tags.has(value)) continue;
      expect(labels[value], `${trade} has no label for "${value}"`).toBeTruthy();
      expect(labels[value], `${trade}'s label for "${value}" is still a slug`).not.toContain('_');
    }
  });
});
