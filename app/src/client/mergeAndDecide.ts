import type { ExtraValue } from '../vocabulary.js';
import type { DocFacts } from './attachmentFacts.js';
import { conditionsFrom, editDistance, heightKeyFrom, NOTHING, numbersIn, oneOf, positiveNumber, slug } from './fuzzyMatch.js';
import { askedFields, specOf } from './fieldSpec.js';
import { makeLabelFor, optionsFor, sourcesFrom, type LabelFor, type Sources, type TradeSchema } from './schema.js';
import type { Checklist, Place, PlaceHint, TurnExtraction, UiState } from './schemas.js';
import { type ChecklistField } from './vocab.js';

/**
 * Everything the conversation knows, settled in one place, before anything is said back. Ported
 * from n8n's `Merge & Decide` node, near line-for-line - the priority order below is what stops
 * three real bugs: a field skipped, a field asked twice, and choices offered that no business
 * publishes. The model still reads the customer's sentence - it's good at that - but every value
 * it returns is validated against the closed vocabulary before it's allowed in, and it may only
 * fill the field it was actually asked about (or any field, once the customer is correcting a
 * mistake). Nothing it says can move the conversation somewhere it was not going.
 */

/**
 * Type-aware validation - every value from the model, the attachment or the customer's own typed
 * reply passes through here before it is allowed into the checklist.
 *
 * It dispatches on the field's TYPE, never on its name, which is what lets a trade this code has
 * never heard of validate its own answers. The types are a closed set (`fieldSpec.ts`): a published
 * document selects one, it can never invent one. Every list validated against comes from the
 * trade's own schema document, so a business-side vocabulary change is accepted the moment it is
 * published.
 */
function validate(field: string, value: unknown, schema: TradeSchema, labelFor: LabelFor): unknown {
  if (value === null || value === undefined) return null;
  const spec = specOf(schema.fields, field);
  if (!spec) return null;

  const label = (entry: string) => labelFor(field as ChecklistField, entry);
  const choices = () => optionsFor(schema, spec).map(String);

  switch (spec.type) {
    case 'place':
      return null; // never trusted from anywhere but the picker - see mergeAndDecide()

    case 'enum': {
      /* A pinned answer is the field's own "there is none of this" - "No gates", "Nothing to
         remove". It is not part of the trade's vocabulary and must not be read against it, so a
         negative resolves straight to it. Keyed off the spec rather than off the field's name,
         which is what previously tied this to removal and gateType. */
      if (spec.pinned && (slug(value) === spec.pinned.value || NOTHING.test(String(value || '')))) {
        return spec.pinned.value;
      }
      /* Extras are things one business offers that the trade vocabulary has no slug for -
         deliberately absent from the choice list, so they never push out something everybody
         sells. A customer who names one by hand is naming something real, so it is recognised. */
      const list = spec.acceptsExtras ? [...choices(), ...Object.keys(schema.extras)] : choices();
      return oneOf(value, list, label);
    }

    case 'multiEnum':
      // No pinned short-circuit: an explicit "nothing tricky" is a valid EMPTY answer here, which
      // conditionsFrom already tells apart from "not asked yet".
      return conditionsFrom(value, choices(), label);

    case 'measure':
      return heightKeyFrom(value);

    case 'number':
      return positiveNumber(value);

    case 'count': {
      const n = positiveNumber(value);
      return n === null ? null : Math.round(n);
    }

    case 'money':
      return positiveNumber(value);

    default:
      return null;
  }
}

const placeKeyOf = (value: Place | null): string => {
  if (!value) return '';
  return slug(value.placeId || value.displayLabel || [value.suburb, value.postcode].filter(Boolean).join('-'));
};

export interface MergeAndDecideInput {
  sessionId: string;
  message: string;
  place: Place | null;
  /** The client-echoed checklist, `_ui` included - the primary copy of session state. */
  known: Partial<Checklist>;
  turnExtraction: TurnExtraction;
  docFacts: DocFacts;
  docSuburbHint: string | null;
  /** Raw message + attachment text, for the `mentioned()` hallucination guard. */
  haystackText: string;
  /** The trade's vocabulary, read from `schema/{trade}` at the start of the conversation. */
  schema: TradeSchema;
  /** Suburbs the customer's words could mean, when they could mean more than one. See `suburb.ts`. */
  suburbChoices?: PlaceHint[];
}

