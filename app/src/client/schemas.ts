import { z } from 'zod';
import type { ChecklistField } from './vocab.js';

/**
 * The request body for one turn of the fencing quote chat.
 *
 * `place` and `knownChecklist` arrive from the client as JSON text, not parsed objects - same
 * convention as n8n's `Normalize Input`, and the same reason: a malformed value should fail
 * gracefully (treated as "nothing sent yet") rather than reject the whole request. Parsing happens
 * once, in `controller.ts`.
 */
export const chatBody = z.object({
  message: z.string().default(''),
  sessionId: z.string().trim().min(1),
  place: z.string().default(''),
  knownChecklist: z.string().default(''),
});
export type ChatBody = z.infer<typeof chatBody>;

/**
 * The LLM's contract for one turn. This is the whole job the model has: read the customer's
 * message and report which known field(s) it answers. It does not pick the next question, does
 * not invent multiple-choice options, and does not write the customer-facing sentence - all of
 * that is decided in `mergeAndDecide.ts` and `formatResult.ts`. Every field is `.nullable()`
 * rather than `.optional()` (strict json_schema requires every key in `required`), matching the
 * convention in `../schemas.ts`.
 */
const turnChecklistSchema = z.object({
  material: z.string().nullable(),
  heightKey: z.string().nullable(),
  lengthMeters: z.number().nullable(),
  removal: z.string().nullable(),
  /** `null` = not addressed this turn. `[]` = the customer said there's nothing tricky. */
  conditions: z.array(z.string()).nullable(),
  gateType: z.string().nullable(),
  gateQty: z.number().nullable(),
  existingPrice: z.number().nullable(),
});

export const turnExtractionSchema = z.object({
  /** 2-4 words, casual, never a question or a value. Empty string when there's nothing to acknowledge. */
  ack: z.string(),
  checklist: turnChecklistSchema,
  /** Field names the customer is explicitly correcting - only honoured while `fixing` mode is on. */
  clearFields: z.string().array(),
  /** Raw place text mentioned in passing - a head start for the picker, NEVER checklist.suburb. */
  suggestedSuburb: z.string().nullable(),
  wantsMoreOptions: z.boolean(),
  /** True only if the previous turn was the full-brief recap and the customer just agreed to it. */
  confirmed: z.boolean(),
  /**
   * What they sent - typed, or attached - is plainly about something that is not a fence. The
   * model judges it because that is a reading task; what happens next is decided in code, and
   * only when nothing else about the turn landed.
   */
  offTopic: z.boolean(),
  /**
   * A question the customer asked, in their own words, when they asked one instead of - or as well
   * as - answering the question on screen. "my fence has blown over, what do I do", "is Colorbond
   * better than timber", "what's Colorbond going for".
   *
   * Null on the overwhelming majority of turns. This is the model reporting that a question was
   * asked, never answering it: the answer is a separate call with a search behind it, because
   * anything this one wrote would be from memory and about a country and a year it cannot check.
   */
  askedAbout: z.string().nullable(),
  /**
   * Which kind, because each is answered differently: 'rates' goes looking for what Australian
   * sites list and is hedged accordingly, 'looks' comes back as photographs rather than prose, and
   * 'advice' is everything else about fencing.
   */
  /**
   * A fence type the customer named that the trade vocabulary has no slug for - "tubular steel",
   * "bamboo screening", "wrought iron".
   *
   * The list they are offered is what businesses near them actually publish rates against, and it
   * is short. Somebody who names something else has not misspoken and is not being difficult: half
   * the fences sold in Australia are not on it. Telling them "sorry, I didn't catch that" is a lie
   * and a dead end, so it is taken as their answer - and the search for a business to do it comes
   * back empty at the end, which is the honest place to find that out.
   *
   * Reported here rather than read out of the sentence in code, because picking the fence type out
   * of "okay okay, please select the tubular steel" is reading, which is what the model is for.
   * What code decides is whether it is allowed in - see `mergeAndDecide`.
   */
  namedOffList: z.string().nullable(),
  askedKind: z.enum(['advice', 'rates', 'looks']).nullable(),
});
export type TurnExtraction = z.infer<typeof turnExtractionSchema>;

// ---------------------------------------------------------------------------------------------
// Wire types. These are the response shape the React client is already built against
// (MESSAGE-TO-CLIENT-DEV.md / CLIENT-UI-CHANGES.md) - preserved field-for-field, not redesigned.

export type Removal = 'timber' | 'metal' | 'none';
export type GateChoice = string | 'none';

