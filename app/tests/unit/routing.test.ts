import { beforeEach, describe, expect, it } from 'vitest';
import { runChat } from '../../src/client/controller.js';
import { asksToChangeTrade, clearForTradeChange, detectTrade, routeTrade } from '../../src/client/routeTrade.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { TRADES } from '../../src/vocab.js';

/**
 * Which trade a conversation is about, when nobody told us.
 *
 * The frontend can send one and wins when it does, but the chat must not DEPEND on that: one shared
 * entry point, a pasted link, or a picker that was never built all arrive with nothing. Answering
 * "what type of fence are you after?" to somebody asking about their bathroom is the kind of wrong
 * that ends a conversation, so the customer's own words are read first and the question is a last
 * resort.
 */

let repo: MemoryRepository;

beforeEach(() => {
  repo = new MemoryRepository();
  setRepository(repo);
  clearSchemaCache();
});

describe('reading the trade out of what they said', () => {
  const both = [...TRADES];

  it('routes the obvious ones', () => {
    for (const message of [
      'I need a fence quote',
      'after a price for fencing',
      'how much to replace the palings',
      'boundary fence, 30 metres',
      'colorbond quote please',
      'need a new gate',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['fencing']);
    }

    for (const message of [
      'I want my bathroom tiled',
      'looking for a tiler',
      'how much to tile the floor',
      'kitchen splashback quote',
      'need the ensuite retiled',
      'porcelain tiles, 20 square metres',
      'the shower needs waterproofing',
      'regrouting the laundry',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['tiling']);
    }

    for (const message of [
      'I need a new kitchen',
      'replacing our kitchen cabinets',
      'flat pack kitchen install',
      'stone benchtop and cupboards',
      'need a cabinetmaker',
      'walk in pantry',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['kitchen']);
    }

    for (const message of [
      'I need a retaining wall quote',
      'how much for a sleeper wall',
      'concrete sleepers along the back',
      'price for a besser block wall',
      'a tiered wall for the slope',
      'we need soil retention at the back',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['retaining_wall']);
    }

    for (const message of [
      'I need a decking quote',
      'how much for a new deck',
      'merbau deck, about 30 square metres',
      'looking for a deck builder',
      'composite decking price',
      'we need a balustrade on the deck',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['decking']);
    }

    /* The rooms nobody else claims, plus this trade's own scope words. Ten of these previously
       matched NOTHING at all and fell through to "which service?" - they are the reason the trade
       needs keywords of its own rather than relying on the precedence rule below. */
    for (const message of [
      'I need a renovation quote',
      'can you renovate my whole house',
      'we want to remodel the living room',
      'bedroom renovation in Berwick',
      'need a hallway and home office done',
      'looking at an open plan conversion',
      'how much for plastering',
      'new skirting boards and architraves',
      'a stud wall in the bedroom',
      'after a reno quote',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['home_renovation']);
    }
  });

  /**
   * THE ONE DELIBERATE BEHAVIOUR CHANGE THE SIXTH TRADE MADE, and the only place where adding it
   * moved an existing trade's routing.
   *
   * `tiling` owns bathroom, ensuite and laundry, and `kitchen` owns its own noun - correctly, and
   * since long before renovations existed. But "renovate my bathroom" names a room that is a
   * tiler's AND a scope that is a renovator's, and before this it went to tiling: a tiler cannot
   * strip the room out, move the vanity and re-plaster it.
   *
   * So SCOPE beats ROOM, in `detectTrade` rather than in the regexes. A negative lookahead on
   * tiling would have fixed "bathroom renovation" and could never have fixed "renovate my
   * bathroom", where the verb comes first - and it would have edited two live trades' patterns to
   * do half the job.
   */
  it('sends a room that is being renovated to the renovator, not the tiler or the fitter', () => {
    for (const message of [
      'I want a bathroom renovation',
      'renovate my bathroom',
      'kitchen renovation quote',
      'renovating the kitchen',
      'we are remodelling the ensuite',
      'laundry reno please',
    ]) {
      expect(detectTrade(message, both), message).toEqual(['home_renovation']);
    }

    // And the same rooms WITHOUT the scope word are untouched - this is the half that must not move.
    expect(detectTrade('retile the bathroom', both)).toEqual(['tiling']);
    expect(detectTrade('the ensuite needs waterproofing', both)).toEqual(['tiling']);
    expect(detectTrade('regrouting the laundry', both)).toEqual(['tiling']);
    expect(detectTrade('I need a new kitchen', both)).toEqual(['kitchen']);
    expect(detectTrade('stone benchtop and cupboards', both)).toEqual(['kitchen']);
  });

  /**
   * The precedence rule drops tiling and kitchen and NOTHING else, which is what keeps it honest:
   * it resolves the two collisions it was written for and leaves every genuine ambiguity ambiguous.
   */
  it('still asks when a renovation is named alongside a trade that is not tiling or kitchen', () => {
    // This business does sell decks, and so does a deck builder. That is a real question.
    expect(detectTrade('renovate my deck', both)).toEqual(['decking', 'home_renovation']);
    // Two jobs, named together, exactly as before.
    expect(detectTrade('a new fence and a bathroom renovation', both)).toEqual(['fencing', 'home_renovation']);
    expect(detectTrade('retaining wall and a full house reno', both)).toEqual(['retaining_wall', 'home_renovation']);
  });

  /**
   * The overlap decking brought with it: its MATERIALS belong to everybody.
   *
   * Merbau, spotted gum and treated pine are all fencing materials, and merbau is a retaining wall's
   * `premium_timber` too. The only thing separating "merbau fence" from "merbau deck" is the noun
   * beside the timber, so every board stays compound and only `deck` itself is claimed bare.
   */
  it('does not let a timber name decide the trade on its own', () => {
    // The board alone settles nothing, and nothing may fire.
    for (const message of ['I like merbau', 'what about spotted gum', 'treated pine please', 'something in composite']) {
      expect(detectTrade(message, both), message).toEqual([]);
    }

    // The noun beside it is what decides, and it decides correctly in both directions.
    expect(detectTrade('merbau deck', both)).toEqual(['decking']);
    expect(detectTrade('merbau fence', both)).toEqual(['fencing']);
    expect(detectTrade('treated pine sleepers for the wall', both)).toEqual(['retaining_wall']);

    // And a message naming two jobs is still two jobs.
    expect(detectTrade('a merbau deck and a colorbond fence', both)).toEqual(['fencing', 'decking']);
  });

  /**
   * The one overlap the compiler cannot see, and the reason kitchen's pattern is not simply
   * /kitchen/. A kitchen splashback is TILING work and tiling has published `kitchen_splashback`
   * as a job type since before this trade existed - so the bare noun is excluded where it is
   * qualifying a tiled surface, and the specific nouns carry the trade on their own.
   */
  it('leaves a tiled surface to tiling, however much it says kitchen', () => {
    for (const message of ['kitchen splashback quote', 'how much to tile the kitchen floor', 'retile the kitchen walls']) {
      expect(detectTrade(message, both), message).toEqual(['tiling']);
    }

    // Two jobs named at once is still two jobs, and still goes to the question.
    expect(detectTrade('new kitchen and retile the bathroom', both)).toEqual(['tiling', 'kitchen']);
  });

  /* A keyword that fires for both trades is worse than no keyword at all: it turns a clear message
     into an ambiguous one. These are the words that tempted their way onto the list and were left
     off - each of them appears in both trades and names neither. */
  it('does not treat words both trades use as a signal', () => {
    for (const message of [
      'I need a quote for the pool area',
      'something for the back wall',
      'an outdoor job',
      /* `wall` is the one retaining wall most wanted and may never have: tiling answers "Wall only"
         with that exact word. The compound is what carries this trade, never the bare noun. */
      'the wall needs doing',
      'a job on the garden bed',
      // Left off retaining wall's list on purpose - both are half of what a landscaper writes.
      'we need some excavation done',
      'the drainage is a mess',
      /* Left off DECKING's list for the same reason. A retaining wall has stairs, a house has
         stairs, and three trades sell a pergola and a privacy screen. */
      'I need some stairs',
      'can you do a pergola',
      'looking for privacy screens',
    ]) {
      expect(detectTrade(message, both), message).toEqual([]);
    }
  });

  /**
   * The overlap this trade brought with it, and the edit it forced on fencing.
   *
   * "Boundary retaining walls" is a line on a wall builder's own service list, so a bare `boundary`
   * in fencing's pattern made that phrase match two trades and sent a customer who had said exactly
   * what they wanted to the "which one?" question. The fix is a negative lookahead, the same
   * technique that stops "kitchen splashback" stealing a tiling job.
   */
  it('leaves a boundary RETAINING wall to this trade, and a boundary fence to fencing', () => {
    expect(detectTrade('I need a boundary retaining wall', both)).toEqual(['retaining_wall']);
    expect(detectTrade('boundary retaining walls, about 20 metres', both)).toEqual(['retaining_wall']);

    // Fencing keeps the word everywhere else, which is the half that must not regress.
    expect(detectTrade('boundary fence, 30 metres', both)).toEqual(['fencing']);
    expect(detectTrade('a boundary dispute with next door', both)).toEqual(['fencing']);

    // And two jobs named at once is still two jobs, and still goes to the question.
    expect(detectTrade('a boundary fence and a retaining wall', both)).toEqual(['fencing', 'retaining_wall']);
  });

  /**
   * Fencers are asked about retaining walls constantly, and a fencing price list that names one is
   * still a fencing price list. What decides the trade is what the customer is ASKING FOR.
   */
  it('does not let a sleeper wall steal a fencing job, or the reverse', () => {
    expect(detectTrade('a paling fence on top of a retaining wall', both)).toEqual(['fencing', 'retaining_wall']);
    expect(detectTrade('timber sleepers for the garden wall', both)).toEqual(['retaining_wall']);
    // `sleeper` is qualified rather than bare - a railway sleeper in a garden bed is not a wall.
    expect(detectTrade('I have some old sleepers lying around', both)).toEqual([]);
  });

  it('treats a message naming both as ambiguous, not as a guess', () => {
    expect(detectTrade('a new fence, and the bathroom retiled', both)).toEqual(['fencing', 'tiling']);
    expect(routeTrade('a new fence, and the bathroom retiled', undefined, undefined, both)).toEqual({
      trade: null,
      by: 'unresolved',
      ambiguous: true,
    });
  });

  it('puts the caller first, then the session, then the words', () => {
    // The frontend said so - a customer who arrived through a tiling page has already answered.
    expect(routeTrade('I need a fence quote', 'tiling', undefined, both).trade).toBe('tiling');
    // Already settled earlier in this conversation, and never revisited.
    expect(routeTrade('the old fence is coming out', undefined, 'tiling', both).trade).toBe('tiling');
    expect(routeTrade('I need a fence quote', undefined, undefined, both)).toMatchObject({ trade: 'fencing', by: 'keywords' });
  });

  /* Before tiling was onboarded there was one trade live, and asking "fencing or fencing?" would be
     absurd. The list comes from what is PUBLISHED, so this is the real state of the product on the
     day a second trade's schema first appears. */
  it('never asks when only one trade is live', () => {
    expect(routeTrade('I need a quote', undefined, undefined, ['fencing'])).toMatchObject({
      trade: 'fencing',
      by: 'only-trade',
    });
  });
});

