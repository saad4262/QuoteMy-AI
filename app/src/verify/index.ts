import type { AnyExtraction, Extraction } from '../schemas.js';
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
 *
 * The narrowing is a cast, and re-parsing with the trade's schema instead was tried and is WRONG.
 * Gate 1 - the vocabulary re-check inside each verifier - exists precisely to catch a value the
 * schema should have made impossible, and to report it to the business as "we could not file a rate
 * under that". Re-parsing here turns that graceful line into a thrown error that fails the whole
 * submission, which is the opposite of what the gate is for. `tests/unit/verify.test.ts` feeds an
 * invented material on purpose and is what caught it.
 */
export function verifyExtraction(
  x: AnyExtraction,
  sourceText: string,
  trade: Trade,
  knownSlugs: readonly string[] = [],
): VerifiedResult {
  switch (trade) {
    case 'fencing':
      return verifyFencing(x as Extraction, sourceText, trade, knownSlugs);
  }
}

export type {
  VerifiedCapabilities,
  VerifiedOffering,
  VerifiedPricing,
  VerifiedResult,
  VerifiedSpec,
} from './fencing.js';
