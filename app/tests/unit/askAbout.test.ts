import { beforeEach, describe, expect, it } from 'vitest';
import { MockAiClient, setAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { answerQuestion, clearAnswerCache, tidyProse } from '../../src/client/askAbout.js';
import { runFencingChat } from '../../src/client/controller.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { resetChatSpend } from '../../src/client/spend.js';
import { setRepository } from '../../src/store.js';
import { MemoryRepository } from '../../src/store.js';
import { toSpeech } from '../../src/client/voice/toSpeech.js';

/**
 * The customer's own question, answered.
 *
 * The behaviour under test is not "does it search" - it is everything around the search: that a
 * question does not cost the customer their place in the conversation, that nothing the model
 * writes reaches a text-to-speech engine as a web address, and that this cannot run away with
 * money. The search itself is the provider's job and is never reached from here.
 */

/** An answer client that counts its calls, so a cache hit is provable rather than assumed. */
function answeringAi(text: string, sources: { name: string; figure: string | null }[] = []): {
  ai: AiClient;
  calls: () => number;
} {
  const inner = new MockAiClient();
  let calls = 0;
  return {
    calls: () => calls,
    ai: {
      model: 'answering',
      async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
        if (call.name !== 'answer') return inner.callStructured(call);
        calls += 1;
        return {
          data: call.schema.parse({ text, sources }),
          usage: { name: call.name, ms: 1, tokensIn: 0, tokensOut: 0, retries: 0, costUsd: 0 },
          citations: [{ title: 'hipages', url: 'https://hipages.com.au/article/colorbond' }],
        };
      },
    },
  };
}

const NOWHERE = { suburb: null, state: null, material: null, asked: null, choices: [] };

describe('tidyProse', () => {
  /**
   * Not belt and braces - the thing that actually removes them. The instructions tell the model
   * plainly to write no markdown and no web address, and on every single trial run against the
   * live API it appended an inline `([hipages.com.au](https://…))` citation anyway. A URL that
   * survives this reaches `toSpeech` and a customer hears "h t t p s colon slash slash".
   */
  it('takes out the citation the model adds however firmly it is told not to', () => {
    expect(tidyProse('hipages says $85 a metre. ([hipages.com.au](https://hipages.com.au/x?a=1)) These are guides.')).toBe(
      'hipages says $85 a metre. hipages These are guides.',
    );
  });

  /**
   * Found on a live run, not reasoned about: an answer about a fence blown over in a storm ended
   * "VICSES and Energy Safe Victoria both say to keep clear. ses.vic.gov.au" - a domain with no
   * scheme and no www, so both rules above walked straight past it. Spoken, it is read out one
   * letter at a time to somebody standing next to a fallen fence.
   */
  it('takes out a bare domain, keeping the name a person would say', () => {
    expect(tidyProse('Keep clear of the powerlines. ses.vic.gov.au')).toBe('Keep clear of the powerlines. ses');
    expect(tidyProse('hipages.com.au and Airtasker both list it.')).toBe('hipages and Airtasker both list it.');
    // A measurement is not a domain. This is the thing the rule must not touch.
    expect(tidyProse('It is 1.8m tall and 50.5 metres long.')).toBe('It is 1.8m tall and 50.5 metres long.');
  });

  it('takes out a bare address, bold, and a bullet', () => {
    expect(tidyProse('**Colorbond** costs more. See https://example.com.au/page and www.other.com.au')).toBe(
      'Colorbond costs more. See and',
    );
    expect(tidyProse('- hipages says $85\n- Yellow Pages says $75')).toBe('hipages says $85\nYellow Pages says $75');
  });

  it('leaves an ordinary sentence exactly as it is', () => {
    const plain = 'Colorbond is steel, so it will not rot and never needs painting.';
    expect(tidyProse(plain)).toBe(plain);
  });
});