export interface MergedState {
  sessionId: string;
  trade: 'fencing';
  place: Place | null;
  checklist: Checklist;
  missing: ChecklistField[];
  nextField: ChecklistField | null;
  needsMatcher: boolean;
  turn: number;
  isFirstTurn: boolean;
  fixing: boolean;
  ui: UiState;
  sources: Sources;
  schema: TradeSchema;
  labelFor: LabelFor;
  ack: string;
  suggestedSuburb: string | null;
  /**
   * Several real suburbs answer to the name the customer gave, so none of them is the answer yet.
   * Resolved before this runs (`suburb.ts`) because it needs Google, and this function is pure.
   */
  suburbChoices: PlaceHint[];
  wantsMoreOptions: boolean;
  confirmed: boolean;
  docSuburbHint: string | null;
  suburbHint: string | null;
  rejectedPlaces: string[];
  placeKey: string;
  pickedAlternative: boolean;
  offListHeight: string | null;
  saidYes: boolean;
  saidNo: boolean;
  message: string;
  /**
   * The customer is correcting something, said something, and none of it landed - nothing was
   * reopened and no value moved. Without this the turn falls through to "everything is known" and
   * hands back the identical recap, which reads as the chat ignoring them.
   */
  fixingUnresolved: boolean;
  /**
   * What they sent was about something other than a fence, and nothing else about the turn
   * landed either. Both halves matter: a real answer always wins, so an on-topic reply the model
   * happened to misjudge cannot derail the conversation.
   */
  offTopic: boolean;
}

const CHANGE_WORDS = /\b(actually|instead|change|changed|wrong|incorrect|not right|sorry|meant|rather|galat|badal|nahi)\b/i;

/**
 * Politeness and glue. Never an answer on their own, so they do not count as something the customer
 * said beyond their question.
 */
const COURTESY = new Set([
  'thanks', 'thank', 'thankyou', 'please', 'cheers', 'mate', 'yeah', 'yep', 'ok', 'okay', 'hi', 'hello',
  'hey', 'sorry', 'um', 'uh', 'well', 'so', 'and', 'or', 'the', 'a', 'an', 'is', 'it', 'i', 'my', 'me',
]);

/**
 * Words that are still asking.
 *
 * Left over once the question has been taken out, they mean the sentence has not finished being a
 * question - "from these which is best", "what colours" - so whatever else is in it is being
 * compared, not chosen.
 */
const STILL_ASKING = new Set([
  'what', 'whats', 'which', 'how', 'why', 'when', 'who', 'whose', 'where', 'do', 'does', 'did',
  'better', 'best', 'cheaper', 'cheapest', 'vs', 'versus', 'compare', 'comparison', 'difference',
  'differences', 'between', 'bewtween', 'recommend', 'suggest', 'suitable', 'worth', 'available',
  'availble', 'avalibilty', 'availability',
]);

/**
 * The message with their own question cut out of it. What is left is what they told us.
 *
 * Kept as text rather than as a bag of words because the leftovers get read by `validate` like any
 * other answer, and a height only survives as "1.8m" - reduced to words it becomes "1" and "8m",
 * which is a different fence.
 */
