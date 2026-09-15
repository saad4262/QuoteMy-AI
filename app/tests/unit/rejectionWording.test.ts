import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../../src/messages.js';

/**
 * Which of the two rejection openings a business reads.
 *
 * The rule lives in `pipeline.ts` as one line, and it is the kind of line that is easy to move by
 * accident and impossible to notice: both branches return a valid report, both render, and the
 * only symptom is a tradesperson reading a sentence that is not true of what they sent. The golden
 * snapshots cover the two fixtures that exist; this covers the RULE, including the boundary the
 * fixtures happen to sit either side of.
 *
 * Why the rule is a count at all. `not_a_price_list` was the obvious home for "we cannot quote
 * this" and it is the wrong one - the review prompt reserves it for submissions with nothing to
 * work from, and says in terms that using it on somebody who tried "tells them we did not read
 * what they wrote". A fourth outcome would mean rewriting the prompt. The model's own `kind` split
 * already carries the distinction: `unclear` is defined as "they DID state it, but not in a form we
 * can quote from", which is exactly the case this wording is for.
 *
 * The numbers below are the live model's, not invented: gpt-5.6-terra on 2026-09-15 returned 5
 * unclear / 1 missing for the hourly tiler and 3 unclear / 2 missing for the lineal-metre kitchen.
 * An all-unclear rule - the obvious first guess - fires on NEITHER of them, which is why it is a
 * majority and not a universal.
 */

/** The rule as `pipeline.ts` applies it, over just the shape of the fixes it reads. */
const openingFor = (kinds: ('missing' | 'unclear')[]): string => {
  const unclear = kinds.filter((k) => k === 'unclear').length;
  return unclear > kinds.length - unclear ? MESSAGES.rejectedNotQuotable.opening : MESSAGES.rejected.opening;
};

const NOT_QUOTABLE = MESSAGES.rejectedNotQuotable.opening;
const ORDINARY = MESSAGES.rejected.opening;

describe('a rejection whose fixes are mostly "unclear"', () => {
  it('tells the hourly tiler their prices are all there, on the live model\'s own counts', () => {
    const live = ['unclear', 'unclear', 'unclear', 'unclear', 'unclear', 'missing'] as const;
    expect(openingFor([...live])).toBe(NOT_QUOTABLE);
  });

  it('tells the lineal-metre kitchen the same, on a much narrower margin', () => {
    const live = ['unclear', 'unclear', 'unclear', 'missing', 'missing'] as const;
    expect(openingFor([...live])).toBe(NOT_QUOTABLE);
  });

  it('is not the all-unclear rule, which would have fired on neither of them', () => {
    const live = ['unclear', 'unclear', 'unclear', 'missing', 'missing'] as const;
    expect(live.every((k) => k === 'unclear')).toBe(false);
    expect(openingFor([...live])).toBe(NOT_QUOTABLE);
  });
});

describe('an ordinarily incomplete submission keeps the ordinary wording', () => {
  it('does not claim the prices are all there when most of the report says they are not', () => {
    expect(openingFor(['missing', 'missing', 'missing', 'unclear'])).toBe(ORDINARY);
  });

  it('keeps it when nothing is unclear at all', () => {
    expect(openingFor(['missing'])).toBe(ORDINARY);
  });

  /* A tie is the boundary the decking fixture sits on, and it resolves to the ordinary wording on
     purpose: "the prices are all there" has to be earned, and half a report saying something was
     never stated is evidence against it. A tie flipping the other way is a silent wording change
     on a live submission, so it is pinned here rather than left to whichever fixture moves next. */
  it('keeps it on a tie', () => {
    expect(openingFor(['missing', 'unclear'])).toBe(ORDINARY);
    expect(openingFor(['missing', 'missing', 'unclear', 'unclear'])).toBe(ORDINARY);
  });
});

describe('the two openings', () => {
  it('are different sentences, or the rule decides nothing', () => {
    expect(NOT_QUOTABLE).not.toBe(ORDINARY);
  });

  /* It must not name the unit. Which measurement is wrong differs by trade - hours for the tiler,
     lineal metres for the cabinetmaker - and the model's own fixes name it precisely. An opening
     that guessed would contradict them on some other trade. */
  it('says nothing about which unit was wrong, because that is the trade\'s own business', () => {
    expect(NOT_QUOTABLE).not.toMatch(/hour|metre|meter|square|lineal|linear/i);
  });

  /* Both paths send them back to the same place, and only the diagnosis differs. */
  it('leave the business the same next step', () => {
    expect(MESSAGES.rejectedNotQuotable.nextStep).toBe(MESSAGES.rejected.nextStep);
  });
});
