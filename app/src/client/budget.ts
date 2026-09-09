import { UNIT_WORDS, type QuantityUnit } from './pricing/spec.js';
import type { Budget } from './schemas.js';

/**
 * The guide figures a search answer came back with, turned into something a customer can tap.
 *
 * A rates question produces four or five sites and a range from each - "$84 to $115 a metre" - and
 * before this those numbers only existed inside a paragraph. This reads them back out as numbers so
 * one of them can be picked and carried, and that is the whole extent of it: a tapped range is a
 * comparison line on the results screen and nothing else.
 *
 * What it must never become is a price. Every figure here came off a stranger's web page about
 * fencing in general; the customer's actual price is worked out in `priceAndRank` from one
 * business's own published rates (`CONTEXT.md` §7). In particular this must never reach
 * `checklist.existingPrice` - that is a quote the customer is holding in their hand, and it filters
 * out every business that cannot beat it. A web guide doing that would hide real businesses behind
 * a number nobody quoted.
 *
 * The arithmetic is here rather than in the model for the usual reason: the model reports what a
 * page said, code reads the numbers out of it (`CONTEXT.md` §4).
 */

/** Below and above this, a per-unit figure is a typo or a total that mentioned the unit. */
const PLAUSIBLE = { min: 5, max: 2000 };

/**
 * Only a rate. A total for the job says "$4,500" and is not something to compare a rate against.
 *
 * One pattern per unit, because they overlap in the wrong direction: "per square metre" contains
 * "metre", so a metre pattern would read a tiler's $65/m2 as $65 a linear metre and compare it
 * against fencing quotes. The m2 pattern is tried on its own terms and the m pattern refuses
 * anything that says square.
 */
const PER_UNIT: Record<QuantityUnit, RegExp> = {
  m: /\b(?:per|a|each|\/)\s*(?:lineal\s+|linear\s+|running\s+)?(?:m\b|met(?:re|er)s?)(?!\s*(?:2|²|sq))/i,
  m2: /\b(?:per|a|each|\/)\s*(?:sq(?:uare)?\.?\s*)?(?:m\s*(?:2|²)|met(?:re|er)s?\s*(?:2|²)|square\s+met(?:re|er)s?)/i,
  item: /\b(?:per|a|each|\/)\s*(?:item|unit|panel|job|each)\b/i,
};

/**
 * The tiles on their own, with nobody's labour in it.
 *
 * Live output, exactly as it came back: "Porcelain, materials only: from $50 per square metre"
 * beside "supplied and installed in Melbourne: $65 to $90 per square metre". Both are true, and as
 * chips they look identical. Tapped, the first one produces "the sites you looked at said $50 a
 * square metre; these work out at $78 to $95" - a materials-only figure set against full installed
 * quotes, which makes every real business look expensive by the price of laying the floor. The
 * comparison line is the ONE thing a tapped figure ever does, so a figure that cannot be compared
 * has nothing to do.
 *
 * Read off the figure rather than judged, and only because the prompt now requires the figure to
 * say what it covers. A page that says nothing either way is still offered: the guard is for a
 * figure that has told us it is not comparable, never a guess about one that has not.
 */
const MATERIALS_ONLY =
  /\b(?:materials?|supply|tiles?)\s*(?:cost\s*)?only\b|\bonly\s+(?:the\s+)?(?:materials?|tiles?)\b|\bexcl(?:uding|\.)?\s+(?:labour|labor|installation|laying)\b|\bsupply\s+only\b/i;

/**
 * One option's range, and only one.
 *
 * A single price is a range of one - "$85 a metre" is as usable a benchmark as "$75 to $120 a
 * metre". Two ranges are not a range at all, and that is the fault this refuses. A tiling site
 * routinely publishes "ceramic materials $25-$60 per m2; porcelain materials $40-$100 per m2", and
 * read as min-and-max that is "$25 to $100" - a span across two different tiles, offered to the
 * customer as one benchmark and then set beside real quotes for the one tile they are actually
 * having laid. It looks like a figure somebody stands behind. Nobody does.
 *
 * Counted after the plausibility filter rather than before, so a paragraph that mentions a job
 * total alongside one real rate still yields that rate. More than two survivors means the sentence
 * is describing more than one thing, and there is no way to tell in code which half is theirs -
 * so it offers nothing rather than the wrong half. The prompt asks for one option's figure; this
 * is what happens on the turns it does not get one.
 */
export function guideRange(figure: string | null | undefined, unit: QuantityUnit): { min: number; max: number } | null {
  if (!figure || !PER_UNIT[unit].test(figure)) return null;
  if (MATERIALS_ONLY.test(figure)) return null;

  const found = [...figure.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)]
    .map((match) => Number(match[1]!.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value >= PLAUSIBLE.min && value <= PLAUSIBLE.max);
  if (!found.length || found.length > 2) return null;

  return { min: Math.min(...found), max: Math.max(...found) };
}

/**
 * What the client sends back when the chip is tapped, built here so no other repository has to know
 * the format. Same idea as `options[].value`: the string came from us, so reading it needs no model.
 */
export function budgetTapValue(name: string, range: { min: number; max: number }): string {
  return 'budget:' + range.min + '-' + range.max + ':' + name.replace(/[^\w .&'-]/g, '').trim().slice(0, 40);
}

const TAP = /^budget:(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?):(.*)$/;

/** Null for anything that is not one of our own chips - including a customer who types `budget:`. */
export function readBudgetTap(message: string): Budget | null {
  const match = TAP.exec(message.trim());
  if (!match) return null;

  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!(min >= PLAUSIBLE.min) || !(max <= PLAUSIBLE.max) || max < min) return null;

  return { perMetreMin: min, perMetreMax: max, source: match[3]!.trim() || null };
}

/**
 * "$75 to $120 a metre", or "$85 a square metre" when a site published one number.
 *
 * The `perMetre*` field names are the wire contract the frontend already reads, so they stay as
 * they are and mean "per the trade's unit". Renaming them would break a shipped client to make a
 * comment unnecessary.
 */
export function budgetText(budget: { perMetreMin: number; perMetreMax: number }, unit: QuantityUnit): string {
  const money = (value: number) => '$' + value.toLocaleString();
  const per = ' ' + UNIT_WORDS[unit].long;
  return budget.perMetreMin === budget.perMetreMax
    ? money(budget.perMetreMin) + per
    : money(budget.perMetreMin) + ' to ' + money(budget.perMetreMax) + per;
}
