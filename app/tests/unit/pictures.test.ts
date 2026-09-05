import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockAiClient, setAiClient, type AiClient, type ModelCall, type ModelResult } from '../../src/ai.js';
import { env } from '../../src/config.js';
import { clearAnswerCache } from '../../src/client/askAbout.js';
import { runFencingChat } from '../../src/client/controller.js';
import { clearPictureCache, findPictures, imageQuery, PICTURES_LINE } from '../../src/client/pictures.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { resetChatSpend } from '../../src/client/spend.js';
import { toSpeech } from '../../src/client/voice/toSpeech.js';
import { runVoiceTurn } from '../../src/client/voice/controller.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import type { Checklist, Place } from '../../src/client/schemas.js';
import { BERWICK, seedBusiness } from '../golden/conversations.js';

/**
 * "Show me what colorbond looks like."
 *
 * Everything here is about the boundary rather than the search: a photo off a stranger's website
 * may be looked at and nothing else. It must not become an option, must not answer the question on
 * screen, must not reach the checklist or the price, and must not take the turn down when the
 * search is unavailable. The search itself is Serper's job and is never reached from a test.
 */

const IMAGE = (n: number, domain: string, width = 800) => ({
  title: 'A fence',
  imageUrl: `https://${domain}/photo-${n}.jpg`,
  thumbnailUrl: `https://encrypted-tbn0.gstatic.com/images?q=${n}`,
  imageWidth: width,
  imageHeight: 600,
  source: domain,
  domain,
});

