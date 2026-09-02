import { DEFAULT_PAGE_SIZE, askedFields, specOf } from './fieldSpec.js';
import { questionFor } from './schema.js';
import type { MergedState } from './mergeAndDecide.js';
import type { MatchResult } from './matcher.js';
import { slug } from './fuzzyMatch.js';
import { budgetText } from './budget.js';
import type { Answer, Budget, ChatOption, ChatResponse, ChecklistAnsweredEntry, ChecklistDisplay, ChecklistDisplayEntry, ChecklistPendingEntry, PlaceHint, UiState } from './schemas.js';
import type { ChecklistField } from './vocab.js';

/**
 * The turn the customer actually sees. Every question and every choice on it is built here, from
 * the schema and from what the covering businesses publish - never from the model. The model's
 * only contribution is `state.ack`, two or three words at the front. Ported from n8n's
 * `Format Fencing Result` node.
 *
 * Three things this guarantees, which is the whole reason it exists: nothing is skipped (the
 * field asked is the first one still empty, in a fixed order), nothing is repeated (a field with a
 * value is never asked again), nothing is invented (options come from schema slugs and real
 * published rates).
 */

const WANTS_MORE = /\b(more|other|others|another|different|else|alternativ\w*|aur|koi\s+aur)\b/i;

export interface FormatResultInput {
  state: MergedState;
  /** Present only on turns where the matcher actually ran (`state.needsMatcher` was true). */
  matcher: MatchResult | null;
  /** Present only on turns where the customer asked something and the search answered it. */
  answer?: Answer | null;
  /** Present only on the turn a guide figure was tapped off one of those answers. */
  budget?: Budget | null;
}

