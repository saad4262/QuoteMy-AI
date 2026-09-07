import { beforeEach, describe, expect, it } from 'vitest';
import { budgetTapValue, budgetText, guideRange, readBudgetTap } from '../../src/client/budget.js';
import { runChat } from '../../src/client/controller.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { setAiClient } from '../../src/ai.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import type { Checklist, Place } from '../../src/client/schemas.js';
import { BERWICK, seedBusiness } from '../golden/conversations.js';

/**
 * A guide figure the customer tapped off a rates answer.
 *
 * The whole of what it may do is appear beside the real quotes at the end. Everything below is
 * about the things it must NOT do, because every one of them is a way for a number off a stranger's
 * web page to start behaving like a price somebody quoted.
 */

describe('reading a figure', () => {
  it('reads a range, a single price, and a comma', () => {
    expect(guideRange('$84 to $115 a metre installed', 'm')).toEqual({ min: 84, max: 115 });
    expect(guideRange('$85 a metre', 'm')).toEqual({ min: 85, max: 85 });
    expect(guideRange('$1,200 per metre', 'm')).toEqual({ min: 1200, max: 1200 });
  });

  /* A total for the whole job is the one figure that would do real damage here: shown as a rate it
     is off by the length of the fence, and the customer reads it as what a metre costs. */
  it('is not fooled by a total, a percentage or a figure with no unit', () => {
    expect(guideRange('$4,500 for a 30 metre fence', 'm')).toBeNull();
    expect(guideRange('about 15% more than treated pine', 'm')).toBeNull();
    expect(guideRange('$85', 'm')).toBeNull();
    expect(guideRange(null, 'm')).toBeNull();
  });

  // Bounds, not judgement: $2 a metre is a typo and $9,000 a metre is a misread total.
  it('drops a figure outside what fencing costs', () => {
    expect(guideRange('$2 a metre', 'm')).toBeNull();
    expect(guideRange('$9,000 a metre', 'm')).toBeNull();
  });

  /* A square-metre trade is the reason this takes a unit at all. "Per square metre" CONTAINS
     "metre", so a metre pattern reads a tiler's $65/m2 as $65 a linear metre and then compares it
     against fencing quotes - a guide figure off by the width of the room, shown as though somebody
     had quoted it. */
  it('will not read a square-metre figure as a linear-metre one', () => {
    expect(guideRange('$65 per square metre', 'm')).toBeNull();
    expect(guideRange('$65 per m2', 'm')).toBeNull();
    expect(guideRange('$65 per m²', 'm')).toBeNull();

    expect(guideRange('$65 per square metre', 'm2')).toEqual({ min: 65, max: 65 });
    expect(guideRange('$55 to $90 per m2 laid', 'm2')).toEqual({ min: 55, max: 90 });
    expect(guideRange('$65 per m²', 'm2')).toEqual({ min: 65, max: 65 });

    // And the other way: a linear-metre figure is not a square-metre one.
    expect(guideRange('$85 a metre', 'm2')).toBeNull();
  });

  it('says the unit it read the figure in', () => {
    expect(budgetText({ perMetreMin: 85, perMetreMax: 85 }, 'm')).toBe('$85 a metre');
    expect(budgetText({ perMetreMin: 65, perMetreMax: 90 }, 'm2')).toBe('$65 to $90 a square metre');
  });

  it('reads back only its own chips', () => {
    const value = budgetTapValue('hipages', { min: 75, max: 120 });
    expect(value).toBe('budget:75-120:hipages');
    expect(readBudgetTap(value)).toEqual({ perMetreMin: 75, perMetreMax: 120, source: 'hipages' });
    expect(readBudgetTap('budget: about eighty a metre')).toBeNull();
    expect(readBudgetTap('colorbond')).toBeNull();
  });
});

