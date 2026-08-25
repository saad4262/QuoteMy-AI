import { questionFor } from './schema.js';
import type { MergedState } from './mergeAndDecide.js';
import type { MatchResult } from './matcher.js';
import { slug } from './fuzzyMatch.js';
import type { ChatOption, ChatResponse, ChecklistDisplay, ChecklistDisplayEntry, PlaceHint, UiState } from './schemas.js';
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

const PAGE_SIZE = 3;
const PINNED: Partial<Record<ChecklistField, ChatOption>> = {
  removal: { label: 'Nothing to remove', value: 'none' },
  conditions: { label: 'Nothing tricky', value: 'none' },
  gateType: { label: 'No gates', value: 'none' },
};

const WANTS_MORE = /\b(more|other|others|another|different|else|alternativ\w*|aur|koi\s+aur)\b/i;

/** What each field is called on screen - the brief panel, and the "which one?" correction turn. */
const FIELD_TITLES: Record<ChecklistField, string> = {
  suburb: 'Suburb',
  material: 'Material',
  heightKey: 'Height',
  lengthMeters: 'Length',
  removal: 'Old fence',
  conditions: 'Site conditions',
  gateType: 'Gate',
  gateQty: 'Gates',
};

export interface FormatResultInput {
  state: MergedState;
  /** Present only on turns where the matcher actually ran (`state.needsMatcher` was true). */
  matcher: MatchResult | null;
}

export function formatFencingResult({ state, matcher }: FormatResultInput): ChatResponse {
  const checklist = { ...state.checklist };
  const sessionId = state.sessionId;
  const place = state.place;
  const rawMessage = state.message;
  const ui = state.ui;
  // Bound to the schema document this conversation loaded, so every label on screen is the
  // business side's current wording rather than a copy compiled into this file.
  const labelFor = state.labelFor;

  const sources = { ...state.sources };
  let missing = state.missing.slice();
  let nextField = state.nextField;

  // A single published height is not a question - fill it in rather than asking.
  if (nextField === 'heightKey' && (sources.heightKey || []).length === 1) {
    checklist.heightKey = sources.heightKey[0]!;
    missing = missing.filter((field) => field !== 'heightKey');
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
    const pinned = PINNED[field] ?? null;
    const slots = pinned ? PAGE_SIZE - 1 : PAGE_SIZE;

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
      const shown = suggestions.slice(0, PAGE_SIZE);
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
    options = answered.slice(0, PAGE_SIZE).map((field) => ({ label: FIELD_TITLES[field], value: field }));
    options.push({ label: 'Other', value: '__other__' });
    fixing = true; // still correcting - the next reply must keep the same freedom to move a field
  } else if (nextField) {
    const question = questionFor(state.schema, nextField);

    if (nextField === 'suburb') {
      // The only field collected with something other than a tap: a mistyped suburb does not
      // fail loudly, it silently matches zero businesses, so the client swaps its reply box for
      // a Google-backed picker and sends back a real place.
      const hint = carriedHint;
      const covered = Object.keys(nearbyOffered)
        .map((key) => nearbyOffered[key]?.suburb)
        .filter((v): v is string => Boolean(v))
        .slice(0, 3);

      message = hint
        ? 'I found ' + hint + ' — confirm that suburb from the list?'
        : covered.length
          ? question + ' ' + covered.join(', ') + (covered.length > 1 ? ' are covered.' : ' is covered.')
          : question;
      type = 'message';
      options = [];
    } else {
      options = buildOptions(nextField);
      const misunderstood = askingAgain && !wantsMore && !exhausted && rawMessage.trim().length > 0 && !state.offListHeight;
      const offList = nextField === 'heightKey' && state.offListHeight ? 'Fences are not built at ' + state.offListHeight + ' — ' : null;

      message = offList
        ? offList + 'which of these is closest?'
        : exhausted
          ? "That's everything we cover — " + question.charAt(0).toLowerCase() + question.slice(1)
          : misunderstood
            ? "Sorry, I didn't catch that — " + question.charAt(0).toLowerCase() + question.slice(1)
            : acknowledged(question);
      type = 'question';
    }
  } else if (!lastWasConfirmation) {
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
  };

  const checklistDisplay: ChecklistDisplay = {};
  for (const field of Object.keys(FIELD_TITLES) as ChecklistField[]) {
    const value = checklist[field];
    if (value === null || value === undefined || value === ('' as unknown)) continue;
    let text: string;
    if (field === 'suburb' || field === 'heightKey') text = String(value);
    else if (field === 'conditions') {
      text = Array.isArray(value) && value.length ? value.map((entry) => labelFor('conditions', entry)).join(', ') : 'Nothing tricky';
    } else if (field === 'removal') text = value === 'none' ? 'Nothing to remove' : labelFor('removal', value);
    else if (field === 'gateType') text = value === 'none' ? 'No gates' : labelFor('gateType', value);
    else text = labelFor(field, value);
    const entry: ChecklistDisplayEntry = { title: FIELD_TITLES[field], value: text };
    checklistDisplay[field] = entry;
  }

  return {
    sessionId,
    trade: 'fencing',
    // Derived from the brief, not from a classifier that could flip mid-conversation: a quote the
    // customer already holds turns the results page into a comparison.
    intent: Number(checklist.existingPrice) > 0 ? 'compare_quote' : 'new_quote',
    place,
    type,
    message,
    options,
    ...(expectsSuburb ? { expects: 'suburb' as const } : {}),
    ...(expectsSuburb && suburbHint ? { suggestedSuburb: suburbHint } : {}),
    ...(noMatchReason ? { noMatchReason } : {}),
    checklistComplete,
    checklist: { ...checklist, _ui: uiOut },
    checklistDisplay,
    results: [],
    avgRatePerMeter: null,
  };
}
