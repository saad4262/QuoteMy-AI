import { suburbCandidates, type ResolvedLocation } from '../geocode.js';
import { slug } from './fuzzyMatch.js';
import type { Place, PlaceHint, UiState } from './schemas.js';

/**
 * The suburb, resolved from what the customer actually said.
 *
 * Until now `place` could only ever come from the browser's own Google Places picker, which meant
 * a suburb needed a screen. That is what made voice unfinishable: `isMissing('suburb')` tests the
 * geocoded object, not the words, so a spoken suburb could never satisfy it and the question came
 * back for ever. Doing the lookup on this side answers it once for both front doors - the picker
 * still wins when it is used, and typing or saying a suburb now works everywhere.
 *
 * Two candidates are treated very differently from one. One is an answer. Several is a question,
 * because Australia has a Richmond in four states and choosing between them silently produces
 * quotes from businesses 900 km away - a failure with no error anywhere in it.
 */

export interface SuburbResolution {
  /** Exactly one match: usable as the answer. */
  place: Place | null;
  /** Several matches: read them back and let the customer pick. */
  choices: PlaceHint[];
}

const NOTHING: SuburbResolution = { place: null, choices: [] };

const labelOf = (found: ResolvedLocation): string =>
  [found.suburb, found.state, found.postcode].filter(Boolean).join(', ');

const hintOf = (found: ResolvedLocation): PlaceHint => ({
  latitude: found.lat,
  longitude: found.lng,
  suburb: found.suburb!,
  state: found.state,
  postcode: found.postcode,
  displayLabel: labelOf(found),
});

export interface ResolveSuburbInput {
  /** Whatever the browser sent, or carried in `_ui`. A picked place always wins over a lookup. */
  place: Place | null;
  ui: UiState | null;
  message: string;
  /** What the model read as a place name in this turn's message. */
  suggestedSuburb: string | null;
}

/**
 * What to send to Google, or nothing.
 *
 * A postcode is the precise answer and is why the question asks for one, but four digits only mean
 * a postcode while the suburb is what is being asked - `3000` on the length question is three
 * kilometres of fence, and geocoding it would put the customer in Melbourne's CBD.
 */
function queryFrom(input: ResolveSuburbInput): string | null {
  const onSuburbQuestion = !input.ui?.lastAsked || input.ui.lastAsked === 'suburb';
  const named = input.suggestedSuburb?.trim() || null;
  const postcode = onSuburbQuestion ? (input.message.match(/\b\d{4}\b/) ?? [])[0] ?? null : null;

  if (named && postcode) return `${named} ${postcode}`;
  if (named) return named;
  if (postcode) return postcode;

  /* Nothing was extracted, but the suburb is the question and the answer was short. A voice turn
     is the case this exists for: "Pakenham" on its own reaches the model as a sentence with no
     verb in it, and it does not always come back as a suggestion. Anything longer than a few
     words is a sentence, and Google reads sentences as street addresses. */
  const words = input.message.trim().split(/\s+/).filter(Boolean);
  if (onSuburbQuestion && words.length > 0 && words.length <= 5 && /[a-z]/i.test(input.message)) {
    return input.message.trim();
  }
  return null;
}

export async function resolveSuburb(input: ResolveSuburbInput): Promise<SuburbResolution> {
  // Already answered. A place carried in `_ui` is the same answer given on an earlier turn.
  if (input.place ?? input.ui?.place) return NOTHING;

  /* They are picking one of the places we offered last turn. `mergeAndDecide` resolves that from
     `nearbyPlaces` with the coordinates it already has; going back to Google would return the same
     ambiguous list and ask the same question again, for ever. */
  const offered = input.ui?.nearbyPlaces ?? {};
  if (offered[slug(input.message)]) return NOTHING;

  const query = queryFrom(input);
  if (!query) return NOTHING;

  const rejected = Array.isArray(input.ui?.rejectedPlaces) ? input.ui.rejectedPlaces : [];
  const found = (await suburbCandidates(query)).filter(
    (place) => !rejected.some((key) => key && slug(labelOf(place)).includes(key)),
  );

  if (found.length === 1) {
    const only = found[0]!;
    return { place: { ...hintOf(only), placeId: null, name: null }, choices: [] };
  }
  return { place: null, choices: found.map(hintOf) };
}
