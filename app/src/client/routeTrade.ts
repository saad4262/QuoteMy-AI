import { TRADE_WORDS } from '../messages.js';
import type { Trade } from '../vocab.js';
import type { ChatOption, ChatResponse, Checklist } from './schemas.js';

/**
 * Which trade a conversation is about, decided before anything else in the turn.
 *
 * The frontend can say, and when it does it wins - a customer who arrived through a "get tiling
 * quotes" page has already answered this. But the chat must not DEPEND on that: one shared entry
 * point, a link somebody pasted, a voice call, or a picker that was never built all arrive with
 * nothing, and answering "what type of fence are you after?" to somebody asking about their
 * bathroom is the kind of wrong that ends the conversation.
 *
 * So: what the caller said, then what this conversation already settled, then the customer's own
 * words, and only if all three are silent do we ask. Asking is the last resort rather than the
 * first move, because most people say what they want in their opening sentence.
 */

/**
 * The words that name a trade.
 *
 * Deliberately generous on the things only one trade ever says - a bathroom is not a fencing job,
 * a paling is not a tiling one - and deliberately silent on the words both trades use. "wall",
 * "pool" and "outdoor" appear in both and name neither, so they are absent: a keyword that fires
 * for both is worse than no keyword at all, because it turns a clear message into an ambiguous one.
 *
 * Matched on word boundaries so "tiles" finds "tile" but "gates" never finds "gat".
 */
export const TRADE_KEYWORDS: Record<Trade, RegExp> = {
  fencing:
    /\b(fenc(?:e|es|ing|er|ers)|paling|palings|boundary|colou?rbond|gate|gates|picket|pickets|chainmesh|chain\s?wire|post\s?and\s?rail)\b/i,
  tiling:
    /\b(tile|tiles|tiling|tiler|tilers|retile|retiling|bathroom|bathrooms|ensuite|laundry|splashback|splashbacks|grout|regrout|regrouting|mosaic|porcelain|ceramic|terrazzo|waterproof|waterproofing|screed|screeding|floor|floors|flooring|shower)\b/i,
};

export interface TradeRouting {
  /** Null means nobody has said and the customer's words did not settle it. */
  trade: Trade | null;
  /** How it was decided, for the log - a routing that goes wrong is invisible without this. */
  by: 'caller' | 'session' | 'keywords' | 'only-trade' | 'unresolved';
  /** More than one trade's words in one message: "a fence, and the bathroom retiled". */
  ambiguous: boolean;
}

/**
 * Which trades this message names. Zero or two or more is not an answer, and both go to the
 * question - a customer who mentioned a fence AND a bathroom has told us they want two jobs, and
 * guessing which one they meant first is worse than spending a turn asking.
 */
export function detectTrade(message: string, published: readonly Trade[]): Trade[] {
  return published.filter((trade) => TRADE_KEYWORDS[trade].test(message));
}

export function routeTrade(
  message: string,
  fromCaller: Trade | undefined,
  settled: Trade | undefined,
  published: readonly Trade[],
): TradeRouting {
  // The frontend picked one, or the customer arrived through that trade's own entry point.
  if (fromCaller && published.includes(fromCaller)) return { trade: fromCaller, by: 'caller', ambiguous: false };

  /* Already decided earlier in this conversation, and never revisited. Without this, "the old
     fence is coming out" three questions into a tiling job would re-route the whole conversation
     mid-flight and throw away everything already answered. */
  if (settled && published.includes(settled)) return { trade: settled, by: 'session', ambiguous: false };

  // One trade live means there is nothing to ask about, whatever the words say.
  if (published.length === 1) return { trade: published[0]!, by: 'only-trade', ambiguous: false };

  const matched = detectTrade(message, published);
  if (matched.length === 1) return { trade: matched[0]!, by: 'keywords', ambiguous: false };

  return { trade: null, by: 'unresolved', ambiguous: matched.length > 1 };
}

/** Title case for a sentence: "fencing" -> "Fencing". */
const proper = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * The one question this router is allowed to ask.
 *
 * Built from what is actually published rather than from a fixed sentence, so a third trade is
 * offered here the day its schema exists and this file is not touched.
 */
export function askWhichTrade(
  sessionId: string,
  published: readonly Trade[],
  known: Partial<Checklist>,
  ambiguous: boolean,
): ChatResponse {
  const names = published.map((trade) => proper(TRADE_WORDS[trade].trade));
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1] : (names[0] ?? '');

  const options: ChatOption[] = published.map((trade) => ({
    label: proper(TRADE_WORDS[trade].trade),
    value: trade,
  }));

  return {
    sessionId,
    /* Null, and this is the one turn where it is honest: nothing has answered yet. Everywhere else
       it is the trade that actually produced the reply. */
    trade: null,
    intent: 'new_quote',
    place: null,
    type: 'question',
    message: ambiguous
      ? `Sounds like there might be more than one job there — are you looking for ${list} services?`
      : `Are you looking for ${list} services?`,
    options,
    /* Nothing is recorded from this turn. The checklist comes back exactly as it went out, so a
       customer who answers with "tiling, and it's in Berwick" loses nothing by having been asked. */
    checklistComplete: false,
    checklist: (known as Checklist) ?? ({} as Checklist),
    checklistDisplay: {},
    checklistAnswered: [],
    checklistPending: [],
    results: [],
    avgRatePerMeter: null,
  };
}

/**
 * The settled trade, written into the state the client echoes back next turn.
 *
 * Only when there is a `_ui` to write it into. A turn that produced none - an error shape, or a
 * response built before the checklist existed - is left exactly as it was rather than growing a
 * `_ui` it never had.
 */
export function rememberTrade(response: ChatResponse, trade: Trade): ChatResponse {
  const ui = response.checklist?._ui;
  if (!ui) return response;
  return { ...response, checklist: { ...response.checklist, _ui: { ...ui, trade } } };
}
