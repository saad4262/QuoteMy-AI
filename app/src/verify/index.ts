import type { Extraction } from '../schemas.js';
import type { Trade } from '../vocab.js';
import { verifyFencing, type VerifiedResult } from './fencing.js';

/**
 * Verification, by trade.
 *
 * Every trade runs the same three gates (`shared.ts`) over a different shape. Which verifier runs
 * is decided here and nowhere else, so `pipeline.ts` stays one straight line: ingest -> review ->
 * extract -> verify -> store, with no branch for the model to choose and none for a caller to
 * forget.
 *
 * The dispatch is exhaustive on purpose. A trade added to `TRADES` with no verifier is a compile
 * error here, not a submission that reaches a customer half-checked.
 */
export function verifyExtraction(
  x: Extraction,
  sourceText: string,
  trade: Trade,
  knownSlugs: readonly string[] = [],
): VerifiedResult {
  switch (trade) {
    case 'fencing':
      return verifyFencing(x, sourceText, trade, knownSlugs);
  }
}

export type {
  VerifiedCapabilities,
  VerifiedOffering,
  VerifiedPricing,
  VerifiedResult,
  VerifiedSpec,
} from './fencing.js';