describe('the conversation', () => {
  const turn = async (message: string, checklist: unknown) =>
    runChat(
      { message, sessionId: 'route-1', place: '', knownChecklist: checklist ? JSON.stringify(checklist) : '' },
      [],
      { repo },
    );

  it('goes straight into the trade the customer named, with no extra question', async () => {
    const fencing = await turn('I need a fence quote', null);
    expect(fencing.trade).toBe('fencing');
    expect(fencing.message).not.toContain('looking for');

    const tiling = await turn('I want my bathroom tiled', null);
    expect(tiling.trade).toBe('tiling');
  });

  it('asks when nobody has said and the words do not settle it', async () => {
    const asked = await turn('hi, I need a quote', null);

    expect(asked.type).toBe('question');
    expect(asked.trade).toBeNull();
    expect(asked.message).toBe(
      'Are you looking for Fencing, Tiling, Kitchen fitting, Retaining wall, Decking or Home renovation services?',
    );
    expect(asked.options.map((o) => o.value)).toEqual([
      'fencing',
      'tiling',
      'kitchen',
      'retaining_wall',
      'decking',
      'home_renovation',
    ]);
    /* The only turn with no trade behind it, so there is nothing for a rate to be per. The golden
       conversations all name their trade and never reach here, and a result card reading `unit` has
       to survive the one turn that cannot answer it. */
    expect(asked.unit).toBeNull();
  });

  /**
   * What a result card should print the rate as. `ratePerMeter` is fencing's name and all three
   * trades reuse it - a per-metre price, a per-SQUARE-metre one, and for kitchen the whole job - so
   * a card printing `${ratePerMeter}/m` shows "$15,470 per metre" for a kitchen.
   *
   * Pinned here rather than left to the goldens because it is a wire contract a separate frontend
   * reads, and because the alternative it replaces was a guess: inferring "no unit" from
   * `ratePerMeter === estimatedTotal` is true for kitchen by construction, and also true for any
   * fencing job of exactly one metre.
   */
  it('says what a rate is per, for every trade', async () => {
    expect((await turn('I need a fence quote', null)).unit).toBe('m');
    expect((await turn('I want my bathroom tiled', null)).unit).toBe('m2');
    expect((await turn('I need a new kitchen', null)).unit).toBe('item');
    /* Per LINEAR metre, and the one worth pinning: the trade's name says "wall", which reads as an
       area, and a card printing $395/m² for a rate published per metre of wall is out by its height. */
    expect((await turn('I need a retaining wall', null)).unit).toBe('m');
  });

  it('says so differently when they named two jobs at once', async () => {
    const asked = await turn('a new fence, and the bathroom retiled', null);

    expect(asked.type).toBe('question');
    expect(asked.message).toContain('more than one job');
  });

  it('carries on into the trade they pick, and keeps it for the rest of the conversation', async () => {
    let response = await turn('hi, I need a quote', null);
    expect(response.trade).toBeNull();

    response = await turn('tiling', response.checklist);
    expect(response.trade).toBe('tiling');

    // "the old floor" says nothing about a trade, and must not un-settle the one already chosen.
    response = await turn('yes', response.checklist);
    expect(response.trade).toBe('tiling');
    expect(response.checklist._ui?.trade).toBe('tiling');
  });

  /* The one that would be invisible if it broke: a word from the other trade, mid-conversation,
     re-routing everything already answered. "The old fence is coming out" is a perfectly ordinary
     thing to say while having a floor tiled. */
  it('does not re-route on a stray word from the other trade', async () => {
    let response = await turn('I want my bathroom tiled', null);
    response = await turn('yes', response.checklist);
    response = await turn('the old fence is coming out too', response.checklist);

    expect(response.trade).toBe('tiling');
  });

  it('loses nothing by having asked - the checklist comes back untouched', async () => {
    const known = { material: 'colorbond', _ui: { turn: 3, cursor: {}, lastAsked: null, lastQuestion: '', lastValues: [], lastType: 'message', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null, place: null, answers: 0 } };
    const asked = await turn('I need a quote', known);

    expect(asked.type).toBe('question');
    expect(asked.checklist.material).toBe('colorbond');
  });
});

