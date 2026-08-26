import { logger } from './config.js';
import { getRepository } from './store.js';
import { CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, TAGS, UNITS, type Trade } from './vocab.js';

/**
 * The per-trade vocabulary: a fixed core, and an "extra" tier that learns.
 *
 * The distinction is the whole design. `core` is what a quote is calculated from and what the
 * customer side filters on EXACTLY, so it never grows on its own - a developer edits vocab.ts and
 * deploys. `extras` is everything else a business actually offers, searched by text rather than by
 * exact match, so it can grow freely: two near-identical spellings both answer a search for
 * "bamboo", which is why drift there costs nothing and drift in the core would be permanent.
 *
 * What this module is FOR is the second business. The first one to mention bamboo screening creates
 * `bamboo-screening`; the second is shown it and reuses it instead of inventing `bamboo-screen`.
 */

export interface ExtraValue {
  label: string;
  aliases: string[];
  businessCount: number;
  firstSeen?: string;
  lastSeen?: string;
}

export interface TradeVocabulary {
  trade: Trade;
  core: {
    materials: readonly string[];
    gateTypes: readonly string[];
    conditions: readonly string[];
    removes: readonly string[];
    units: readonly string[];
    tags: readonly string[];
  };
  extras: Record<string, ExtraValue>;
}

/** `core` is a mirror of vocab.ts, never a second source of truth. */
export const coreOf = (trade: Trade): TradeVocabulary => ({
  trade,
  core: {
    materials: MATERIALS,
    gateTypes: GATE_TYPES,
    conditions: CONDITIONS,
    removes: REMOVES,
    units: UNITS,
    tags: TAGS,
  },
  extras: {},
});

/**
 * `Bamboo Screening!` -> `bamboo-screening`
 *
 * Built by code, never returned by the model - the same rule that stops height bands drifting
 * between "1.8m", "1.8" and "1800mm". A trailing plural is dropped so "bamboo screens" and
 * "bamboo screen" land on one slug without any fuzzy matching.
 */
export function slugify(label: string): string {
  const words = label
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));

  return words.join('-').slice(0, 48) || 'other';
}

/**
 * Cached for five minutes. This document changes rarely and is read on every submission, and a
 * stale read is harmless: the worst case is one submission not seeing an extra created four
 * minutes ago, so it creates its own - and the merge on write joins them.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<Trade, { at: number; value: TradeVocabulary }>();

export const clearVocabularyCache = () => cache.clear();

export async function loadVocabulary(trade: Trade): Promise<TradeVocabulary> {
  const hit = cache.get(trade);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value = coreOf(trade);
  try {
    const stored = await getRepository().getTradeVocabulary(trade);
    // core always comes from code; only the extras are read back.
    if (stored) value = { ...value, extras: stored.extras ?? {} };
  } catch (err) {
    // A vocabulary we cannot read is not a reason to refuse a submission: the core still works and
    // anything new simply lands as a fresh extra.
    logger.warn({ err, trade }, 'could not load trade vocabulary, using core only');
  }

  cache.set(trade, { at: Date.now(), value });
  return value;
}

/**
 * Which extras go into the prompt.
 *
 * Not all of them - a trade with 200 accumulated extras would add 200 lines to every call. The most
 * used, plus anything whose label or alias actually appears in this submission, so the ones that
 * matter for THIS text are always present however long the list gets.
 */
export const PROMPT_EXTRAS_LIMIT = 30;

export function extrasForPrompt(
  vocabulary: TradeVocabulary,
  text: string,
  limit = PROMPT_EXTRAS_LIMIT,
): [string, ExtraValue][] {
  const haystack = text.toLowerCase();
  const entries = Object.entries(vocabulary.extras);

  const mentioned = entries.filter(([slug, e]) =>
    [e.label, slug.replace(/-/g, ' '), ...e.aliases].some((t) => haystack.includes(t.toLowerCase())),
  );

  const rest = entries
    .filter(([slug]) => !mentioned.some(([s]) => s === slug))
    .sort((a, b) => b[1].businessCount - a[1].businessCount);

  return [...mentioned, ...rest].slice(0, limit);
}