function serperReturns(images: unknown[], ok = true) {
  const fetcher = vi.fn(async () => ({ ok, status: ok ? 200 : 429, json: async () => ({ images }) }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

describe('what to search for', () => {
  /* What they named survives; the asking around it does not. "Post and rail" has to reach Google
     whether or not this marketplace has ever heard of it - that is the case pictures matter most
     in - and "show me" is five characters of noise competing with it. */
  it('searches for what they named, not for the asking around it', () => {
    expect(imageQuery('show me post and rail', null)).toBe('post and rail fence australia');
  });

  /**
   * Measured against the live API, not reasoned about. Sent whole, this came back with photographs
   * of ordinary fences - one word about colour against five about nothing. Stripped, it comes back
   * with colours.
   */
  it('leaves the one word that was doing the work', () => {
    expect(imageQuery('what colours does it come in', 'Treated pine')).toBe('colours treated pine fence australia');
  });

  /* Three questions in, "it" is the fence they already chose - and once the asking is taken out of
     that sentence there is nothing else left in it at all. */
  it('falls back to the fence they chose when the question is all asking', () => {
    expect(imageQuery('what does it look like', 'Colorbond')).toBe('colorbond fence australia');
  });

  it('does not say it twice when they named it themselves', () => {
    expect(imageQuery('show me colorbond fences', 'Colorbond')).toBe('colorbond fences australia');
  });

  /* Nothing named, nothing chosen, nothing left after stripping. Their own sentence is a weak
     search and an empty one is not a search at all. */
  it('keeps their sentence rather than searching for nothing', () => {
    expect(imageQuery('have you got a picture', null)).toBe('have you got a picture fence australia');
  });
});

describe('looking pictures up', () => {
  beforeEach(() => {
    clearPictureCache();
    (env as { SERPER_API_KEY?: string }).SERPER_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (env as { SERPER_API_KEY?: string }).SERPER_API_KEY;
  });

  /**
   * The one that would embarrass us. An image search for a fence type returns one fencing
   * company's gallery four times over, so a customer's first look at "Colorbond" would be four
   * photos of a competitor's work inside our own chat. Different sites come first; nothing is
   * thrown away, the repeats just follow.
   */
  it('leads with a different site each time', async () => {
    serperReturns([
      IMAGE(1, 'onecompany.com.au'),
      IMAGE(2, 'onecompany.com.au'),
      IMAGE(3, 'onecompany.com.au'),
      IMAGE(4, 'bunnings.com.au'),
      IMAGE(5, 'colorbond.com'),
    ]);

    const images = await findPictures('show me colorbond', null);
    expect(images.map((image) => image.sourceName)).toEqual([
      'onecompany.com.au', 'bunnings.com.au', 'colorbond.com', 'onecompany.com.au', 'onecompany.com.au',
    ]);
    expect(images[0]!.thumbUrl).toContain('gstatic.com');
  });

  // A 60px image is a logo or a colour chip, not a photo of a fence.
  it('drops the logos', async () => {
    serperReturns([IMAGE(1, 'a.com', 60), IMAGE(2, 'b.com', 900), { title: 'no url at all' }]);
    expect(await findPictures('colorbond', null)).toHaveLength(1);
  });

  it('asks once for the same thing all week', async () => {
    const fetcher = serperReturns([IMAGE(1, 'a.com')]);
    await findPictures('show me colorbond', null);
    await findPictures('Show me colorbond!', null);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  /* Same trade as a geocoding outage: the pictures are worth having and never worth the turn. */
  it('comes back empty rather than throwing when the search is down', async () => {
    serperReturns([], false);
    expect(await findPictures('colorbond', null)).toEqual([]);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    clearPictureCache();
    expect(await findPictures('colorbond', null)).toEqual([]);
  });

  it('does not reach the network at all without a key', async () => {
    delete (env as { SERPER_API_KEY?: string }).SERPER_API_KEY;
    const fetcher = serperReturns([IMAGE(1, 'a.com')]);
    expect(await findPictures('colorbond', null)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('inside the conversation', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache();
    clearAnswerCache();
    clearPictureCache();
    resetChatSpend();
    (env as { SERPER_API_KEY?: string }).SERPER_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (env as { SERPER_API_KEY?: string }).SERPER_API_KEY;
  });

  /** Reports "show me what that looks like" on the turn it is said, and counts the prose calls. */
  function showMeAi(
    said: string,
    kind: 'advice' | 'rates' | null = null,
    pictureOf: string | null = 'colorbond',
    /** What the model reported as their fence type, when it read the naming as a choice. */
    material: string | null = null,
    /** The question on its own, when it is only part of what they said. */
    askedAbout: string = said,
  ): { ai: AiClient; prose: () => number } {
    const inner = new MockAiClient();
    let prose = 0;
    return {
      prose: () => prose,
      ai: {
        model: 'showing',
        async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
          const usage = { name: call.name, ms: 1, tokensIn: 0, tokensOut: 0, retries: 0, costUsd: 0 };
          if (call.name === 'answer') {
            prose += 1;
            return { data: call.schema.parse({ text: 'Colorbond is steel sheeting.', sources: [] }), usage };
          }
          const base = await inner.callStructured(call);
          if (call.name !== 'turn' || !call.user.includes(said)) return base;
          // The real model reports no checklist out of a question; the offline one would take the
          // whole sentence as the material.
          const reported = base.data as { checklist: Record<string, unknown> };
          return {
            ...base,
            data: call.schema.parse({
              ...reported,
              checklist: { ...reported.checklist, material },
              askedAbout,
              askedKind: kind,
              pictureOf,
            }),
          };
        },
      },
    };
  }

  async function say(script: { text: string; place?: Place }[]) {
    let checklist: Checklist | null = null;
    let place: Place | null = null;
    let response = null as Awaited<ReturnType<typeof runFencingChat>> | null;

    for (const turn of script) {
      if (turn.place) place = turn.place;
      response = await runFencingChat(
        {
          message: turn.text,
          sessionId: 'pictures',
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

  const upToMaterial = (asked: string) => [
    { text: 'I need a fence quote' },
    { text: 'yes go ahead' },
    { text: 'Berwick', place: BERWICK },
    { text: asked },
  ];

  /**
   * The whole feature, and its limit in the same test: photos come back, and the question they were
   * asked is still on screen with its own choices under it. A picture is not a choice - it came off
   * a stranger's website and nobody quoted it.
   */
  it('shows the photos and leaves the question standing', async () => {
    serperReturns([IMAGE(1, 'bunnings.com.au'), IMAGE(2, 'colorbond.com')]);
    const { ai, prose } = showMeAi('show me what colorbond looks like');
    setAiClient(ai);

    const response = await say(upToMaterial('show me what colorbond looks like'));

    expect(response.answer?.kind).toBe('looks');
    expect(response.answer?.images).toHaveLength(2);
    expect(response.message).toContain(PICTURES_LINE);
    // Asked again, with the real choices - and not one of them is a photo.
    expect(response.type).toBe('question');
    expect(response.options.length).toBeGreaterThan(0);
    expect(response.options.some((option) => String(option.value).includes('http'))).toBe(false);
    expect(response.checklist.material ?? null).toBeNull();
    // A picture is not a paragraph. Paying for both is paying twice to answer once.
    expect(prose()).toBe(0);
  });

  /**
   * Looking is not choosing. "Show me colorbond" names a fence and picks nothing - and taking it as
   * the answer chose for somebody who was still deciding, then moved on to the height while they
   * were looking at photographs of the question they were on.
   */
  it('does not choose their fence for them when they only asked to see it', async () => {
    serperReturns([IMAGE(1, 'bunnings.com.au')]);
    const asked = 'show me colorbond';
    // What the real model does with this, verified against the live API: it names the material.
    const { ai } = showMeAi(asked, null, 'colorbond', 'colorbond');
    setAiClient(ai);

    const response = await say(upToMaterial(asked));

    expect(response.answer?.images).toHaveLength(1);
    expect(response.checklist.material ?? null).toBeNull();
    // The question they were on is still the question they are on.
    expect(response.checklistPending.some((entry) => entry.key === 'material')).toBe(true);
    expect(response.options.length).toBeGreaterThan(0);
  });

  /** A choice and a question in one sentence: both stand, because they are about different fences. */
  it('keeps a fence they chose while asking to see a different one', async () => {
    serperReturns([IMAGE(1, 'bunnings.com.au')]);
    const asked = 'colorbond, and show me what treated pine looks like';
    // The question is only half the sentence - the other half is an answer.
    const { ai } = showMeAi(asked, null, 'treated pine', 'colorbond', 'show me what treated pine looks like');
    setAiClient(ai);

    const response = await say(upToMaterial(asked));

    expect(response.answer?.images).toHaveLength(1);
    expect(response.checklist.material).toBe('colorbond');
  });

  /**
   * The mirror of the test above, and the way this broke for months in the other direction: a
   * message that leans on the word "pictures" was read as a picture question, and the half asked
   * in words was dropped. Neither field may decide the other.
   */
  it('answers in words when the picture half is the loud one', async () => {
    serperReturns([IMAGE(1, 'bunnings.com.au')]);
    const asked = 'give me pictures of treated pine and colorbond, and which is better';
    const { ai, prose } = showMeAi(asked, 'advice', 'treated pine and colorbond');
    setAiClient(ai);

    const response = await say(upToMaterial(asked));

    expect(response.answer?.images).toHaveLength(1);
    expect(response.message).toContain('Colorbond is steel sheeting.');
    expect(prose()).toBe(1);
  });

  /**
   * No key, a search outage, or six logos filtered out all land here. Words are a worse answer than
   * pictures and a far better one than behaving as though nothing was asked - which is the exact
   * failure the whole answering path was built to fix.
   */
  it('falls back to a written answer when no photos come back', async () => {
    serperReturns([]);
    const { ai, prose } = showMeAi('show me what colorbond looks like');
    setAiClient(ai);

    const response = await say(upToMaterial('show me what colorbond looks like'));

    expect(response.answer?.images ?? []).toEqual([]);
    expect(response.answer?.kind).toBe('advice');
    expect(response.message).toContain('Colorbond is steel sheeting.');
    expect(prose()).toBe(1);
  });

  /**
   * A voice call is a web call: the page is open in front of them the whole time, polling the
   * session. So the photos go onto that page and the line said out loud points at it - "on your
   * screen" is true on the phone exactly because of this record. What must never happen is a URL
   * reaching the speech engine, which reads it out one letter at a time.
   */
  it('puts the photos on the screen of a caller who asked to see them', async () => {
    serperReturns([IMAGE(1, 'bunnings.com.au')]);
    seedBusiness(repo, 'biz-p1', 'Southeast Fencing');
    const { ai } = showMeAi('show me what colorbond looks like');
    setAiClient(ai);

    const sessionId = 'voice-pictures';
    await repo.writeVoiceSession(sessionId, {
      checklist: {},
      place: BERWICK,
      options: [],
      turns: [],
      checklistDisplay: {},
      checklistAnswered: [],
      checklistPending: [],
      updatedAt: new Date().toISOString(),
    });

    const spoken = await runVoiceTurn(sessionId, { spokenText: 'show me what colorbond looks like' }, { repo });
    const session = await repo.readVoiceSession(sessionId);

    expect(session?.turns.at(-1)?.images).toHaveLength(1);
    expect(spoken.speakText).toContain('on your screen');
    expect(spoken.speakText).not.toContain('http');
  });

  /**
   * Off a real call: "which is better, treated pine or Colorbond? I've got a farmhouse - and give
   * me pictures of both." One message asking for two things. Read as a single kind it came back as
   * advice and the photos were simply dropped, which is the half the customer notices missing.
   *
   * Both are owed, and on the same turn - they run together rather than one after the other, so
   * asking for both costs no more waiting than asking for the words alone.
   */
  it('answers in words and in photos when one message asks for both', async () => {
    serperReturns([IMAGE(1, 'bunnings.com.au'), IMAGE(2, 'stratco.com.au')]);
    const asked = 'which is better, treated pine or colorbond, and show me pictures of both';
    const { ai, prose } = showMeAi(asked, 'advice', 'treated pine and colorbond');
    setAiClient(ai);

    const response = await say(upToMaterial(asked));

    expect(response.message).toContain('Colorbond is steel sheeting.');
    expect(response.answer?.images).toHaveLength(2);
    expect(response.answer?.kind).toBe('advice');
    expect(prose()).toBe(1);
  });

  /**
   * What they asked to SEE, not the sentence they asked it in. That whole message handed to an
   * image search is thirty words of context around the two that matter.
   */
  it('searches for what they asked to see, not for their whole question', async () => {
    const fetcher = serperReturns([IMAGE(1, 'bunnings.com.au')]);
    const asked = 'which is better, treated pine or colorbond, and show me pictures of both';
    setAiClient(showMeAi(asked, 'advice', 'treated pine and colorbond').ai);

    await say(upToMaterial(asked));

    const body = JSON.parse(String((fetcher.mock.calls[0]![1] as { body: string }).body)) as { q: string };
    expect(body.q).toBe('treated pine and colorbond fence australia');
  });

  it('says the same thing out loud as it does on screen', () => {
    const said = toSpeech({
      type: 'question',
      message: PICTURES_LINE + '\n\nWhat type of fence are you after?',
      options: [{ label: 'Colorbond', value: 'colorbond' }],
    } as Parameters<typeof toSpeech>[0]);

    expect(said).toContain('on your screen');
    expect(said).toContain('Option A, Colorbond.');
  });
});
