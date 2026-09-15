import { TRADE_WORDS } from '../messages.js';
import type { Trade } from '../vocab.js';
import type { ChatOption, ChatResponse, Checklist, UiState } from './schemas.js';

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
  /**
   * The trade whose rooms all belong to somebody else, and whose own word belongs to nobody.
   *
   * `renovate`, `renovation`, `remodel` and `reno` name nothing else in the product and carry this
   * trade on their own. What this trade may NOT claim is a ROOM: `bathroom`, `ensuite` and `laundry`
   * are tiling's and have been since before this trade existed, and `kitchen` is the kitchen
   * trade's. Claiming them here would make every "retile the bathroom" ambiguous, which the comment
   * at the top of this table already says is worse than matching nothing at all.
   *
   * The rooms that ARE here are the ones nobody else wants - a bedroom, a living or dining room, a
   * hallway, a home office - plus `open plan` and `whole house`, which name a renovation and
   * nothing else. Measured against the five regexes above, ten of fifteen real renovation phrasings
   * previously matched NOTHING and fell through to "which service?"; these are those ten.
   *
   * The four that matched the WRONG trade - "bathroom renovation", "renovate my bathroom", "kitchen
   * renovation" - are settled by `detectTrade`'s precedence rule below, not here. A negative
   * lookahead on tiling would fix "bathroom renovation" and could never fix "renovate my bathroom",
   * where the verb comes first.
   *
   * Left out deliberately: `painting`, `flooring` and `tiling` (all three are half of what a tiler
   * or a painter writes, and two are tiling's already), `wall` (tiling's and retaining wall's),
   * `doors`, `ceiling`, `benchtop` and `cabinetry` (the kitchen trade's), `carpentry` and `builder`
   * (too broad to name any one trade), and `deck` and `pergola`, which this business does sell but
   * which decking names better.
   */
  home_renovation:
    /\b(?:renovat(?:e|es|ed|ing|ion|ions|or|ors)|remodel(?:s|ling|led)?|renos?|(?:bed|living|dining|family|rumpus)\s?rooms?|hallways?|home\s?office|open[-\s]?plan|whole[-\s]?(?:house|home)|plaster(?:ing|board)?|cornices?|skirting\s?boards?|architraves?|stud\s?walls?|partition\s?walls?)\b/i,
};

/**
 * The scope word that outranks a room word.
 *
 * A tiler works in bathrooms and a kitchen fitter works in kitchens, so "bathroom" and "kitchen"
 * genuinely belong to those trades - but somebody who says they are RENOVATING one is describing
 * the whole room coming out and going back in, which is this trade and not either of them.
 *
 * Kept as a precedence rule here rather than as negative lookaheads on tiling and kitchen, for two
 * reasons. A lookahead can only see what follows the room word, so `bathroom(?!\s+renovat)` catches
 * "bathroom renovation" and can never catch "renovate my bathroom" - and the verb-first phrasing is
 * the commoner one. And this way the five regexes above are untouched, so no existing routing can
 * move.
 */
const RENOVATING = /\b(?:renovat\w*|remodel\w*|renos?)\b/i;

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
  const matched = published.filter((trade) => TRADE_KEYWORDS[trade].test(message));

  /* The one tie-break in this file, and it is deliberately narrow: it drops TILING and KITCHEN, and
     only when the customer has said in so many words that they are renovating.

     "Renovate my bathroom" names a room that is genuinely tiling's and a scope that is genuinely
     this trade's, and before this rule it matched both and spent a turn asking which - to somebody
     who had already said exactly what they wanted. Scope wins because it is the larger statement:
     a renovation includes the tiling, and a tiler cannot do the rest of it.

     The other three trades are NOT dropped, and that is not an oversight. "Renovate my deck" is
     genuinely ambiguous - this business does sell decks and so does a deck builder - and "a fence
     and a renovation" is two jobs. Both should keep going to the question, which is what happens
     when two trades are still matched. */
  if (!matched.includes('home_renovation') || !RENOVATING.test(message)) return matched;
  return matched.filter((trade) => trade !== 'tiling' && trade !== 'kitchen');
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

/**
 * A customer asking to change the TRADE, not to correct an answer inside it.
 *
 * This is the escape hatch `routeTrade` has never had. The `settled` check above is deliberate and
 * stays - re-routing on a stray word mid-conversation would throw away everything answered - but
 * without a way out, a customer who picked the wrong service at the start was stuck in it for ever.
 * Saying "i want fencing" three questions into a renovation did nothing at all: the words were read
 * and discarded, and nothing told them why.
 *
 * THE PATTERN IS ABOUT CHANGING, NOT ABOUT NAMING. That distinction is the whole safety of this:
 * "the old fence is coming out" names a trade and must never fire, because it is a sentence about
 * the job in hand. "I want to change the service" is about the conversation itself and can mean
 * nothing else. So every branch below needs a verb of changing or a word of being wrong - never a
 * trade name on its own.
 *
 * And nothing is cleared on a match. It asks first (`askToChangeTrade`), so a false positive costs
 * one turn and never an answer.
 */