/**
 * The escape hatch, and the two halves that make it safe.
 *
 * `routeTrade`'s `settled` branch returns this conversation's trade WITHOUT reading the message, on
 * purpose - re-routing on a stray word would throw away everything answered. But it left a customer
 * who picked the wrong service at the start stuck in it for ever: "i want fencing" three questions
 * into a renovation was read and discarded, and nothing told them why.
 */
describe('asking to change the trade', () => {
  const PUB = [...TRADES];
  const asks = (message: string, current?: string) =>
    asksToChangeTrade(message, current as never, PUB as never);

  it('fires on a message about the conversation rather than about the job', () => {
    for (const message of [
      'i want to change trade type',
      'change the service',
      'can i pick a different service',
      'wrong service',
      'switch to another trade',
      'not the right trade',
      'start over',
    ]) {
      expect(asks(message, 'home_renovation'), message).toBe(true);
    }
  });

  /** The customer's own first attempt, and the reason the second branch exists. */
  it('fires when they ask for a different trade outright', () => {
    for (const message of ['i want fencing', 'I need a fence quote', 'actually i want tiling', 'can i get a deck instead']) {
      expect(asks(message, 'home_renovation'), message).toBe(true);
    }
  });

  /**
   * THE HALF THAT MATTERS MORE. Every one of these describes the job in hand, and every one of them
   * would cost somebody their filled-in brief if it fired. The first is the exact sentence
   * `routeTrade`'s own comment warns about.
   */
  it('stays silent on a sentence about the job', () => {
    const cases: [string, string][] = [
      ['the old fence is coming out', 'tiling'],
      ['i want a gate as well', 'fencing'],
      ['i need waterproofing', 'tiling'],
      ['i want the full renovation', 'home_renovation'],
      ['i need a bigger deck', 'decking'],
      ['strip out the bathroom', 'home_renovation'],
      ['remove the old fence', 'fencing'],
      ['i want to change the height', 'fencing'],
      ['can i change the suburb', 'fencing'],
      ['change the tile', 'tiling'],
      ['the job is wrong', 'home_renovation'],
    ];
    for (const [message, current] of cases) {
      expect(asks(message, current), `[${current}] ${message}`).toBe(false);
    }
  });

  it('needs a settled trade before it can fire at all', () => {
    expect(asks('i want fencing', undefined)).toBe(false);
  });

  /**
   * The trap this helper exists to avoid: `_ui.history` lives INSIDE the checklist, so throwing the
   * checklist away to change trade would also throw away every word either side has said. A
   * customer changing service has not asked to be forgotten.
   */
  it('clears the answers and the trade, and keeps the conversation', () => {
    const before = {
      suburb: 'Berwick, VIC 3806',
      room: 'bathroom',
      jobType: 'full_renovation',
      _ui: {
        trade: 'home_renovation',
        turn: 5,
        cursor: { room: 1 },
        lastAsked: 'supply',
        lastQuestion: "Who's buying the materials?",
        lastValues: ['a', 'b'],
        fixing: true,
        history: [{ you: 'I need a renovation quote', me: 'Happy to help' }],
      },
    } as never;

    const after = clearForTradeChange(before);

    // Every answer is gone - nothing from the old trade may show in the new one's brief.
    expect(after.suburb).toBeUndefined();
    expect(after.room).toBeUndefined();
    expect(after.jobType).toBeUndefined();
    expect(after._ui?.trade).toBeUndefined();
    expect(after._ui?.cursor).toEqual({});
    expect(after._ui?.lastAsked).toBeNull();
    expect(after._ui?.fixing).toBe(false);

    // The conversation is not.
    expect(after._ui?.history).toEqual([{ you: 'I need a renovation quote', me: 'Happy to help' }]);
  });
});