describe('answering a question', () => {
  beforeEach(() => clearAnswerCache());

  it('asks once and serves the same question from memory after that', async () => {
    const model = answeringAi('Colorbond is steel and does not rot.');

    const first = await answerQuestion({ question: 'is colorbond any good?', kind: 'advice' }, NOWHERE, { ai: model.ai });
    // Same question, said differently enough to matter to a person and not to a lookup.
    const second = await answerQuestion({ question: '  Is Colorbond any good? ', kind: 'advice' }, NOWHERE, { ai: model.ai });

    expect(first?.text).toBe('Colorbond is steel and does not rot.');
    expect(second).toEqual(first);
    expect(model.calls()).toBe(1);
  });

  it('keeps rates and advice apart even when the words are identical', async () => {
    const model = answeringAi('An answer.');
    await answerQuestion({ question: 'colorbond', kind: 'advice' }, NOWHERE, { ai: model.ai });
    await answerQuestion({ question: 'colorbond', kind: 'rates' }, NOWHERE, { ai: model.ai });
    expect(model.calls()).toBe(2);
  });

  it('attaches a link only to the site the provider actually cited', async () => {
    const model = answeringAi('hipages says $85 a metre, Yellow Pages says $75.', [
      { name: 'hipages', figure: '$85 a metre' },
      { name: 'Yellow Pages', figure: '$75 a metre' },
    ]);

    const answer = await answerQuestion({ question: 'what does colorbond cost', kind: 'rates' }, NOWHERE, { ai: model.ai });

    expect(answer?.sources[0]).toEqual({
      name: 'hipages',
      figure: '$85 a metre',
      url: 'https://hipages.com.au/article/colorbond',
      // One published number is a range of one, and is as tappable as a spread.
      perMetreMin: 85,
      perMetreMax: 85,
      budgetValue: 'budget:85-85:hipages',
    });
    /* Yellow Pages was named off the search results and never opened, so there is no page to link
       to. A URL invented to fill that gap would be a citation to something nobody read. */
    expect(answer?.sources[1]?.url).toBeNull();
  });

  it('comes back with nothing when the search falls over, and does not throw', async () => {
    const failing: AiClient = {
      model: 'broken',
      async callStructured() {
        throw new Error('the provider is having a moment');
      },
    };
    await expect(answerQuestion({ question: 'anything', kind: 'advice' }, NOWHERE, { ai: failing })).resolves.toBeNull();
  });

  it('does not call anything for an empty question', async () => {
    const model = answeringAi('unused');
    expect(await answerQuestion({ question: '   ', kind: 'advice' }, NOWHERE, { ai: model.ai })).toBeNull();
    expect(model.calls()).toBe(0);
  });
});

/**
 * The turn a customer sees. The failure this guards against is the tempting one: an answer so
 * pleased with itself that it replaces the question, leaving a conversation that chats but never
 * collects a brief.
 */
