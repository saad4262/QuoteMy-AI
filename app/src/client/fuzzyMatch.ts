/**
 * Resolving whatever a customer typed, an attachment stated, or a tapped multiple-choice value,
 * back to one of the closed slugs a business publishes rates against. Ported from n8n's
 * `Merge & Decide` node - the priority order and the tie-breaking are unchanged, because they were
 * tuned against real conversations, not designed from scratch here.
 */

export const slug = (value: unknown): string =>
  String(value == null ? '' : value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const titleCase = (value: unknown): string => {
  const text = String(value).replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

/**
 * Edit distance, capped early - two strings that differ by more than 3 characters in length are
 * never close.
 *
 * Transpositions count as ONE edit, not two. Swapping a pair of adjacent letters is the single
 * most common way a person mistypes a word they know - "lenght", "hieght", "colorbnod" - and
 * plain Levenshtein charges two for it, which puts every one of them outside the threshold a
 * short word is allowed. A customer should not have to retype a word because they fumbled two
 * keys.
 */
export function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;

  let beforePrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current: number[] = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, substitution);

      // ...ab -> ...ba
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        current[j] = Math.min(current[j]!, beforePrevious[j - 2]! + 1);
      }
    }
    beforePrevious = previous;
    previous = current;
  }

  return previous[b.length]!;
}

/**
 * Resolve free text to one entry of `list`, or `null` if nothing is close enough to guess.
 *
 * Priority, first hit wins: (1) exact slug match, (2) match by display label, (3) word-overlap
 * scoring against multi-word phrases ("treated pine palings"), (4) a typo within edit distance
 * 1-2 of a slug or label, for strings of 5+ characters only (below that, an edit of one letter is
 * a different word, not a typo).
 *
 * Two equally good matches is treated as no match - "pool fence" could mean aluminium or glass
 * pool fencing, and guessing one prices a job the customer never asked for.
 */
export function oneOf(value: unknown, list: readonly string[], labelFor: (entry: string) => string): string | null {
  const wanted = slug(value);
  if (!wanted) return null;

  const exact = list.find((entry) => slug(entry) === wanted);
  if (exact !== undefined) return exact;

  const byLabel = list.find((entry) => slug(labelFor(entry)) === wanted);
  if (byLabel !== undefined) return byLabel;

  const words = wanted.split('-').filter((word) => word.length > 2);
  if (words.length) {
    const scored = list
      .map((entry) => {
        const entryWords = (slug(entry) + '-' + slug(labelFor(entry))).split('-').filter(Boolean);
        return { entry, hits: words.filter((word) => entryWords.includes(word)).length };
      })
      .filter((row) => row.hits > 0)
      .sort((a, b) => b.hits - a.hits);
    if (scored.length && (scored.length === 1 || scored[0]!.hits > scored[1]!.hits)) return scored[0]!.entry;
  }

  if (wanted.length >= 5) {
    const limit = wanted.length >= 8 ? 2 : 1;
    const close = list
      .map((entry) => ({
        entry,
        distance: Math.min(editDistance(wanted, slug(entry)), editDistance(wanted, slug(labelFor(entry)))),
      }))
      .filter((row) => row.distance <= limit)
      .sort((a, b) => a.distance - b.distance);
    if (close.length && (close.length === 1 || close[0]!.distance < close[1]!.distance)) return close[0]!.entry;
  }

  return null;
}

/**
 * Every number in a piece of text, written either way - "50 metres" and "fifty metres" both give
 * `[50]`, "1.8m" and "one point eight metres" both give `[1.8]`.
 *
 * Words matter because of the spoken front door. A caller says their length out loud and the
 * transcriber is free to write it either way, and the guard that checks a model-read value really
 * does appear in what the customer said (`mentioned()` in `mergeAndDecide`) looks for digits. A
 * length written as a word failed that check, so a value the model had read correctly was dropped
 * with nothing logged and the question asked again - the one failure shape this codebase treats as
 * worse than an error, because it is silent.
 *
 * Deliberately loose about what it does with prose: "one two three" is three numbers, not a
 * hundred and twenty three. Nothing here decides anything on its own - every caller is checking
 * whether a number it already holds was spoken, so an extra number costs nothing and a missed one
 * costs a dropped answer.
 */
const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