/** The block appended to the extraction prompt. Empty until a trade has learned something. */
export function extrasPromptBlock(entries: [string, ExtraValue][]): string {
  if (!entries.length) return '';

  const lines = entries.map(([slug, e]) => {
    const also = e.aliases.length ? `   (also written: ${e.aliases.slice(0, 4).join(', ')})` : '';
    return `  ${slug.padEnd(24)} ${e.label}${also}`;
  });

  return [
    '=== THINGS OTHER BUSINESSES IN THIS TRADE OFFER ===',
    'If this business offers one of these, put it in otherOfferings and copy the slug on the left',
    'EXACTLY into the slug field. That is how two businesses selling the same thing end up filed',
    'together instead of under two different spellings.',
    '',
    'If they offer something that is on neither this list nor the material list, still put it in',
    'otherOfferings - with slug set to null and your own plain label. A new one is expected; that is',
    'what the field is for. Never force it into a material value it is not.',
    '',
    ...lines,
    '=== END ===',
  ].join('\n');
}

/**
 * Fold this submission's offerings back into the trade vocabulary, so the next business is shown
 * them. Their exact wording is kept as an alias - that is what lets the model recognise the same
 * thing next time, however it was phrased.
 */
export interface OfferingSeen {
  slug: string;
  label: string;
}

export async function recordExtras(trade: Trade, seen: OfferingSeen[]): Promise<void> {
  if (!seen.length) return;
  try {
    await getRepository().mergeTradeExtras(trade, seen);
    cache.delete(trade); // our own write, so do not serve the stale copy
  } catch (err) {
    // Losing this costs the next business a duplicate slug, not this business their submission.
    logger.warn({ err, trade }, 'could not record trade extras');
  }
}

// ------------------------------------------------------------------------------------------------
// The one place vocabulary is allowed to grow.

/**
 * The same offering, phrased differently, resolved back to the slug that already exists.
 *
 * `slugify` handles the easy half - "bamboo screens" and "bamboo screen" already land together. It
 * cannot handle "Bamboo screening", "bamboo privacy screen" or "screening - bamboo", and each of
 * those creates a second slug for one real thing. Both are then invisible to a search for the
 * other, with no error raised anywhere: `CONTEXT.md` §8's silent, permanent failure.
 *
 * Matched on words rather than on edit distance. Two offerings that share every distinctive word
 * are the same offering; two that differ by one letter usually are not ("pool glass" and "pool
 * grass"). Ties resolve to nothing, the same discipline as `oneOf` - a wrong join is worse than a
 * duplicate, because a duplicate can still be merged later and a wrong join has already lost data.
 */
/**
 * "screen" and "screening" are one word for this purpose; "pool" and "poolside" are not.
 *
 * `slugify` already drops a trailing plural, which is the common case. What it cannot do is the
 * other endings the same offering gets written with - screen/screening, paint/painted - and each of
 * those is a second slug for one real thing. A prefix is enough to join them, but only from five
 * characters: below that too many unrelated words share a start.
 */
const sameWord = (a: string, b: string): boolean => {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 5 && long.startsWith(short);
};

export function resolveExisting(label: string, extras: Record<string, ExtraValue>): string | null {
  const wanted = slugify(label).split('-').filter((word) => word.length > 2);
  if (!wanted.length) return null;

  const scored: { slug: string; shared: number }[] = [];
  for (const [slug, value] of Object.entries(extras)) {
    // Its own slug and every spelling any business has used for it.
    const known = [...new Set(
      [slug, ...(value.aliases ?? []), value.label ?? '']
        .flatMap((text) => slugify(String(text)).split('-'))
        .filter((word) => word.length > 2),
    )];
    if (!known.length) continue;

    const shared = wanted.filter((word) => known.some((entry) => sameWord(word, entry))).length;
    // Every distinctive word of the shorter phrase has to be answered by the longer one.
    if (shared && shared === Math.min(wanted.length, known.length)) scored.push({ slug, shared });
  }

  scored.sort((a, b) => b.shared - a.shared);
  if (!scored.length) return null;
  return scored.length === 1 || scored[0]!.shared > scored[1]!.shared ? scored[0]!.slug : null;
}

/**
 * How many independent businesses have to offer something before every customer is shown it.
 *
 * One business naming a thing is that business's own offering: it is recognised when a customer
 * types it, and never put on screen as one of three choices, because most businesses cannot do it
 * and offering it pushes out something everybody sells. Three is where it stops being one
 * business's word for something and starts being the trade's.
 */
export const PROMOTE_AT = 3;

/** Which extras have earned a place in the trade's own vocabulary. */
export function readyForPromotion(extras: Record<string, ExtraValue>, core: readonly string[]): string[] {
  return Object.entries(extras)
    .filter(([slug, value]) => value.businessCount >= PROMOTE_AT && !core.includes(slug))
    .map(([slug]) => slug);
}