const CHANGE_TRADE =
  /\b(?:change|switch|swap|pick|choose|select)\s+(?:the\s+|my\s+|a\s+|to\s+a\s+)?(?:different\s+|another\s+|other\s+)?(?:trade|service|category|job\s?type\s+of\s+work)\b|\b(?:wrong|different|another)\s+(?:trade|service|category)\b|\bnot\s+(?:the\s+)?(?:right|correct)\s+(?:trade|service)\b|\bstart\s+(?:over|again)\b|\bwrong\s+one\s+by\s+mistake\b/i;

/**
 * The second way in, and the one the customer actually tried first: naming a different trade
 * outright. "i want fencing", three questions into a renovation.
 *
 * This is only safe BECAUSE of the confirmation turn. Naming a trade is exactly what the `settled`
 * lock exists to ignore - "the old fence is coming out" names fencing and is a sentence about the
 * job in hand - so firing on a bare trade name would be the old bug back again. What separates them
 * is the ASKING SHAPE: a message that opens "I want", "I need", "actually, can I get" is addressed
 * to us about what they are buying. A message describing the site is not.
 *
 * And it must name a DIFFERENT trade. "I want a gate as well" inside a fencing job names fencing,
 * matches the opener, and must go nowhere near this.
 */
const WANTS = /^\s*(?:actually,?\s*)?(?:i\s+(?:want|need|wanted)|can\s+i\s+(?:get|have)|give\s+me|looking\s+for)\b/i;

export const asksToChangeTrade = (
  message: string,
  current?: Trade,
  published: readonly Trade[] = [],
): boolean => {
  if (CHANGE_TRADE.test(message)) return true;
  if (!current || !WANTS.test(message)) return false;
  const named = detectTrade(message, published);
  return named.length === 1 && named[0] !== current;
};

/**
 * The checklist a customer starts the new trade with: empty of ANSWERS, but not of memory.
 *
 * `_ui.history` is the trap here, and it is why this is a named helper rather than `{}` at the call
 * site. The conversation transcript lives INSIDE `_ui` (`schemas.ts`), so the obvious way to do this
 * - throw the checklist away - also throws away every word either side has said. The customer would
 * change trade and find the assistant had forgotten the conversation they were in the middle of.
 *
 * So: every answer goes, the settled trade goes, the cursor and the last-asked state go. The
 * history stays, and so does the geocoded place hint - a customer who has already told us their
 * suburb through the Google picker should not have to find it again to change service.
 */
export function clearForTradeChange(known: Partial<Checklist>): Partial<Checklist> {
  const ui = known._ui;
  return {
    _ui: {
      ...(ui as UiState),
      trade: undefined,
      turn: ui?.turn ?? 0,
      cursor: {},
      lastAsked: null,
      lastQuestion: '',
      lastValues: [],
      fixing: false,
      /* Kept, deliberately - see above. Everything else about the old trade is gone; what was SAID
         is not the old trade's, it is the customer's. */
      history: ui?.history ?? [],
    } as UiState,
  };
}

/**
 * The one turn that stands between a customer and losing their answers.
 *
 * Deliberately a QUESTION and not an action. `asksToChangeTrade` is a regex over free text, and a
 * regex over free text is wrong sometimes - so nothing is cleared until somebody says yes, and a
 * false positive costs one turn instead of a filled-in brief. It also names what will be lost,
 * because "changed my mind" and "throw away the six answers I just gave you" are not the same
 * intention and the customer is the only one who knows which they meant.
 *
 * The current trade is named in the question rather than left implicit: a customer who typed
 * something ambiguous needs to see what they are actually on before they answer.
 */
export function askToChangeTrade(
  sessionId: string,
  current: Trade,
  known: Partial<Checklist>,
): ChatResponse {
  const words = TRADE_WORDS[current];
  return {
    sessionId,
    trade: current,
    intent: 'new_quote',
    place: null,
    type: 'question',
    message:
      `You're getting quotes for ${words.trade} at the moment. Do you want to change that? ` +
      `Your answers so far would be cleared.`,
    options: [
      { label: 'Yes, change it', value: 'trade-change:yes' },
      { label: 'No, carry on', value: 'trade-change:no' },
    ],
    checklistComplete: false,
    /* Echoed back UNCHANGED apart from the marker. Nothing is cleared on this turn - that is the
       whole point of it - so a customer who answers "no" is exactly where they were. */
    checklist: {
      ...(known as Checklist),
      _ui: { ...(known._ui as UiState), lastAsked: 'trade-change', lastQuestion: 'change trade?' },
    },
    checklistDisplay: {},
    checklistAnswered: [],
    checklistPending: [],
    results: [],
    avgRatePerMeter: null,
    unit: null,
  };
}
