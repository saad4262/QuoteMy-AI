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

export interface ChecklistDisplayEntry {
  title: string;
  value: string;
}
export type ChecklistDisplay = Record<string, ChecklistDisplayEntry>;

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
  options: ChatOption[];
  expects?: 'suburb';
  suggestedSuburb?: string | null;
  noMatchReason?: string;
  checklistComplete: boolean;
  checklist: Checklist;
  checklistDisplay: ChecklistDisplay;
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
