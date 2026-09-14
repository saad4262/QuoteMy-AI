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
  /* `boundary` carries a negative lookahead for the same reason kitchen's own noun does, and it was
     added when retaining wall arrived: "boundary retaining walls" is a line on a wall builder's own
     service list, so a bare `boundary` made that phrase match two trades and sent a customer who
     had said exactly what they wanted to the "which one?" question. "Boundary fence" still reaches
     fencing, and "a boundary fence and a retaining wall" still correctly matches both. */
  fencing:
    /\b(fenc(?:e|es|ing|er|ers)|paling|palings|boundary(?!\s+retaining)|colou?rbond|gate|gates|picket|pickets|chainmesh|chain\s?wire|post\s?and\s?rail)\b/i,
  tiling:
    /\b(tile|tiles|tiling|tiler|tilers|retile|retiling|bathroom|bathrooms|ensuite|laundry|splashback|splashbacks|grout|regrout|regrouting|mosaic|porcelain|ceramic|terrazzo|waterproof|waterproofing|screed|screeding|floor|floors|flooring|shower)\b/i,
  /**
   * The one trade whose own noun belongs to another trade half the time.
   *
   * "Kitchen splashback", "kitchen floor tiles", "tiling the kitchen" are all TILING jobs that say
   * "kitchen", and tiling has published `kitchen_splashback` as a job type since before this trade
   * existed. So the bare word is excluded when it is qualifying a tiled surface, and the specific
   * nouns - cabinetry, benchtop, flat-pack - carry the trade on their own. A message that names a
   * kitchen AND a tiling job still matches both and is correctly sent to the question: somebody
   * saying "new kitchen and retile the bathroom" wants two jobs.
   *
   * What is left out matters as much: no bare `bench`, because a fencer's rails are benched and a
   * garden bench is not a kitchen, and no `install`, which is in half of what anybody writes.
   */
  kitchen:
    /\b(?:kitchens?\b(?!\s+(?:splash\s?backs?|floors?|walls?|tiles?|tiling|retile))|cabinetry|cabinets?|cabinetmakers?|bench\s?tops?|kickboards?|flat\s?packs?|cupboards?|pantry|joinery)\b/i,
  /**
   * The trade that cannot have its own noun, because half of it belongs to somebody else.
   *
   * `wall` is absent and must stay absent - it is tiling's as much as this trade's, and the comment
   * at the top of this table already records that a keyword firing for two trades is worse than no
   * keyword at all. What carries this trade is the COMPOUND: "retaining wall" names nothing else in
   * the product, and neither does "sleeper wall" or "besser block".
   *
   * `sleepers` is qualified rather than bare. A bare `sleeper` is a railway sleeper in a garden bed,
   * a decking substructure and a bed - "timber sleepers" and "concrete sleepers" are unambiguous and
   * are what people actually type. `pine sleepers` and `treated pine sleepers` were added when a
   * routing test found them reaching nothing at all: they are the commonest words for the cheapest
   * wall this trade builds, and decking cannot take them because its own timbers stay compound with
   * the word "deck".
   *
   * Left out deliberately: `batter` (a cooking word before it is an earthworks one), `excavation`
   * and `drainage` (both are half of what a landscaper, a plumber or a builder writes), `garden bed`
   * (it is landscaping far more often than it is a wall), and `boundary` (fencing's, narrowed above
   * rather than claimed here).
   */
  retaining_wall:
    /\b(?:retaining\s?walls?|retainer\s?walls?|sleeper\s?walls?|besser\s?blocks?|ag(?:gi|gie)?[-\s]?pipes?|soil\s?retention|tiered\s?(?:wall|garden)s?|(?:timber|concrete|hardwood|treated\s?pine|pine)\s+sleepers?)\b/i,
  /**
   * The one trade whose own noun is completely its own, and whose MATERIALS belong to everybody.
   *
   * `deck` and `decking` carry this trade on their own - no other trade in the product uses the
   * word, and "pool deck", "front deck" and "deck stairs" all reach it correctly.
   *
   * What must stay COMPOUND is every board: `merbau`, `spotted gum`, `treated pine`, `blackbutt`
   * and `jarrah` are all fencing materials too, and `merbau` is a retaining wall's `premium_timber`
   * as well. "Merbau fence" and "merbau deck" are two different jobs and the only thing telling
   * them apart is the noun beside the timber. Bare `composite` is worse again - a composite
   * balustrade, a composite screen and a composite sleeper are three trades.
   *
   * `balustrade` is claimed bare, and it is safe: it names a deck railing and no other trade in the
   * product prices one. `decking` also covers `deck builder` and `deck board` for free.
   *
   * Left out deliberately: `stairs` (a retaining wall has them and so does a house), `screens`
   * (fencing sells privacy screens), `pergola` (sold by three trades), and `timber` on its own,
   * which four trades use.
   */
  decking:
    /\b(?:decks?|decking|deck\s?builders?|balustrades?|(?:merbau|spotted\s?gum|blackbutt|jarrah|treated\s?pine|composite|pvc)\s+deck(?:ing|s)?)\b/i,
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
    /* The one turn with no trade behind it, so there is nothing for a rate to be per. */
    unit: null,
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