export function formatFencingResult({ state, matcher, answer = null, budget = null }: FormatResultInput): ChatResponse {
  const checklist = { ...state.checklist };
  const sessionId = state.sessionId;
  const place = state.place;
  const rawMessage = state.message;
  const ui = state.ui;
  // Bound to the schema document this conversation loaded, so every label on screen is the
  // business side's current wording rather than a copy compiled into this file.
  const labelFor = state.labelFor;
  // Titles, pinned answers and page sizes now belong to the trade's own field spec, so this file
  // no longer knows anything fencing-specific about them.
  const fields = state.schema.fields;
  const titleOf = (field: ChecklistField): string => specOf(fields, field)?.title ?? field;

  const sources = { ...state.sources };
  let missing = state.missing.slice();
  let nextField = state.nextField;

  // A single published option is not a question - fill it in rather than asking. Opt-in per field:
  // where a pinned "none of this" answer exists, one real choice still needs asking.
  const nextSpec = nextField ? specOf(fields, nextField) : undefined;
  if (nextSpec?.fillWhenSingle && (sources[nextSpec.key] ?? []).length === 1) {
    (checklist as Record<string, unknown>)[nextSpec.key] = sources[nextSpec.key]![0]!;
    missing = missing.filter((field) => field !== nextSpec.key);
    nextField = missing.length ? missing[0]! : null;
  }

  // "Give me something else" advances one page. Running off the end wraps back to the start and
  // says so, rather than handing back the same three choices with no explanation.
  const askingAgain = !!ui.lastAsked && state.nextField === ui.lastAsked;
  const wantsMore = askingAgain && (state.wantsMoreOptions === true || WANTS_MORE.test(rawMessage));

  const cursors: Record<string, number> = { ...ui.cursor };
  let exhausted = false;

  const buildOptions = (field: ChecklistField): ChatOption[] => {
    const list = sources[field as keyof typeof sources] ?? [];
    const spec = specOf(fields, field);
    const pinned: ChatOption | null = spec?.pinned ? { ...spec.pinned } : null;
    const pageSize = spec?.pageSize ?? DEFAULT_PAGE_SIZE;
    const slots = pinned ? pageSize - 1 : pageSize;

    let cursor = Number(cursors[field] || 0);
    if (!Number.isFinite(cursor) || cursor < 0) cursor = 0;
    if (wantsMore && field === state.nextField) {
      cursor += slots;
      if (cursor >= list.length) {
        cursor = 0;
        exhausted = true;
      }
    }
    if (cursor >= list.length) cursor = 0;
    cursors[field] = cursor;

    const options: ChatOption[] = list.slice(cursor, cursor + slots).map((value) => ({ label: labelFor(field, value), value }));
    if (pinned) options.push({ ...pinned });
    // Always last, always present. The client turns this one into a text box rather than sending
    // it back, so free text is how everything not on screen reaches us.
    options.push({ label: 'Other', value: '__other__' });
    return options;
  };

  const acknowledged = (text: string): string => {
    const ack = state.ack.trim().replace(/[\s—–-]+$/, '');
    if (!ack || state.isFirstTurn) return text;
    return ack + ' — ' + text.charAt(0).toLowerCase() + text.slice(1);
  };

  let type: ChatResponse['type'] = 'message';
  let message = '';
  let options: ChatOption[] = [];
  let checklistComplete = false;
  let fixing = false;
  let noMatchReason: string | undefined;
  let askingSuburbAgain = false;
  let nearbyOffered: Record<string, PlaceHint> = ui.nearbyPlaces && typeof ui.nearbyPlaces === 'object' ? ui.nearbyPlaces : {};
  let rejectedPlaces = Array.isArray(state.rejectedPlaces) ? state.rejectedPlaces.slice() : [];

  const rejects = (value: string | null): boolean =>
    !!value && rejectedPlaces.some((key) => key && (slug(value).includes(key) || key.includes(slug(value))));
  let carriedHint = rejects(state.suburbHint) ? null : state.suburbHint;

  // Tapped this turn, or tapped earlier and carried - the client round-trips `_ui` and nothing else.
  const carriedBudget = budget ?? ui.budget ?? null;

  const lastWasConfirmation = ui.lastType === 'confirmation';
  const saidYes = state.saidYes === true;
  const saidNo = state.saidNo === true;

  if (matcher && matcher.matched !== true) {
    /* Nobody covers this customer. Saying so and stopping is what put the conversation in a loop:
       the client keeps the place and sends it back, so the next message fails the same way,
       forever. Two things fix it. The suburb that failed is remembered as rejected, so it stops
       counting as an answer and the question can be asked again. And rather than telling
       somebody to go and guess a nearby suburb, the ones this trade is actually worked out of
       are offered by name, coordinates included, so picking one needs no second trip to Google. */
    noMatchReason = matcher.noMatchReason || 'area';
    const here = slug(checklist.suburb || place?.suburb || '');
    const suggestions = matcher.nearby.filter((area) => area.suburb && slug(area.suburb) !== here && !here.includes(slug(area.suburb)));

    const failed = checklist.suburb || place?.suburb || 'that suburb';
    const preamble =
      noMatchReason === 'place'
        ? "I couldn't place that suburb on the map."
        : noMatchReason === 'radius'
          ? 'There are fencing businesses near ' + failed + ", but none of them travel far enough to reach you."
          : noMatchReason === 'pricing'
            ? 'There are fencing businesses around ' + failed + ", but none of them have confirmed their pricing yet."
            : 'No fencing business covers ' + failed + ' yet.';

    if (suggestions.length) {
      const shown = suggestions.slice(0, DEFAULT_PAGE_SIZE);
      nearbyOffered = {};
      for (const area of shown) {
        const label = [area.suburb, area.state, area.postcode].filter(Boolean).join(', ');
        nearbyOffered[slug(area.suburb)] = {
          latitude: area.latitude,
          longitude: area.longitude,
          suburb: area.suburb,
          state: area.state,
          postcode: area.postcode,
          displayLabel: label,
        };
        options.push({ label: label + (area.distanceKm ? ' · ' + area.distanceKm + ' km' : ''), value: area.suburb });
      }
      options.push({ label: 'Somewhere else', value: '__other__' });
      message = preamble + ' These suburbs are covered — any of them work?';
      type = 'question';
    } else {
      message = preamble + ' Try a different suburb?';
      type = 'message';
      options = [];
    }
    const failedKey = state.placeKey || slug(checklist.suburb || '');
    if (failedKey) rejectedPlaces = [...new Set(rejectedPlaces.concat(failedKey))].slice(-10);
    checklist.suburb = null;
    askingSuburbAgain = true;
  } else if (state.offTopic) {
    /* They sent something that is not about a fence - a different trade, a document that is not a
       quote, or nothing to do with building at all. Saying so is better than the opener's "Happy
       to help with that", which claims to help with whatever they just named, and better than
       "Sorry, I didn't catch that", which sounds like a hearing problem rather than the wrong
       counter. Nothing is recorded and no question is advanced; the next thing they say is read
       normally, so this costs a customer who was only joking one line. */
    message = "I only do fencing quotes here, sorry — is it a fence you're after?";
    type = 'message';
    options = [];
  } else if (state.isFirstTurn && missing.length > 0) {
    // Turn one is always the opener, whatever was mined off the attachment. Skipping straight to
    // "happy to answer some questions?" reads as though nobody looked at the file.
    const mined = (['material', 'heightKey', 'lengthMeters', 'removal', 'conditions'] as ChecklistField[]).filter(
      (field) => checklist[field] !== null && checklist[field] !== undefined,
    );
    message = mined.length
      ? "Got the details off that, but it's not quite enough to match you properly yet. Mind if I ask a few quick questions?"
      : 'Happy to help with that. Mind if I ask a few quick questions?';
    type = 'message';
    options = [];
  } else if ((saidYes || state.pickedAlternative === true) && missing.length === 0) {
    message = acknowledged('Let me check what businesses are available near you…');
    type = 'message';
    options = [];
    checklistComplete = true;
  } else if (saidNo) {
    message = 'No worries — what should I fix?';
    type = 'message';
    options = [];
    fixing = true;
  } else if (state.fixingUnresolved) {
    /* They answered "what should I fix?" and none of it landed. Falling through to the recap
       below hands back the identical message and reads as the chat ignoring them - which is what
       a customer hit after typing "lenght". Naming the fields is a better answer than guessing,
       and it keeps them in correcting mode rather than dropping them back at a dead end. */
    const answered = (['suburb', 'material', 'heightKey', 'lengthMeters', 'removal', 'conditions', 'gateType'] as ChecklistField[])
      .filter((field) => checklist[field] !== null && checklist[field] !== undefined);

    message = "Sorry, I didn't catch which one — which of these should I change?";
    type = 'question';
    options = answered.slice(0, DEFAULT_PAGE_SIZE).map((field) => ({ label: titleOf(field), value: field }));
    options.push({ label: 'Other', value: '__other__' });
    fixing = true; // still correcting - the next reply must keep the same freedom to move a field
  } else if (nextField) {
    const question = questionFor(state.schema, nextField);

    if (nextField === 'suburb' && state.suburbChoices.length > 1) {
      /* The name is real and answers to more than one place - there is a Richmond in four states.
         Offering them by name, coordinates included, is the only safe move: picking the nearest
         one silently produces a quote from businesses 900 km away, and nothing reports it. The
         hints go back into `nearbyPlaces` so the reply resolves without a second trip to Google. */
      nearbyOffered = {};
      for (const choice of state.suburbChoices) {
        nearbyOffered[slug(choice.displayLabel)] = choice;
        options.push({ label: choice.displayLabel, value: choice.displayLabel });
      }
      options.push({ label: 'None of these', value: '__other__' });
      message = 'There is more than one ' + state.suburbChoices[0]!.suburb + " — which one is yours?";
      type = 'question';
    } else if (nextField === 'suburb') {
      /* A suburb is the one field with no list to tap: the trade's vocabulary does not contain
         Australia. It is resolved from what the customer says (`suburb.ts`), and a postcode is
         asked for because it is the one form of the answer that cannot be two places at once. */
      const hint = carriedHint;
      const covered = Object.keys(nearbyOffered)
        .map((key) => nearbyOffered[key]?.suburb)
        .filter((v): v is string => Boolean(v))
        .slice(0, 3);

      message = hint
        ? "I couldn't pin down " + hint + ". What's the postcode?"
        : covered.length
          ? question + ' ' + covered.join(', ') + (covered.length > 1 ? ' are covered.' : ' is covered.')
          : question;
      type = 'message';
      options = [];
    } else {
      options = buildOptions(nextField);
      /* "Sorry, I didn't catch that" is for a message that landed on nothing. A customer who
         asked "which type is better", got the answer, and is now being asked the question again
         was understood perfectly - apologising underneath our own answer reads as though nobody
         noticed it. So an answered turn re-asks plainly, with the choices on screen under it. */
      const misunderstood =
        askingAgain && !wantsMore && !exhausted && !answer && rawMessage.trim().length > 0 && !state.offListHeight;
      const offList = nextField === 'heightKey' && state.offListHeight ? 'Fences are not built at ' + state.offListHeight + ' — ' : null;

      message = offList
        ? offList + 'which of these is closest?'
        : exhausted
          ? "That's everything we cover — " + question.charAt(0).toLowerCase() + question.slice(1)
          : misunderstood
            ? "Sorry, I didn't catch that — " + question.charAt(0).toLowerCase() + question.slice(1)
            : acknowledged(question);
      /* They named a fence nobody on the list builds, and it was taken as their answer. Said in
         front of the next question rather than instead of it, the same way an answer to their own
         question rides along - the brief has moved on, and pretending otherwise is what "sorry, I
         didn't catch that" used to do. It is honest about the risk without refusing them: the
         results turn is where nobody turns out to build it, with the whole brief in hand to offer
         alternatives against. */
      if (state.offListChoice) {
        message =
          state.offListChoice.label +
          " — got it. Not one everybody does, so I'll see who can.\n\n" +
          message;
      }
      type = 'question';
    }
  } else if (!lastWasConfirmation || budget) {
    // Everything is known. One recap, then the handoff - built from the checklist's own values,
    // never from a sentence the model wrote, so it can never mention a value that isn't stored.
    const recap = [
      checklist.suburb,
      labelFor('material', checklist.material),
      checklist.heightKey,
      checklist.lengthMeters ? checklist.lengthMeters + 'm' : null,
      checklist.removal && checklist.removal !== 'none' ? 'removing the old ' + labelFor('removal', checklist.removal).toLowerCase() : null,
      Array.isArray(checklist.conditions) && checklist.conditions.length
        ? checklist.conditions.map((value) => labelFor('conditions', value).toLowerCase()).join(', ')
        : null,
      checklist.gateType && checklist.gateType !== 'none'
        ? (checklist.gateQty || 1) + ' x ' + labelFor('gateType', checklist.gateType).toLowerCase()
        : null,
    ]
      .filter(Boolean)
      .join(', ');
    message = 'Got it — ' + recap + '. All correct?';
    type = 'confirmation';
    options = [
      { label: "Yes, that's all correct", value: 'yes' },
      { label: "No, something's wrong", value: 'no' },
    ];
  } else {
    message = 'Sorry — is that all correct?';
    type = 'confirmation';
    options = [
      { label: "Yes, that's all correct", value: 'yes' },
      { label: "No, something's wrong", value: 'no' },
    ];
  }

  /* The tap said nothing about the fence, so the question above is unchanged and is simply put
     again. This one line is the whole of what the customer gets back for it, until the results
     screen - and it is careful not to promise a price, because the figure is a stranger's guide
     and their real quotes are still being collected. */
  if (budget) message = "Noted — I'll show you how the quotes compare to " + budgetText(budget) + '.\n\n' + message;

  const suburbHint = rejects(carriedHint) ? null : carriedHint;
  const expectsSuburb = options.length === 0 && (askingSuburbAgain || (!place && /\bsuburbs?\b|\bpost ?code\b|\bsuggestions\b/i.test(message)));

  const uiOut: UiState = {
    turn: state.turn,
    cursor: cursors,
    lastAsked: askingSuburbAgain ? 'suburb' : type === 'question' || expectsSuburb ? missing[0] || nextField || null : null,
    lastQuestion: message,
    lastValues: options.map((option) => option.value),
    lastType: type,
    fixing,
    rejectedPlaces,
    nearbyPlaces: nearbyOffered,
    suburbHint: place ? null : suburbHint,
    // Carried so the picker answers once. Cleared on the turn a suburb is handed back because
    // nobody covered it - otherwise the place would be restored next turn and fail identically.
    place: askingSuburbAgain ? null : place,
    // Counted here rather than where the search runs, because this is the object that survives the
    // round trip through the client - a counter anywhere else resets every turn and caps nothing.
    answers: (ui.answers ?? 0) + (answer ? 1 : 0),
    // Kept out of the checklist deliberately: it is not one of the trade's fields, nothing is
    // asked about it, and the brief panel must not show a web figure as though it were an answer.
    ...(carriedBudget ? { budget: carriedBudget } : {}),
  };

  const checklistDisplay: ChecklistDisplay = {};
  /* The same entries as an ordered list. `askedFields` is the order the questions are put, so
     building both here is the only place that order is known - see `ChecklistAnsweredEntry`. */
  const checklistAnswered: ChecklistAnsweredEntry[] = [];
  for (const spec of askedFields(fields)) {
    const field = spec.key as ChecklistField;
    const value = checklist[field];
    if (value === null || value === undefined || value === ('' as unknown)) continue;
    let text: string;
    if (field === 'suburb' || field === 'heightKey') text = String(value);
    else if (field === 'conditions') {
      text = Array.isArray(value) && value.length ? value.map((entry) => labelFor('conditions', entry)).join(', ') : 'Nothing tricky';
    } else if (field === 'removal') text = value === 'none' ? 'Nothing to remove' : labelFor('removal', value);
    else if (field === 'gateType') text = value === 'none' ? 'No gates' : labelFor('gateType', value);
    else text = labelFor(field, value);
    const entry: ChecklistDisplayEntry = { title: titleOf(field), value: text };
    checklistDisplay[field] = entry;
    checklistAnswered.push({ key: field, ...entry });
  }

  /* What is still to come, for the panel beside the conversation. `missing` is already in the
     order fields are asked and already has dependencies applied, so this is only a rename.
     A suburb handed back because nobody covered it is asked again but was never missing, so it is
     put at the front by hand - otherwise it would show as neither answered nor pending. */
  const pendingKeys = askingSuburbAgain ? ['suburb' as ChecklistField, ...missing.filter((f) => f !== 'suburb')] : missing;
  const checklistPending: ChecklistPendingEntry[] = pendingKeys.map((field) => ({ key: field, title: titleOf(field) }));

  return {
    sessionId,
    trade: 'fencing',
    // Derived from the brief, not from a classifier that could flip mid-conversation: a quote the
    // customer already holds turns the results page into a comparison.
    intent: Number(checklist.existingPrice) > 0 ? 'compare_quote' : 'new_quote',
    place,
    type,
    /* The answer goes in front of the question rather than instead of it, and above the ack rather
       than inside it: `acknowledged()` has already put "Got it" on the question, so the turn reads
       as an answer, a blank line, then "Got it - what height are you after?". Every question is
       still asked, in the same order, from the same template - the aside rides along.

       It is put into `message` as well as carried in its own field because the screen that renders
       this is in another repository: a frontend that has never heard of `answer` shows the answer
       anyway, and one that has can render the sources properly. */
    message: answer ? answer.text + '\n\n' + message : message,
    ...(answer ? { answer } : {}),
    options,
    ...(expectsSuburb ? { expects: 'suburb' as const } : {}),
    ...(expectsSuburb && suburbHint ? { suggestedSuburb: suburbHint } : {}),
    ...(noMatchReason ? { noMatchReason } : {}),
    checklistComplete,
    checklist: { ...checklist, _ui: uiOut },
    checklistDisplay,
    checklistAnswered,
    checklistPending,
    results: [],
    avgRatePerMeter: null,
  };
}