export function numbersIn(text: string): number[] {
  const found: number[] = [];
  let whole: number | null = null;
  /** Digits said after the word "point", collected as text so "one point zero five" stays 1.05. */
  let decimals: string | null = null;

  const flush = () => {
    if (whole !== null) found.push(decimals ? Number(`${whole}.${decimals}`) : whole);
    whole = null;
    decimals = null;
  };

  for (const token of String(text).toLowerCase().replace(/,(?=\d{3}\b)/g, '').split(/[^a-z0-9.]+/)) {
    if (!token) continue;

    const digits = token.match(/^\d+(?:\.\d+)?/);
    if (digits) {
      flush();
      found.push(Number(digits[0]));
      continue;
    }

    if (token === 'point' && whole !== null && decimals === null) {
      decimals = '';
      continue;
    }

    const unit = UNITS[token];
    const ten = TENS[token];

    if (decimals !== null) {
      // Only single digits belong after the point; anything else ends the number.
      if (unit !== undefined && unit < 10) {
        decimals += String(unit);
        continue;
      }
      flush();
    }

    if (unit !== undefined) {
      // "twenty five" is one number; "one two" is two. A tens word is the only thing a unit joins.
      if (whole !== null && whole % 10 !== 0) flush();
      whole = (whole ?? 0) + unit;
      continue;
    }
    if (ten !== undefined) {
      if (whole !== null && whole % 100 === 0) whole += ten; // "a hundred and twenty"
      else {
        flush();
        whole = ten;
      }
      continue;
    }
    if (token === 'hundred') {
      whole = (whole || 1) * 100;
      continue;
    }
    if (token === 'thousand') {
      whole = (whole || 1) * 1000;
      continue;
    }
    // "a hundred and twenty" - carriers that sit inside a number rather than ending it.
    if ((token === 'and' || token === 'a') && whole !== null) continue;

    flush();
  }

  flush();
  return found.filter((value) => Number.isFinite(value));
}

/** A positive number out of whatever the customer wrote - "30", "30m", "about 30", "1,200". */
/**
 * What a customer typed, converted into the unit the field is actually kept in.
 *
 * "Roughly how many square metres?" gets answered every way a person measures a room: "100", "3 by
 * 4 metres", "100 sq ft", "12 square yards". All of them are the same fact, and refusing the ones
 * that need a multiplication or a conversion means asking somebody to do the sum for us before we
 * will listen to them.
 *
 * THE SUM IS DONE HERE, IN CODE, AND NOT BY THE MODEL. `CLAUDE.md` non-negotiable 4 stands as it
 * is: a model that multiplies once will multiply where it should not, and 6 x 4 has exactly one
 * answer that never needs a second opinion. The chat prompt allows the model to convert too, for
 * wordings this cannot parse, and where both read the same message they agree.
 *
 * A RANGE IS STILL NOT AN ANSWER. "20-25" has no correct conversion - the midpoint, the low end and
 * the high end are three different inventions - so it is refused and the question comes round again.
 */
const DIMENSIONS = /(\d+(?:\.\d+)?)\s*(?:x|×|\*|by)\s*(\d+(?:\.\d+)?)/i;
const RANGE = /\d+(?:\.\d+)?\s*(?:-|–|—|to|or)\s*\d+/i;

/** Multiply by these to reach the field's own unit. Areas convert as areas, lengths as lengths. */
const TO_SQUARE_METRES: [RegExp, number][] = [
  [/\b(sq\.?\s*ft|sqft|square\s+f(?:ee|oo)t|ft2|ft²)\b/i, 0.092903],
  [/\b(sq\.?\s*yd|square\s+yards?|yd2|yd²)\b/i, 0.836127],
  [/\b(sq\.?\s*in|square\s+inch(?:es)?|in2|in²)\b/i, 0.00064516],
];
const TO_METRES: [RegExp, number][] = [
  [/\b(f(?:ee|oo)t|ft)\b/i, 0.3048],
  [/\b(yards?|yds?)\b/i, 0.9144],
  [/\b(inch(?:es)?|in\.)\b/i, 0.0254],
  [/\b(cm|centimet(?:re|er)s?)\b/i, 0.01],
  [/\b(mm|millimet(?:re|er)s?)\b/i, 0.001],
];

/** Two decimals: 100 square feet is 9.29 square metres, and pretending to more is false precision. */
const tidy = (n: number): number => Math.round(n * 100) / 100;

