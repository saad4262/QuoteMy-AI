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

/** A positive number out of whatever the customer wrote - "30", "30m", "about 30", "1,200". */
export function positiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).replace(/,(?=\d{3}\b)/g, '');
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