describe('tapping one inside the conversation', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
  });

  /** Every turn of a conversation, driven the way the client drives it. */
  async function say(script: { text: string; place?: Place }[]) {
    let checklist: Checklist | null = null;
    let place: Place | null = null;
    let response = null as Awaited<ReturnType<typeof runChat>> | null;

    for (const turn of script) {
      if (turn.place) place = turn.place;
      response = await runChat(
        {
          message: turn.text,
          sessionId: 'budget',
          place: place ? JSON.stringify(place) : '',
          knownChecklist: checklist ? JSON.stringify(checklist) : '',
        },
        [],
        { repo },
      );
      checklist = response.checklist;
      place = response.place ?? null;
    }
    return response!;
  }

  /**
   * The failure this exists for: a tap is resolved against the question on screen, in code, with no
   * model involved - so a chip left in the message would have been read as the answer to it. The
   * customer taps a price and their fence type is now "budget:75-120:hipages".
   */
  it('does not let the chip answer the question that was on screen', async () => {
    seedBusiness(repo, 'biz-b1', 'Southeast Fencing');
    const response = await say([
      { text: 'I need a fence quote' },
      { text: 'yes go ahead' },
      { text: 'Berwick', place: BERWICK },
      { text: budgetTapValue('hipages', { min: 75, max: 120 }) },
    ]);

    expect(response.checklist.material ?? null).toBeNull();
    expect(response.checklistPending.some((entry) => entry.key === 'material')).toBe(true);
    // The same question, put again, with its own choices still under it.
    expect(response.type).toBe('question');
    expect(response.options.length).toBeGreaterThan(0);
    expect(response.message).toContain('$75 to $120 a metre');
    expect(response.checklist._ui?.budget).toEqual({ perMetreMin: 75, perMetreMax: 120, source: 'hipages' });
  });

  /**
   * The one that would do damage silently. `existingPrice` is a quote the customer holds, and it
   * filters out every business that cannot beat it - so a web guide landing there hides real
   * businesses behind a number nobody quoted.
   */
  it('never becomes the quote the customer is holding', async () => {
    seedBusiness(repo, 'biz-b2', 'Southeast Fencing');
    const response = await say([
      { text: 'I need a fence quote' },
      { text: 'yes go ahead' },
      { text: 'Berwick', place: BERWICK },
      { text: budgetTapValue('hipages', { min: 20, max: 30 }) },
    ]);

    expect(response.checklist.existingPrice ?? null).toBeNull();
    expect(response.intent).toBe('new_quote');
  });

  /**
   * The point of the whole feature, and its limit in the same assertion: the guide is said next to
   * the quotes, and the quotes are exactly the ones that would have been shown without it. The
   * seeded business charges $110 a metre - well outside the $20-$30 the customer tapped - and is
   * still there, because a web page does not get to disqualify a business.
   */
  it('shows the guide beside the real quotes without changing them', async () => {
    seedBusiness(repo, 'biz-b3', 'Southeast Fencing');
    const brief = (extra: { text: string; place?: Place }[]) => [
      { text: 'I need a fence quote' },
      { text: 'yes go ahead' },
      { text: 'Berwick', place: BERWICK },
      ...extra,
      { text: 'colorbond' },
      { text: '1.8m' },
      { text: '20' },
      { text: 'none' },
      { text: 'none' },
      { text: 'none' },
      { text: 'yes' },
    ];

    const withGuide = await say(brief([{ text: budgetTapValue('hipages', { min: 20, max: 30 }) }]));
    const without = await say(brief([]));

    expect(withGuide.message).toContain('The sites you looked at said $20 to $30 a metre');
    expect(withGuide.message).toContain('these work out at $110 a metre');
    expect(withGuide.comparison?.marketGuide).toEqual({ perMetreMin: 20, perMetreMax: 30, source: 'hipages' });
    // Same businesses, same money, same order.
    expect(withGuide.results).toEqual(without.results);
    expect(withGuide.comparison?.potentialSavings).toBe(without.comparison?.potentialSavings);
    expect(without.comparison?.marketGuide).toBeUndefined();
  });

  /**
   * A tap on the recap turn. The customer has been asked "all correct?" and has answered neither
   * yes nor no, which is the branch that says "Sorry - is that all correct?" - an odd thing to say
   * to somebody who just tapped a price. The recap is simply put again, under the same note.
   */
  it('puts the recap again when the tap lands on the confirmation', async () => {
    seedBusiness(repo, 'biz-b5', 'Southeast Fencing');
    const response = await say([
      { text: 'I need a fence quote' },
      { text: 'yes go ahead' },
      { text: 'Berwick', place: BERWICK },
      { text: 'colorbond' },
      { text: '1.8m' },
      { text: '20' },
      { text: 'none' },
      { text: 'none' },
      { text: 'none' },
      { text: budgetTapValue('hipages', { min: 75, max: 120 }) },
    ]);

    expect(response.type).toBe('confirmation');
    expect(response.message).toContain('$75 to $120 a metre');
    expect(response.message).toContain('Berwick');
    expect(response.message).toMatch(/All correct\?$/);
    expect(response.options.map((option) => option.value)).toEqual(['yes', 'no']);
  });

  /** A tap is our own string. Sending it to the model to be told what it means is money for nothing. */
  it('costs no model call', async () => {
    seedBusiness(repo, 'biz-b4', 'Southeast Fencing');
    setAiClient({
      model: 'never',
      async callStructured() {
        throw new Error('the model must not be called for a tapped chip');
      },
    });

    const response = await say([{ text: budgetTapValue('hipages', { min: 75, max: 120 }) }]);
    expect(response.checklist._ui?.budget?.perMetreMin).toBe(75);
  });
});