describe('a question inside the conversation', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    clearAnswerCache();
    resetChatSpend();
  });

  /** Reports a question on the reading turn, and answers it on the answering turn. */
  function askingAi(question: string, kind: 'advice' | 'rates', answer: string): AiClient {
    const inner = new MockAiClient();
    return {
      model: 'asking',
      async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
        const usage = { name: call.name, ms: 1, tokensIn: 0, tokensOut: 0, retries: 0, costUsd: 0 };
        if (call.name === 'answer') return { data: call.schema.parse({ text: answer, sources: [] }), usage };
        if (call.name !== 'turn') return inner.callStructured(call);
        const base = await inner.callStructured(call);
        return { ...base, data: call.schema.parse({ ...(base.data as object), askedAbout: question, askedKind: kind }) };
      },
    };
  }

  it('answers what they asked and still asks the question that was already coming', async () => {
    const ANSWER = 'Colorbond is steel, so it will not rot.';
    setAiClient(askingAi('is colorbond better than timber?', 'advice', ANSWER));

    /* Two turns, because the first one is the opener and the question worth protecting is the one
       after it - a real question, with real choices, that the answer must not have swallowed. */
    const opener = await runFencingChat(
      { message: 'I need a fence quote', sessionId: 's1', place: '', knownChecklist: '' },
      [],
      { repo },
    );
    const response = await runFencingChat(
      {
        message: 'is colorbond better than timber?',
        sessionId: 's1',
        place: JSON.stringify({ suburb: 'Berwick', state: 'VIC', latitude: -38.03, longitude: 145.34 }),
        knownChecklist: JSON.stringify(opener.checklist),
      },
      [],
      { repo },
    );

    expect(response.answer?.text).toBe(ANSWER);
    // In front of the question, not instead of it. Both halves have to be there.
    expect(response.message.startsWith(ANSWER)).toBe(true);
    const withoutAnswer = response.message.slice(ANSWER.length).trim();
    expect(withoutAnswer.length).toBeGreaterThan(0);
    expect(withoutAnswer).toMatch(/\?$/);
    // The brief is still being collected rather than replaced by a chat about fencing.
    expect(response.checklistPending.length).toBeGreaterThan(0);
    expect(response.options.length).toBeGreaterThan(0);
  });

  it('stops looking things up once a session has had its share', async () => {
    setAiClient(askingAi('what about colorbond', 'advice', 'An answer.'));

    let checklist = '';
    let answered = 0;
    // Seven questions asked; the seventh must not be searched.
    for (let turn = 0; turn < 7; turn += 1) {
      const response = await runFencingChat(
        { message: 'what about colorbond', sessionId: 's2', place: '', knownChecklist: checklist },
        [],
        { repo },
      );
      if (response.answer) answered += 1;
      checklist = JSON.stringify(response.checklist);
      // Each question is a separate lookup, so the cache must not be what stops it.
      clearAnswerCache();
    }

    expect(answered).toBe(6);
  });

  /**
   * Asking about a fence is not choosing one.
   *
   * Straight off a screenshot: the customer asked "which which colors availble in colorbond and
   * treated pine?" while the material question was on screen, and the brief filled itself in with
   * Treated pine - a fence they had explicitly not picked yet - and moved on to the height. Two
   * separate routes did it, and both are now shut: the model reporting a value out of a question,
   * and `mergeAndDecide`'s tapped-option path running the whole sentence through the vocabulary,
   * which finds a material anywhere in it. The second one needs no model at all.
   */
  it('does not choose a fence for somebody who was only asking about one', async () => {
    setAiClient(askingAi('is colorbond better than treated pine', 'advice', 'Colorbond needs less upkeep.'));

    const opener = await runFencingChat(
      { message: 'I need a fence quote', sessionId: 'q1', place: '', knownChecklist: '' },
      [],
      { repo },
    );
    const response = await runFencingChat(
      {
        message: 'is colorbond better than treated pine',
        sessionId: 'q1',
        place: JSON.stringify({ suburb: 'Berwick', state: 'VIC', latitude: -38.03, longitude: 145.34 }),
        knownChecklist: JSON.stringify(opener.checklist),
      },
      [],
      { repo },
    );

    // Answered, but nothing chosen on their behalf.
    expect(response.answer?.text).toBe('Colorbond needs less upkeep.');
    expect((response.checklist as Record<string, unknown>).material ?? null).toBeNull();
    // And the question they were asked is still waiting for them.
    expect(response.checklistPending.some((entry) => entry.key === 'material')).toBe(true);
  });

  /**
   * Straight off a screenshot: the material question was on screen, the customer asked "please
   * tell me first which type is better", and underneath a full six-line answer comparing the
   * three came "Sorry, I didn't catch that - what type of fence are you after?". They were
   * understood well enough to be answered; apologising for not hearing them in the same breath
   * reads as two different chats. The apology belongs to a message that landed on nothing, not to
   * one we just answered.
   */
  it('does not apologise for not catching a question it just answered', async () => {
    const ANSWER = 'Colorbond needs the least upkeep; hardwood is the better timber.';
    // The real model reports no checklist out of a question - the offline one would take the whole
    // sentence as the material, which is a different bug with its own test above.
    const inner = new MockAiClient();
    setAiClient({
      model: 'asking',
      async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
        const usage = { name: call.name, ms: 1, tokensIn: 0, tokensOut: 0, retries: 0, costUsd: 0 };
        if (call.name === 'answer') return { data: call.schema.parse({ text: ANSWER, sources: [] }), usage };
        const base = await inner.callStructured(call);
        if (call.name !== 'turn' || !call.user.includes('which type is better')) return base;
        const reported = base.data as { checklist: Record<string, unknown> };
        const checklist = { ...reported.checklist, material: null };
        return {
          ...base,
          data: call.schema.parse({ ...reported, checklist, askedAbout: 'which type of fence is better', askedKind: 'advice' }),
        };
      },
    });

    const place = JSON.stringify({ suburb: 'Pakenham', state: 'VIC', latitude: -38.07, longitude: 145.48 });
    const opener = await runFencingChat({ message: 'I need a fence quote', sessionId: 'a1', place, knownChecklist: '' }, [], { repo });
    // The turn that puts the material question on screen, so the next one is asking it again.
    const asked = await runFencingChat(
      { message: 'yes go ahead', sessionId: 'a1', place, knownChecklist: JSON.stringify(opener.checklist) },
      [],
      { repo },
    );
    expect(asked.type).toBe('question');

    const response = await runFencingChat(
      { message: 'please tell me first which type is better', sessionId: 'a1', place, knownChecklist: JSON.stringify(asked.checklist) },
      [],
      { repo },
    );

    expect(response.answer?.text).toBe(ANSWER);
    expect(response.message).not.toMatch(/didn't catch/i);
    // Still the same question, still with the choices under it - the answer rides along.
    expect(response.message.startsWith(ANSWER)).toBe(true);
    expect(response.message.trim()).toMatch(/\?$/);
    expect(response.options.length).toBeGreaterThan(0);
  });

  it('is never read out as a web address on a call', async () => {
    setAiClient(
      askingAi('what does colorbond cost', 'rates', 'hipages says $85 a metre. ([hipages.com.au](https://hipages.com.au/x))'),
    );

    const response = await runFencingChat(
      { message: 'what does colorbond cost', sessionId: 's3', place: '', knownChecklist: '' },
      [],
      { repo },
    );
    const speech = toSpeech(response);

    expect(speech).toContain('hipages');
    expect(speech).not.toContain('http');
    expect(speech).not.toContain('](');
    // `$85 a metre` still has to survive as something a speech engine says properly.
    expect(speech).toContain('85 dollars');
  });
});
