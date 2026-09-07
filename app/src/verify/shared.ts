/**
 * The gates every trade's verifier runs, and the only part of verification that is not about one
 * trade's shape.
 *
 * Ported from the n8n `Format Extraction` Code node, near-verbatim, because it was tested. Three
 * gates, all of them still needed even with strict `json_schema`:
 *   1. vocabulary  — strict schema should make drift impossible; this is the belt to its braces,
 *                    because vocabulary drift is the one failure here that is silent and permanent
 *   2. quote match — every number must carry the exact sentence it came from, and that sentence
 *                    must really appear in the business's text. No match means it was invented
 *   3. bounds      — testing caught an $8500/m rate whose source sentence genuinely existed
 *
 * Gates 2 and 3 live here because they are arithmetic and string matching, identical whether the
 * number is a price per metre or a price per square metre. Gate 1 is each trade's own closed lists,
 * so it stays in that trade's verifier next to the values it enforces.
 *
 * `unmapped` is passed in rather than returned: a business is told about every figure that was
 * dropped and why, and `take` has to be able to add to that list from inside a loop it is capping.
 */

export interface Checks {
  /** The sentence the model says a number came from, found in what the business actually wrote. */
  quoted: (q: string | null | undefined) => boolean;
  /** A real, positive, in-range number. Not a bounds POLICY - each trade passes its own max. */
  num: (n: unknown, max: number) => n is number;
  str: (s: unknown) => string | null;
  /** Caps a section, and says so, rather than silently keeping the first N. */
  take: <T>(list: T[], cap: number) => T[];
  strList: (v: string[], cap: number) => string[];
}

/** One section of a submission can be long; nothing sensible has 200 entries in it. */
export const MAX_ENTRIES = 200;

export function makeChecks(sourceText: string, unmapped: string[]): Checks {
  const rawText = sourceText.toLowerCase();

  const quoted = (q: string | null | undefined) => {
    const s = String(q ?? '').trim();
    return s ? rawText.includes(s.toLowerCase()) : false;
  };

  const num = (n: unknown, max: number): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= max;

  const str = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim() : null);

  function take<T>(list: T[], cap: number): T[] {
    if (list.length > cap) {
      unmapped.push(
        `Only the first ${cap} entries were read from one section - your description may list more than we can store.`,
      );
    }
    return list.slice(0, cap);
  }

  const strList = (v: string[], cap: number) =>
    v.map(str).filter((s): s is string => Boolean(s)).slice(0, cap);

  return { quoted, num, str, take, strList };
}