/**
 * Persisted by round-tripping through the client, not on the server - see `CLIENT-UI-CHANGES.md`
 * §1. The client sends this back verbatim inside `checklist._ui` every turn, never displaying or
 * editing it. This is the entire session-state mechanism; there is no server-side session store.
 */
export interface UiState {
  turn: number;
  cursor: Record<string, number>;
  lastAsked: ChecklistField | 'alternative' | null;
  lastQuestion: string;
  lastValues: (string | number)[];
  lastType: 'message' | 'question' | 'confirmation' | 'result';
  fixing: boolean;
  rejectedPlaces: string[];
  nearbyPlaces: Record<string, PlaceHint>;
  suburbHint: string | null;
  /**
   * The confirmed suburb, carried so the picker only has to answer once. `isMissing('suburb')`
   * tests the geocoded place object, not the display string in `checklist.suburb` - so without
   * this, a client that sent `place` on the turn it was picked and not afterwards had the suburb
   * question come back on the very next message.
   */
  place: Place | null;
  /**
   * How many questions this conversation has had answered from a search. Capped, because each one
   * costs money and the per-session rate limit allows forty messages a minute - which without a
   * ceiling is a dollar a minute from one browser tab.
   */
  answers: number;
  /**
   * A guide range the customer tapped off a rates answer, carried so the results screen can show
   * what the web said next to what the businesses actually quoted. Absent until they tap one, and
   * it changes nothing about which businesses are shown or what they cost.
   */
  budget?: Budget;
}

export interface PlaceHint {
  latitude: number;
  longitude: number;
  suburb: string;
  state: string | null;
  postcode: string | null;
  displayLabel: string;
}

/** A real, geocoded place - only ever produced by the client's Google-Places-style picker. */
export interface Place {
  placeId?: string | null;
  displayLabel?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  name?: string | null;
  latitude: number;
  longitude: number;
}

/**
 * Whatever this trade's fields are, plus the session state. Untyped on purpose: the field set is
 * published per trade, so naming fencing's keys here would make a second trade a code change -
 * which is the whole thing this migration removes. `_ui` stays typed because it is ours, not the
 * trade's, and every one of its fields exists to stop a bug the comments describe.
 */
export type Checklist = Record<string, unknown> & { _ui?: UiState };

export interface ChatOption {
  label: string;
  value: string | number;
}

/**
 * What a site's figure works out to per metre, read out of `figure` in code.
 *
 * A guide, never a price: it is shown beside the real quotes on the results screen and takes no
 * part in producing them. See `budget.ts` for why it must never reach `existingPrice`.
 */
export interface Budget {
  perMetreMin: number;
  perMetreMax: number;
  /** The site it came from, as a person would say it. Null if the chip lost it in transit. */
  source: string | null;
}

/**
 * One photo from an image search, shown so they can see what something looks like.
 *
 * Not ours, not stored, and found fresh every time - so `sourceName` is displayed with each one.
 * What the customer is looking at is an example off the web, never a job this marketplace did.
 *
 * Nothing here is tappable. A picture never becomes an option, a checklist value or a price - the
 * same rule the web rate figures live under, and for the same reason.
 */
export interface AnswerImage {
  /** The full-size image, on whoever's site it lives. */
  url: string;
  /** Google's own cached thumbnail. Smaller and steadier than the original - render this one. */
  thumbUrl: string;
  /** The site it is on, as a person would say it. Shown under the photo; never a URL. */
  sourceName: string;
  width: number;
  height: number;
}

/** One site an answer leaned on, and what it said. */
export interface AnswerSource {
  /** As a person would say it - "hipages", "Yellow Pages". Never a URL: this is read aloud. */
  name: string;
  /** What that site listed, in its own terms: "$85 to $100 a metre installed". Null for advice. */
  figure: string | null;
  /** `figure` as numbers, parsed in code - the model never does arithmetic (`CONTEXT.md` §4). */
  perMetreMin: number | null;
  perMetreMax: number | null;
  /**
   * Send this back as the turn's `message` to compare the quotes against this site's range. Null
   * when the site gave no per-metre figure, which is every source on an advice question.
   */
  budgetValue: string | null;
  /**
   * Only when the provider actually cited that page. Usually null, and that is not a fault: a
   * search answer routinely names five sites off the results and annotates one. A URL guessed to
   * fill the gap would be a false citation, which is worse than no link at all.
   */
  url: string | null;
}