export function measureFrom(value: unknown, unit: 'm2' | 'm'): number | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).replace(/,(?=\d{3}\b)/g, '');
  if (RANGE.test(text) && !DIMENSIONS.test(text)) return null;

  const factors = unit === 'm2' ? TO_SQUARE_METRES : TO_METRES;
  // A linear unit on an area answer converts as a LENGTH on each side - "10 by 12 feet" is two
  // measurements in feet, not an area in square feet.
  const linear = unit === 'm2' ? TO_METRES : [];

  const sides = text.match(DIMENSIONS);
  if (sides) {
    // Two sides of a room. Only an area can be built this way; a length has no second side.
    if (unit !== 'm2') return null;
    const each = linear.find(([re]) => re.test(text))?.[1] ?? 1;
    const area = Number(sides[1]) * each * (Number(sides[2]) * each);
    return Number.isFinite(area) && area > 0 ? tidy(area) : null;
  }

  /* Read here rather than through `positiveNumber`, which refuses a foreign unit outright - that
     refusal is what protects a field with no conversion; this function IS the conversion. */
  const found = text.match(/-?\d+(?:\.\d+)?/);
  const plain = found ? Number(found[0]) : NaN;
  if (!Number.isFinite(plain) || plain <= 0) return null;
  const factor = factors.find(([re]) => re.test(text))?.[1];
  if (factor) return tidy(plain * factor);
  // A length unit written against an area, with no second side: "100 feet" of floor is not an area,
  // and guessing which they meant is worse than asking.
  if (linear.some(([re]) => re.test(text))) return null;
  return plain;
}

/**
 * Two numbers with something between them: a range, or a room measured side by side. Neither is one
 * answer, and picking the first is the quiet way to get it wrong - "3 by 4 metres" read as 3 quotes
 * a quarter of the floor, and "20-25" read as 20 picks the end that suits us.
 */
const TWO_NUMBERS = /\d+(?:\.\d+)?\s*(?:-|–|—|x|×|\*|by|to|or)\s*\d+/i;

/** Units this product does not work in. 100 square feet is 9 square metres, not 100 of them. */
const NOT_METRIC = /\b(sq\.?\s*ft|sqft|square\s+f(?:ee|oo)t|f(?:ee|oo)t|ft|inch(?:es)?|in\.|yards?|yds?)\b/i;

/**
 * One number out of what somebody typed - and NOTHING when what they typed is not one number.
 *
 * The first number in the string used to win outright, which is right for "about 100" and "100m2"
 * and silently wrong for everything below. It reads as the system having understood them, and the
 * error surfaces as a total, by which point nobody can see where it came from.
 *
 * Refusing leaves the field unanswered, so the question comes round again. That costs a turn; a
 * quote against a quarter of the real floor costs the job.
 */
export function positiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).replace(/,(?=\d{3}\b)/g, '');
  if (TWO_NUMBERS.test(text) || NOT_METRIC.test(text)) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Any height spelling reduced to the one form businesses key their rate tables with: `"1.8m"`.
 * `"1800"`, `"1800mm"`, `"180cm"`, `"1.8 m"` all land on the same key, so they stop being four
 * different misses against a rate table that only ever has one entry for 1.8 metres.
 */
export function heightKeyFrom(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim().toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  let metres = Number(match[1]);
  if (!Number.isFinite(metres) || metres <= 0) return null;
  if (/mm\b/.test(text) || metres > 300) metres /= 1000;
  else if (/cm\b/.test(text) || metres > 10) metres /= 100;
  if (metres <= 0 || metres > 10) return null;
  return String(Math.round(metres * 1000) / 1000) + 'm';
}

const NOTHING =
  /^\s*(none|no|nope|nil|n\/?a|nothing|nothing tricky|all good|its fine|it'?s fine|flat|easy|clear|standard)\b/i;

/**
 * A free-text or array answer parsed into a set of condition slugs. An explicit "nothing / none /
 * all good" is a valid EMPTY answer (`[]` — asked and confirmed none), which is different from
 * `null` (not asked yet). That distinction is what stops the site-conditions question being
 * re-asked forever once a customer has genuinely said there's nothing tricky.
 */
export function conditionsFrom(value: unknown, list: readonly string[], labelFor: (entry: string) => string): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) && value.length === 0) return [];
  const entries = Array.isArray(value) ? value : String(value).split(/[,;/&]|\band\b|\bplus\b/i);
  const found: string[] = [];
  let sawNothing = false;
  for (const entry of entries) {
    const text = String(entry == null ? '' : entry).trim();
    if (!text) continue;
    if (slug(text) === 'none' || NOTHING.test(text)) {
      sawNothing = true;
      continue;
    }
    const hit = oneOf(text, list, labelFor);
    if (hit) found.push(hit);
  }
  if (found.length) return [...new Set(found)];
  return sawNothing ? [] : null;
}

export { NOTHING };
