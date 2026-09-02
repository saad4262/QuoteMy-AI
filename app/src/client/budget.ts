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

/** Below and above this, a "per metre" figure is a typo or a total that mentioned metres. */
const PLAUSIBLE = { min: 5, max: 2000 };

/** Only a rate. A total for the job says "$4,500" and is not something to compare a rate against. */
const PER_METRE = /\b(?:per|a|each|\/)\s*(?:lineal\s+|linear\s+|running\s+)?(?:m\b|met(?:re|er)s?)/i;

/**
 * The numbers inside one site's figure, as the site wrote them. A single price is a range of one -
 * "$85 a metre" is as usable a benchmark as "$75 to $120 a metre".
 */
export function perMetreRange(figure: string | null | undefined): { min: number; max: number } | null {
  if (!figure || !PER_METRE.test(figure)) return null;

  const found = [...figure.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)]
    .map((match) => Number(match[1]!.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value >= PLAUSIBLE.min && value <= PLAUSIBLE.max);
  if (!found.length) return null;

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

/** "$75 to $120 a metre", or "$85 a metre" when a site published one number. */
export function budgetText(budget: { perMetreMin: number; perMetreMax: number }): string {
  const money = (value: number) => '$' + value.toLocaleString();
  return budget.perMetreMin === budget.perMetreMax
    ? money(budget.perMetreMin) + ' a metre'
    : money(budget.perMetreMin) + ' to ' + money(budget.perMetreMax) + ' a metre';
}