/**
 * An answer to something the customer asked that was not a checklist answer.
 *
 * `text` is also prefixed onto `message`, so a screen that has never heard of this field still
 * shows the answer. This exists so a screen that HAS heard of it can render the sources properly
 * instead of leaving them buried in a paragraph.
 */
export interface Answer {
  /** Prose. No markdown and no URL - it is read out loud on calls. */
  text: string;
  sources: AnswerSource[];
  /**
   * Photos, when they asked to see something rather than to be told about it. Absent on every
   * other answer. `text` stands on its own without them - it is what a phone call hears.
   */
  images?: AnswerImage[];
  kind: 'advice' | 'rates' | 'looks';
}

export interface ChecklistDisplayEntry {
  title: string;
  value: string;
}
export type ChecklistDisplay = Record<string, ChecklistDisplayEntry>;

/**
 * The same answers as `checklistDisplay`, in the order they were asked.
 *
 * An object cannot carry an order across a wire. `checklistDisplay` survives one hop intact and
 * then goes through Firestore, a merge, a `JSON.parse` - and comes out reordered, so the brief
 * panel reshuffles itself between the call and the results page for no reason the customer can
 * see. Nothing was wrong with the data; the order was never in it to begin with.
 *
 * So the answered half is an array, exactly as `checklistPending` already is. Between them the
 * panel is two ordered lists and no screen has to depend on key order again. `checklistDisplay`
 * stays for lookup by field, which is what it is actually good at.
 */
export interface ChecklistAnsweredEntry {
  key: string;
  title: string;
  value: string;
}

/**
 * A field still to be asked - so a brief panel can show what is coming, not only what is done.
 *
 * `checklistDisplay` holds answers and nothing else, which is right for a results page and wrong
 * for a panel beside a live conversation: with only the answered fields, a screen cannot tell the
 * difference between "not asked yet" and "does not exist", so it can show neither.
 *
 * In the order they will be asked, and dependencies are already applied - somebody who said they
 * have no gates never sees "Gate count" waiting for them, because it will never be asked.
 */
export interface ChecklistPendingEntry {
  key: string;
  title: string;
}

export interface QuoteResult {
  businessId: string;
  autoAcceptsAi: boolean;
  businessName: string;
  suburb: string;
  ratePerMeter: number;
  estimatedTotal: number;
  notes: string;
}

export interface ComparisonQuote {
  businessId: string;
  autoAcceptsAi: boolean;
  businessName: string;
  ratePerMeter: number;
  projectTotalMin: number;
  projectTotalMax: number;
  badges: string[];
  warranty: string | null;
  tag: 'BEST_VALUE' | null;
  savingsFromAverage: number | null;
  suburb: string;
}

export interface Comparison {
  /** What the web said per metre, when the customer tapped a guide figure. Never used in pricing. */
  marketGuide?: Budget;
  potentialSavings: number | null;
  marketAverage: number | null;
  totalQuotesScreened: number;
  userExistingPrice: number | null;
  quotes: ComparisonQuote[];
}

export interface AlternativeOffer {
  material: string;
  materialLabel: string;
  heightKey: string;
  businessId: string;
  businessName: string;
  estimatedTotal: number;
  value: string;
}

export interface ChatResponse {
  sessionId: string | null;
  trade: 'fencing';
  /** A customer already holding a quote turns the results page into a comparison against it. */
  intent: 'new_quote' | 'compare_quote';
  place: Place | null;
  type: 'message' | 'question' | 'confirmation' | 'result';
  message: string;
  /**
   * Present only on a turn where the customer asked something. Its `text` is ALREADY at the front
   * of `message` - this is the same answer broken up, not a second one to render as well.
   */
  answer?: Answer | null;
  options: ChatOption[];
  expects?: 'suburb';
  suggestedSuburb?: string | null;
  noMatchReason?: string;
  checklistComplete: boolean;
  checklist: Checklist;
  checklistDisplay: ChecklistDisplay;
  /** What has been answered, in the order it was asked. See `ChecklistAnsweredEntry`. */
  checklistAnswered: ChecklistAnsweredEntry[];
  /** What is still to come, in order. See `ChecklistPendingEntry`. */
  checklistPending: ChecklistPendingEntry[];
  results: QuoteResult[];
  avgRatePerMeter: number | null;
  comparison?: Comparison | null;
  alternatives?: AlternativeOffer[];
  /**
   * Where the finished quote was written, so the page can listen to it. Added by the route, not by
   * the pipeline, and only on a turn that produced a result - see `saveResult.ts`.
   */
  resultId?: string;
}
