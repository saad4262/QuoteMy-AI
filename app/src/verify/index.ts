import type {
  AnyExtraction,
  Extraction,
  DeckingExtraction,
  HomeRenovationExtraction,
  KitchenExtraction,
  RetainingWallExtraction,
  TilingExtraction,
} from '../schemas.js';
import type { Trade } from '../vocab.js';
import { verifyFencing, type VerifiedResult as FencingResult } from './fencing.js';
import { verifyTiling, type TilingVerifiedResult } from './tiling.js';
import { verifyKitchen, type KitchenVerifiedResult } from './kitchen.js';
import { verifyRetainingWall, type RetainingWallVerifiedResult } from './retainingWall.js';
import { verifyDecking, type DeckingVerifiedResult } from './decking.js';
import { verifyHomeRenovation, type HomeRenovationVerifiedResult } from './homeRenovation.js';
import type { VerifiedCapabilities, VerifiedOffering, VerifiedPricing } from './fencing.js';
import type {
  TilingVerifiedCapabilities,
  TilingVerifiedOffering,
  TilingVerifiedPricing,
} from './tiling.js';
import type {
  KitchenVerifiedCapabilities,
  KitchenVerifiedOffering,
  KitchenVerifiedPricing,
} from './kitchen.js';
import type {
  RetainingWallVerifiedCapabilities,
  RetainingWallVerifiedOffering,
  RetainingWallVerifiedPricing,
} from './retainingWall.js';
import type {
  DeckingVerifiedCapabilities,
  DeckingVerifiedOffering,
  DeckingVerifiedPricing,
} from './decking.js';
import type {
  HomeRenovationVerifiedCapabilities,
  HomeRenovationVerifiedOffering,
  HomeRenovationVerifiedPricing,
} from './homeRenovation.js';

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
    case 'kitchen':
      return verifyKitchen(x as KitchenExtraction, sourceText, trade, knownSlugs);
    case 'retaining_wall':
      return verifyRetainingWall(x as RetainingWallExtraction, sourceText, trade, knownSlugs);
    case 'decking':
      return verifyDecking(x as DeckingExtraction, sourceText, trade, knownSlugs);
    case 'home_renovation':
      return verifyHomeRenovation(x as HomeRenovationExtraction, sourceText, trade, knownSlugs);
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
export type AnyVerifiedPricing =
  | VerifiedPricing
  | TilingVerifiedPricing
  | KitchenVerifiedPricing
  | RetainingWallVerifiedPricing
  | DeckingVerifiedPricing
  | HomeRenovationVerifiedPricing;
export type AnyVerifiedCapabilities =
  | VerifiedCapabilities
  | TilingVerifiedCapabilities
  | KitchenVerifiedCapabilities
  | RetainingWallVerifiedCapabilities
  | DeckingVerifiedCapabilities
  | HomeRenovationVerifiedCapabilities;
export type AnyVerifiedOffering =
  | VerifiedOffering
  | TilingVerifiedOffering
  | KitchenVerifiedOffering
  | RetainingWallVerifiedOffering
  | DeckingVerifiedOffering
  | HomeRenovationVerifiedOffering;
export type VerifiedResult =
  | FencingResult
  | TilingVerifiedResult
  | KitchenVerifiedResult
  | RetainingWallVerifiedResult
  | DeckingVerifiedResult
  | HomeRenovationVerifiedResult;

/**
 * Which shape this is, decided by a field only one of them has.
 *
 * Keyed on `enabledMaterials` / `enabledJobTypes` / `enabledKitchenSizes` / `enabledWallTypes`
 * rather than on a stored `trade` field, because
 * these are read back out of Firestore where a document can be older than the code. A missing
 * discriminant would silently pick a branch; a missing list cannot.
 *
 * The names have to stay DISTINCT, and retaining wall is where that nearly went wrong: a wall is
 * built of timber or concrete and `enabledMaterials` was the obvious name for its list, which would
 * have made every retaining wall document answer true to `isFencingPricing` and be priced as a
 * fence. `tests/unit/verifyRetainingWall.test.ts` asserts the negative for exactly that reason.
 */
export const isFencingPricing = (p: AnyVerifiedPricing): p is VerifiedPricing =>
  Array.isArray((p as VerifiedPricing).enabledMaterials);

export const isTilingPricing = (p: AnyVerifiedPricing): p is TilingVerifiedPricing =>
  Array.isArray((p as TilingVerifiedPricing).enabledJobTypes);

export const isKitchenPricing = (p: AnyVerifiedPricing): p is KitchenVerifiedPricing =>
  Array.isArray((p as KitchenVerifiedPricing).enabledKitchenSizes);

export const isRetainingWallPricing = (p: AnyVerifiedPricing): p is RetainingWallVerifiedPricing =>
  Array.isArray((p as RetainingWallVerifiedPricing).enabledWallTypes);

export const isDeckingPricing = (p: AnyVerifiedPricing): p is DeckingVerifiedPricing =>
  Array.isArray((p as DeckingVerifiedPricing).enabledDeckMaterials);

/* `enabledRooms`, and NOT `enabledJobTypes`. A renovation has job types exactly as tiling does, and
   it was the obvious name for this list - which is the same trap retaining wall nearly fell into
   with `enabledMaterials`. Reusing tiling's name would have made every renovation document answer
   true to `isTilingPricing` and be priced per square metre against a tile that does not exist.
   `tests/unit/verifyHomeRenovation.test.ts` asserts all five negatives for exactly that reason. */
export const isHomeRenovationPricing = (p: AnyVerifiedPricing): p is HomeRenovationVerifiedPricing =>
  Array.isArray((p as HomeRenovationVerifiedPricing).enabledRooms);

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

export type {
  KitchenRate,
  KitchenVerifiedCapabilities,
  KitchenVerifiedOffering,
  KitchenVerifiedPricing,
  KitchenVerifiedResult,
} from './kitchen.js';

export type {
  DeckRate,
  DeckingVerifiedCapabilities,
  DeckingVerifiedOffering,
  DeckingVerifiedPricing,
  DeckingVerifiedResult,
} from './decking.js';

export type {
  RenoRate,
  HomeRenovationVerifiedCapabilities,
  HomeRenovationVerifiedOffering,
  HomeRenovationVerifiedPricing,
  HomeRenovationVerifiedResult,
} from './homeRenovation.js';

export type {
  RwRate,
  RetainingWallVerifiedCapabilities,
  RetainingWallVerifiedOffering,
  RetainingWallVerifiedPricing,
  RetainingWallVerifiedResult,
} from './retainingWall.js';
