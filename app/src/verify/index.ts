import type { AnyExtraction, Extraction, TilingExtraction } from '../schemas.js';
import type { Trade } from '../vocab.js';
import { verifyFencing, type VerifiedResult as FencingResult } from './fencing.js';
import { verifyTiling, type TilingVerifiedResult } from './tiling.js';
import type { VerifiedCapabilities, VerifiedOffering, VerifiedPricing } from './fencing.js';
import type {
  TilingVerifiedCapabilities,
  TilingVerifiedOffering,
  TilingVerifiedPricing,
} from './tiling.js';

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
    case 'tiling':
      return verifyTiling(x as TilingExtraction, sourceText, trade, knownSlugs);
  }
}

/**
 * What a verified submission looks like, whatever trade produced it.
 *
 * A union rather than a common interface, because the shapes genuinely differ and pretending
 * otherwise is how a tiling rate ends up being read as a fencing one. Anything reading these
 * narrows on `trade` first - `isFencingPricing` and `isTilingPricing` below are the honest way to
 * do that at a boundary where the value came out of Firestore.
 */
export type AnyVerifiedPricing = VerifiedPricing | TilingVerifiedPricing;
export type AnyVerifiedCapabilities = VerifiedCapabilities | TilingVerifiedCapabilities;
export type AnyVerifiedOffering = VerifiedOffering | TilingVerifiedOffering;
export type VerifiedResult = FencingResult | TilingVerifiedResult;

/**
 * Which shape this is, decided by a field only one of them has.
 *
 * Keyed on `enabledMaterials` / `enabledJobTypes` rather than on a stored `trade` field, because
 * these are read back out of Firestore where a document can be older than the code. A missing
 * discriminant would silently pick a branch; a missing list cannot.
 */
export const isFencingPricing = (p: AnyVerifiedPricing): p is VerifiedPricing =>
  Array.isArray((p as VerifiedPricing).enabledMaterials);

export const isTilingPricing = (p: AnyVerifiedPricing): p is TilingVerifiedPricing =>
  Array.isArray((p as TilingVerifiedPricing).enabledJobTypes);

export type {
  VerifiedCapabilities,
  VerifiedOffering,
  VerifiedPricing,
  VerifiedSpec,
} from './fencing.js';

export type {
  TileRate,
  TilingVerifiedCapabilities,
  TilingVerifiedOffering,
  TilingVerifiedPricing,
  TilingVerifiedResult,
} from './tiling.js';