function withoutTheirQuestion(message: string, question: string | null): string {
  const asked = (question ?? '').trim();
  if (!asked) return message;

  /* Cut the question out where it actually sits, rather than deleting its words wherever they
     appear. It is asked for in the customer's own words, so it usually lands as one run of them -
     and a word can be in the question AND be the answer. "Aluminium, do I need a council permit?"
     came back with the whole sentence as the question, and deleting its words one by one deleted
     "aluminium" along with them, so a customer who had answered was asked again.
     Punctuation is allowed to differ between the two, because it routinely does. */
  const span = new RegExp(
    asked
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\W*'),
    'i',
  );
  if (span.test(message)) return message.replace(span, ' ');

  // Paraphrased rather than copied - fall back to taking its words out wherever they are.
  const words = new Set(slug(asked).split('-').filter(Boolean));
  return message.replace(/[a-z0-9']+/gi, (word) => (words.has(slug(word)) ? ' ' : word));
}

/** Every word that names this choice - its own slug and the words of the label the customer read. */
const wordsOf = (entry: string, labelFor: (entry: string) => string): string[] =>
  (slug(entry) + '-' + slug(labelFor(entry))).split('-').filter((word) => word.length > 2);

/**
 * Did they name something OTHER than the value we are about to accept?
 *
 * Not a count of how many choices the words touch, which is the version that got this wrong: a
 * customer who says "aluminium" has named `aluminium` and `pool_aluminium` both, and counting two
 * threw away an answer somebody gave in plain words. What matters is whether they said something
 * that this value does not account for - "aluminium" alongside "timber pine" is a comparison,
 * "aluminium" on its own is an answer, however many choices happen to share the word.
 */
function namesAnotherChoice(
  words: string[],
  value: unknown,
  list: readonly string[],
  labelFor: (entry: string) => string,
): boolean {
  const chosen = (Array.isArray(value) ? value : [value]).map(String);
  const itsOwn = new Set(chosen.flatMap((entry) => wordsOf(entry, labelFor)));
  const said = new Set(words.filter((word) => !itsOwn.has(word)));
  return list.some((entry) => !chosen.includes(entry) && wordsOf(entry, labelFor).some((word) => said.has(word)));
}

/**
 * Which field the customer named, in their own words, when they say something is wrong. Only ever
 * consulted while correcting, so "the height is 1.8m" during a normal turn is an answer rather
 * than a request to empty the height.
 *
 * The misspellings are real ones customers type, not padding - "subrub" came straight off a
 * screenshot of this failing.
 */
const FIELD_WORDS: [ChecklistField, RegExp][] = [
  ['suburb', /\b(suburbs?|subrubs?|surburbs?|suberbs?|locations?|addresse?s?|areas?|post ?codes?)\b/i],
  ['material', /\b(materials?|fence type|type of fence|kind of fence|fencing type)\b/i],
  ['heightKey', /\b(heights?|tall|high)\b/i],
  ['lengthMeters', /\b(lengths?|long|met(?:re|er)s?)\b/i],
  ['removal', /\b(removals?|remove|removing|old fence)\b/i],
  ['conditions', /\b(conditions?|site|ground|slope|sloped|access)\b/i],
  // Deliberately narrower than the rest. A bare "gates" is ambiguous between the type and the
  // count - "make it 2 gates" is a new quantity, not a request to re-pick the type - so both of
  // these want an explicit phrase, and "the gate is wrong" is left to the model, which reads that
  // phrasing reliably.
  ['gateQty', /\b(how many gates|number of gates|gate count)\b/i],
  ['gateType', /\b(gate type|type of gate|kind of gate|which gate)\b/i],
];

/**
 * One distinctive word per field, matched with the same typo tolerance as everything else the
 * customer types. The regexes above cover phrases; this covers a customer who answers "what
 * should I fix?" with a single mistyped word, which is exactly what they do - "lenght" was the
 * one that sent somebody back to an unchanged recap with no way forward.
 *
 * Only unmistakable words belong here. "fence" and "type" appear in half of what anyone writes,
 * and a false match empties a field the customer never mentioned.
 */
const FIELD_ALIASES: [ChecklistField, string[]][] = [
  ['suburb', ['suburb', 'location', 'postcode']],
  ['material', ['material']],
  ['heightKey', ['height']],
  ['lengthMeters', ['length', 'metres', 'meters']],
  ['removal', ['removal', 'removing']],
  ['conditions', ['conditions']],
];

/** Which fields the customer named, by phrase or by a near-enough single word. */
function fieldsNamedIn(message: string): Set<string> {
  const named = new Set<string>();

  for (const [field, pattern] of FIELD_WORDS) {
    if (pattern.test(message)) named.add(slug(field));
  }

  const words = message.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const word of words) {
    if (word.length < 4) continue; // below this a one-letter edit is a different word
    for (const [field, aliases] of FIELD_ALIASES) {
      if (aliases.some((alias) => editDistance(word, alias) <= 1)) named.add(slug(field));
    }
  }

  return named;
}
const YES = /^\s*(y|ya|yes|yep|yeah|yup|correct|confirm(ed)?|all good|that'?s? (all )?(correct|right)|looks? (good|right)|sahi|theek|thik|ok(ay)?)\b/i;
const NO = /^\s*(n|no|nope|not quite|wrong|incorrect|nah|galat)\b/i;

export function mergeAndDecide(input: MergeAndDecideInput): MergedState {
  const rawMessage = String(input.message || '');
  const known = input.known || {};
  const ui: UiState = known._ui ?? {
    turn: 0,
    cursor: {},
    lastAsked: null,
    lastQuestion: '',
    lastValues: [],
    lastType: 'message',
    fixing: false,
    rejectedPlaces: [],
    nearbyPlaces: {},
    suburbHint: null,
    place: null,
    answers: 0,
  };
  const schema = input.schema;
  const labelFor = makeLabelFor(schema);
  const parsed = input.turnExtraction;

  /* The suburb, once, and then remembered.
     `isMissing('suburb')` is `!place`, and `place` only ever arrives as a real geocoded object
     from the client's picker - a typed suburb never counts, because ranking measures distance and
     needs coordinates. So a client that sends `place` on the turn it was picked and not
     afterwards had its suburb go missing again on the very next message, and the question came
     back. That is the loop. Carrying it in `_ui` with the rest of the conversation's state means
     the picker has to answer once, not on every turn. A new `place` in the request still wins:
     the customer changing suburb is exactly what should override it. */
  let place = input.place ?? ui.place ?? null;

  /* A suburb nobody covers. The client holds the place and sends it back every turn, so a suburb
     that no business reaches would arrive again on the next message, fail the same way, and
     produce the same reply forever. Once a place has been told "nobody covers you", it is
     remembered and treated as no place at all. Picking one of the covered suburbs offered on a
     no-match turn is handled here too: the coordinates came back with the offer. */
  const offeredPlaces = ui.nearbyPlaces && typeof ui.nearbyPlaces === 'object' ? ui.nearbyPlaces : {};
  const pickedNearby = offeredPlaces[slug(rawMessage)] ?? null;
  const rejectedPlaces = Array.isArray(ui.rejectedPlaces) ? ui.rejectedPlaces : [];

  if (pickedNearby) {
    place = {
      latitude: pickedNearby.latitude,
      longitude: pickedNearby.longitude,
      suburb: pickedNearby.suburb,
      state: pickedNearby.state,
      postcode: pickedNearby.postcode,
      displayLabel: pickedNearby.displayLabel,
    };
  } else if (place && rejectedPlaces.includes(placeKeyOf(place))) {
    place = null;
  }

  const carriedSuburbHint: string | null =
    input.docSuburbHint ||
    (typeof parsed.suggestedSuburb === 'string' && parsed.suggestedSuburb.trim() ? parsed.suggestedSuburb.trim() : null) ||
    (typeof ui.suburbHint === 'string' && ui.suburbHint.trim() ? ui.suburbHint.trim() : null) ||
    null;

  const fixing = ui.fixing === true || CHANGE_WORDS.test(rawMessage);
  const mayOverwrite = (field: string) => field === ui.lastAsked || fixing;

  const haystackSlug = slug(input.haystackText);
  /* Words as well as digits. A caller who says "fifty metres" out loud gets it transcribed either
     way, and a length written as a word used to fail the check below and be dropped in silence. */
  const numbers = numbersIn(input.haystackText);

  const mentioned = (field: ChecklistField | 'existingPrice', value: unknown): boolean => {
    if (field === 'suburb') return true; // never taken from the model anyway
    if (field === 'heightKey') return numbers.some((n) => heightKeyFrom(String(n)) === value);
    if (field === 'lengthMeters' || field === 'gateQty' || field === 'existingPrice') {
      return numbers.some((n) => Math.abs(n - Number(value)) < 0.01);
    }
    const values = Array.isArray(value) ? value : [value];
    if (!values.length) return true; // "nothing tricky" is an empty array - no word to look for
    return values.every((entry) => {
      const words = (slug(entry) + '-' + slug(labelFor(field, entry))).split('-').filter((w) => w.length > 2);
      return words.some((word) => haystackSlug.includes(word));
    });
  };

  /* "Nothing to remove", "Nothing tricky" and "No gates" all send the same value: `none`.
     That makes a negative answer the one thing `mentioned()` cannot police - it looks for the
     value's own words in what the customer wrote, and the word "none" is there whichever of the
     three they just answered. So a model that helpfully volunteered `gateType: "none"` while the
     customer was answering the site-conditions question had it accepted, and the gate question
     was never asked at all.
     A negative is only ever an answer to the question on screen. Real values still fill several
     fields at once - "30m colorbond fence in Pakenham" names three distinctive things - but
     "none" only answers what was asked. */
  const isNegative = (value: unknown) => value === 'none' || (Array.isArray(value) && value.length === 0);

  /* A bare number is only ever an answer to the question on screen - the same rule as `isNegative`
     above, for the same reason.
     Asked "what height are you after?", a customer typed "15m". It is not a height anybody builds
     at, so it was correctly refused as one - and then quietly became the LENGTH, because 15 is a
     perfectly good number of metres and `mentioned()` only checks that the number appears in what
     they wrote. The length question was never asked, and the customer had answered it without
     knowing. A number that fails the field it was typed into must not go looking for another one.
     A sentence still fills several fields at once - "30m colorbond fence in Pakenham" names three
     distinctive things - because a sentence is not a bare number. And a correction is exempt:
     `mayOverwrite` is already true everywhere while they are fixing something. */
  const BARE_NUMBER = /^\s*(?:about|around|approx\.?|roughly|maybe)?\s*\$?\d+(?:[.,]\d+)?\s*(?:m|metres?|meters?|mm|cm|ft|feet|foot|')?\s*[.!]?\s*$/i;
  const bareNumberAnswer = !!ui.lastAsked && BARE_NUMBER.test(rawMessage);

  /* A turn the model judged to be about something other than a fence contributes nothing. Both
     halves matter. The document reader is regex and does not know what it is reading - "Total for
     2 pizzas: $39.50" on a takeaway menu matched the total pattern and became the customer's
     existing quote. And the model, having been shown that, echoed it back. Either one counted as
     "they answered something", which suppressed the off-topic reply and started a questionnaire
     about a pizza menu.
     What still gets through is the direct resolution below: a tap or a typed answer to the
     question actually on screen is resolved in code, never by the model, so a genuine answer the
     model happened to misjudge is not lost. */
  /* Which fields exist and what order they are asked in belongs to the trade's own spec now.
     `everyField` includes the ones never asked - existingPrice is merged and validated like any
     other value, it just has no question. */
  const everyField = schema.fields.map((spec) => spec.key);
  const askedInOrder = askedFields(schema.fields).map((spec) => spec.key as ChecklistField);

  /* A turn that is only a question fills nothing. Handled here, beside `offTopic`, because both
     answer the same question: is there anything in this turn the model is entitled to have read a
     value out of? The customer-facing reply is unaffected; the question on screen is simply asked
     again, with their answer above it. */
  const asking = !!parsed.askedAbout?.trim();
  /* Politeness goes too, but only on a turn carrying a question - an ordinary answer is left exactly
     as the customer typed it. "Aluminium thanks, is it any good on a slope?" leaves "aluminium
     thanks", and that one extra word is enough to stop `oneOf` matching the slug outright, which
     drops it into a tie between `aluminium` and `pool_aluminium` and resolves to nothing. */
  const remainder = asking
    ? withoutTheirQuestion(rawMessage, parsed.askedAbout).replace(/[a-z']+/gi, (word) =>
        COURTESY.has(word.toLowerCase()) ? ' ' : word,
      )
    : rawMessage;
  const told = slug(remainder)
    .split('-')
    .filter((word) => word && !COURTESY.has(word));
  const questionOnly = asking && told.length === 0;

  const docFacts = parsed.offTopic ? {} : input.docFacts;
  const agentChecklist = parsed.offTopic || questionOnly ? {} : (parsed.checklist || {});
  const merged: Record<string, unknown> = {};
  /**
   * They asked something AND a value fell out of their sentence. Is that value an answer, or just
   * one of the things they were asking about?
   *
   * "Colorbond, timber pine, aluminium, from these which is best?" names three fences and chooses
   * none of them. So a value only counts when what is left of the sentence, once their own question
   * has been subtracted, names exactly that one choice and has stopped asking. Naming two is
   * comparing; naming one while still saying "which is best" is also comparing.
   *
   * Only ever consulted on a turn carrying a question - the ordinary answering turn, which is
   * almost all of them, does not reach here at all.
   */
  function answersRatherThanAsks(field: string, value: unknown, asked: boolean): boolean {
    if (asked) {
      // Still asking. "...treated pine or colorbond, which is best?" is a comparison, not a choice.
      if (told.some((word) => STILL_ASKING.has(word))) return false;

      /* What is LEFT has to be what says this, and the value has to be the one it says.
         "Can you tell me which fence type is better, treated pine or colorbond?" leaves "can you
         tell me" once the question is out, and that names no fence at all - so the treated pine the
         vocabulary found was read entirely out of the question they were asking. The name check
         below could not see that, because nothing in the leftovers contradicted it either. */
      const said = validate(field, remainder, schema, labelFor);
      if (said === null || JSON.stringify(said) !== JSON.stringify(value)) return false;
    }

    const spec = specOf(schema.fields, field);
    if (!spec) return false;
    // A field whose choices are keyed by another answer has none until that answer exists.
    const key = spec.optionsKeyedBy ? merged[spec.optionsKeyedBy] : null;
    if (spec.optionsKeyedBy && !key) return false;
    /* The pinned answer is the field's own "there is none of this" - "No gates". It is not part of
       the trade's vocabulary and so is not in the choice list, but it is very much a choice the
       customer can make, and leaving it out would drop it every time they said it alongside a
       question. */
    const list = optionsFor(schema, spec, key ? String(key) : undefined).map(String);
    if (spec.pinned) list.push(String(spec.pinned.value));
    // Nothing to name - a length, a count, a price. The words above are the whole guard there.
    if (!list.length) return true;

    const label = (entry: string) =>
      spec.pinned && entry === spec.pinned.value ? spec.pinned.label : labelFor(field as ChecklistField, entry);
    /* "Nothing tricky" comes back as an EMPTY array - a complete answer with no words of its own,
       so it has nothing to claim "none" with and read as the customer naming a choice they had not
       chosen. It is the pinned answer; give it the pinned answer's words. */
    const named = Array.isArray(value) && value.length === 0 && spec.pinned ? [spec.pinned.value] : value;
    return !namesAnotherChoice(told, named, list, label);
  }

  for (const field of everyField) {
    const knownValue = validate(field, (known as Record<string, unknown>)[field], schema, labelFor);
    const agentValue = validate(field, (agentChecklist as Record<string, unknown>)[field], schema, labelFor);
    const docValue = validate(
      field,
      field === 'heightKey' ? (docFacts.heightMm ?? null) : (docFacts as Record<string, unknown>)[field],
      schema,
      labelFor,
    );

    let value = knownValue;
    if (value === null || mayOverwrite(field)) {
      const accept =
        agentValue !== null &&
        /* The model reads a question the same way it reads an answer, and on the field it just
           asked about `mayOverwrite` trusts it outright - which is how "which of these three is
           best?" came back as a chosen fence. On a turn carrying a question it has to pass the
           same test as the shortcut below. */
        (!asking || answersRatherThanAsks(field, agentValue, true)) &&
        (mayOverwrite(field) ||
          (mentioned(field as ChecklistField, agentValue) && !isNegative(agentValue) && !bareNumberAnswer));
      value = accept ? agentValue : knownValue;
    }
    if (value === null) value = docValue;
    merged[field] = value;
  }

  /* The customer tapped an option and the client sent its value straight through as the message.
     Resolved here rather than trusting the model to read its own multiple choice back - the
     choices were generated in code, so they can be recognised in code.

     This is where the brief used to fill itself in, and it needed no model to do it: `validate`
     runs the whole message through the vocabulary, which finds a material ANYWHERE in a sentence -
     and "colorbond, timber pine, aluminium, from these which is best?" is a sentence with three of
     them in it. It scored two words for treated pine, one for aluminium, and quietly chose a fence
     for somebody who was asking which fence to choose.

     So on a turn where they asked something, this shortcut has to earn it: take their question
     back out (`told`), and only accept a value when what is left names exactly that one choice and
     has stopped asking. Naming two is comparing. Naming one while still saying "which is best" is
     also comparing. On every other turn - a tap, a typed answer, no question at all - nothing
     changes, because there is nothing here to be careful about. */
  if (ui.lastAsked && ui.lastAsked !== 'alternative' && rawMessage && !questionOnly) {
    /* Guarded whether or not they were judged to have asked something, because this path has no
       judgement in it at all - it is a fuzzy match over a sentence. "Treated pine or colorbond,
       what do you reckon?" came back from the model with no question flagged on it, and this line
       scored two words for treated pine against one for colorbond and picked a fence. Naming two of
       the choices is never choosing one, however the turn was read. */
    const direct = validate(ui.lastAsked, remainder, schema, labelFor);
    if (direct !== null && answersRatherThanAsks(ui.lastAsked, direct, asking)) merged[ui.lastAsked] = direct;
  }

  // Nobody could quote the brief exactly, so the results turn offered the nearest things somebody
  // CAN do - "alt:colorbond:1.8m". Two fields move at once, hence its own prefix.
  let pickedAlternative = false;
  if (ui.lastAsked === 'alternative' && /^alt:/i.test(rawMessage.trim())) {
    const [, altMaterial, altHeight] = rawMessage.trim().split(':');
    const material = validate('material', altMaterial, schema, labelFor);
    const heightKey = validate('heightKey', altHeight, schema, labelFor);
    if (material) {
      merged.material = material;
      pickedAlternative = true;
    }
    if (heightKey) merged.heightKey = heightKey;
  }

  /* "No, the fence type is wrong" - the one thing allowed to empty a field, only while correcting.
     Two sources, because the model alone was not reliable enough: it reads "the suburb is wrong"
     as a correction but read "I want to change the suburb" as nothing at all, and the customer
     was returned to the same recap with no way to change anything. The field names are ours, so
     they can be recognised in code - the same reasoning as resolving a tapped option here rather
     than asking the model to read its own multiple choice back. */
  const namedWrong = new Set<string>();
  if (fixing) {
    for (const field of parsed.clearFields ?? []) namedWrong.add(slug(field));
    for (const field of fieldsNamedIn(rawMessage)) namedWrong.add(field);
  }

  const clearedFields: string[] = [];
  for (const field of everyField) {
    if (!namedWrong.has(slug(field))) continue;
    /* "Actually make it two gates" names a field AND replaces it in the same breath, and clearing
       it would throw the new answer away and ask for it again. But only a DIFFERENT value counts
       as a replacement: asked to clear the length, the model returned clearFields ["lengthMeters"]
       and then echoed the whole brief back, 15 metres included - reading that echo as a new
       answer left the field exactly as it was and the customer stuck. */
    const replacement = validate(field, (agentChecklist as Record<string, unknown>)[field], schema, labelFor);
    const current = validate(field, (known as Record<string, unknown>)[field], schema, labelFor);
    if (replacement !== null && JSON.stringify(replacement) !== JSON.stringify(current)) continue;

    merged[field] = null;
    clearedFields.push(field);
    /* The suburb is not so much stored as re-derived from the confirmed place on every turn, and
       `isMissing` tests that place rather than the checklist value. Emptying the field alone was
       undone three lines below and the picker never reopened - dropping the place is what
       actually lets them choose a different suburb. */
    if (field === 'suburb') place = null;
  }

  // Picker confirmation is the suburb, and nothing else ever is.
  if (place) {
    merged.suburb =
      place.displayLabel || [place.suburb, place.state, place.postcode].filter(Boolean).join(', ') || merged.suburb;
  }

  // A 0 is the model filling in a default, never a real quote. Left as 0 it would hide every
  // business, because nothing comes in under $0.
  if (!(Number(merged.existingPrice) > 0)) merged.existingPrice = null;

  const isMissing = (field: ChecklistField): boolean => {
    const spec = specOf(schema.fields, field);

    /* A place is not so much stored as re-derived from the confirmed pick every turn, and ranking
       measures distance so it needs coordinates - which is why the geocoded object is tested here
       and never the display string sitting in the checklist. */
    if (spec?.type === 'place') return !place;

    /* A field whose dependency does not hold is not missing - it does not apply. "No gates" is a
       complete answer, and asking how many of them there are would be asking about nothing. */
    const dependency = spec?.dependsOn;
    if (dependency) {
      const other = merged[dependency.field];
      if (dependency.notEquals !== undefined && other === dependency.notEquals) return false;
      if (dependency.equals !== undefined && other !== dependency.equals) return false;
    }

    const value = merged[field];
    return value === null || value === undefined || value === '';
  };

  const sources: Sources = sourcesFrom(schema);
  // A field whose options are keyed by another answer had no list until now. Fencing heights are
  // the case: a trade that builds different types to different heights publishes them keyed by
  // material, and until a material is chosen there is nothing to offer.
  for (const spec of schema.fields) {
    if (!spec.optionsKeyedBy) continue;
    const keyValue = merged[spec.optionsKeyedBy];
    if (keyValue) sources[spec.key] = optionsFor(schema, spec, String(keyValue));
  }

  /* A measurement nobody builds at is not an answer, however clearly it was typed. Not silently
     rounded either: 1.65m snapped to 1.8m is a different fence at a different price. Only one
     `measure` field exists today (height), which is why one off-list value is carried rather than
     a map - a second one should widen this rather than pick the first. */
  let offListHeight: string | null = null;
  const measured = schema.fields.find((spec) => spec.type === 'measure');
  if (measured) {
    const list = sources[measured.key] ?? [];
    const value = merged[measured.key];
    if (value && list.length) {
      const wanted = Number.parseFloat(String(value));
      const onList = list.find((entry) => Math.abs(Number.parseFloat(String(entry)) - wanted) < 0.001);
      if (onList === undefined) {
        offListHeight = String(value);
        merged[measured.key] = null;
      } else {
        merged[measured.key] = onList;
      }
    }
  }

  const missing = askedInOrder.filter(isMissing);
  const nextField = missing.length ? missing[0]! : null;

  const turn = Number(ui.turn || 0) + 1;
  const isFirstTurn = turn === 1;

  const lastWasConfirmation = ui.lastType === 'confirmation';
  const saidYes = lastWasConfirmation && (YES.test(rawMessage) || parsed.confirmed === true);
  const saidNo = lastWasConfirmation && NO.test(rawMessage);

  // Nothing is looked up until the customer has said the brief is right. Running it a turn early
  // meant the customer could be told nobody covers them before they had agreed the details were
  // even correct.
  const needsMatcher = !!place && nextField === null && (saidYes || pickedAlternative);

  /* They typed something into the box while correcting, and it changed nothing: no field
     reopened, no value replaced. Saying "I didn't catch that" and offering the list is the only
     honest answer - handing back the same recap makes it look like the chat is ignoring them,
     which is exactly what a customer reported after typing "lenght". */
  const changedSomething = everyField.some((field) => {
    // The suburb is the one field `validate` always answers null for - it is written from the
    // confirmed place, not from the checklist - so comparing its validated form would report a
    // change on every single turn and hide every unresolved one behind it.
    const before =
      field === 'suburb'
        ? ((known as Record<string, unknown>).suburb ?? null)
        : validate(field, (known as Record<string, unknown>)[field], schema, labelFor);
    return JSON.stringify(before ?? null) !== JSON.stringify(merged[field] ?? null);
  });
  const fixingUnresolved =
    fixing && rawMessage.trim().length > 0 && !saidNo && clearedFields.length === 0 && !changedSomething;

  /* Only when the turn produced nothing else. The model is reading a sentence and can misjudge
     one, so a value that was actually accepted, a field reopened, or a yes/no on the recap all
     outrank it - being wrong here turns a real customer away.

     A question about fencing outranks it too, and has to: `offTopic` empties the whole checklist
     above, so a mis-flagged "do I need a permit?" would throw the answer away with it and leave
     the customer told we only do fencing - in reply to a fencing question. */
  const offTopic =
    parsed.offTopic === true && !parsed.askedAbout && !changedSomething && clearedFields.length === 0 && !saidYes && !saidNo;

  return {
    sessionId: input.sessionId,
    trade: 'fencing',
    place,
    checklist: merged as unknown as Checklist,
    missing,
    nextField,
    needsMatcher,
    turn,
    isFirstTurn,
    fixing,
    ui,
    sources,
    schema,
    labelFor,
    ack: typeof parsed.ack === 'string' ? parsed.ack.trim().slice(0, 40) : '',
    suggestedSuburb: typeof parsed.suggestedSuburb === 'string' && parsed.suggestedSuburb.trim() ? parsed.suggestedSuburb.trim() : null,
    suburbChoices: place ? [] : (input.suburbChoices ?? []),
    wantsMoreOptions: parsed.wantsMoreOptions === true,
    confirmed: parsed.confirmed === true,
    docSuburbHint: input.docSuburbHint,
    suburbHint: carriedSuburbHint,
    rejectedPlaces,
    placeKey: placeKeyOf(place),
    pickedAlternative,
    offListHeight,
    saidYes,
    saidNo,
    message: rawMessage,
    fixingUnresolved,
    offTopic,
  };
}

