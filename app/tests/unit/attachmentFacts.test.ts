import { beforeAll, describe, expect, it } from 'vitest';
import { readAttachmentFacts } from '../../src/client/attachmentFacts.js';
import { clearSchemaCache, loadTradeSchema, type TradeSchema } from '../../src/client/schema.js';
import { DESCRIBED, onlyDescriptions, withoutDescriptions } from '../../src/ingest.js';
import { MemoryRepository } from '../../src/store.js';
import { TRADES, type Trade } from '../../src/vocab.js';

/**
 * What the attachment reader does TODAY, written down before it is made trade-driven.
 *
 * These are characterisation tests, not a specification: every expectation below was taken from the
 * behaviour of the fencing-only reader as it stood, including the bits that are arguably rough.
 * That is the point. The reader is about to stop being one hardcoded file and start being a generic
 * loop over `FieldSpec.docHints`, and the only honest way to claim "nothing changed" is to have
 * pinned down what it did first.
 *
 * So: if one of these goes red during that refactor, the refactor changed behaviour. Fix the code,
 * not the test.
 *
 * Every assertion is written against `facts()` / `suburb()` rather than against
 * `readAttachmentFacts` directly, so the day the signature grows a `trade` argument only the two
 * helpers move and not a single expectation. It has now grown twice - first a trade, then the whole
 * schema - and no expectation below has moved once.
 *
 * The schemas come from `loadTradeSchema` against an empty repository rather than from the compiled
 * constants: that is the path production takes, so it is the path worth testing, and it proves the
 * hints survive a schema load rather than only existing in the source file.
 */
const schemas = {} as Record<Trade, TradeSchema>;

beforeAll(async () => {
  clearSchemaCache();
  const repo = new MemoryRepository();
  for (const trade of TRADES) schemas[trade] = await loadTradeSchema(trade, repo);
});

const readFor = (trade: Trade, text: string) => readAttachmentFacts(text, schemas[trade]);

const read = (text: string) => readFor('fencing', text);

/** The transcript shape `readSource` builds: one `[filename]` header above each document's text. */
const asDocuments = (...docs: [string, string][]) =>
  docs.map(([label, body]) => `[${label}]\n${body}`).join('\n\n');

const facts = (text: string) => read(text).docFacts;
const suburb = (text: string) => read(text).docSuburbHint;

describe('material', () => {
  it('reads the schema slug, not the words on the page', () => {
    expect(facts('Supply and install treated pine paling fence').material).toBe('timber_pine');
    expect(facts('New Colorbond fence to boundary').material).toBe('colorbond');
    expect(facts('Merbau screen fence').material).toBe('timber_hardwood');
  });

  it('takes the specific match over the generic one', () => {
    // "glass pool fence" contains neither pine nor timber, but "pool fence" alone would have
    // matched pool_aluminium - the order of the hint list is what settles it.
    expect(facts('Frameless glass pool fence to pool surround').material).toBe('pool_glass');
    expect(facts('Pool panel fencing, 8 panels').material).toBe('pool_aluminium');
    // Hardwood before pine: a merbau quote is not a pine one.
    expect(facts('Hardwood paling fence').material).toBe('timber_hardwood');
  });

  it('stays silent on a material nobody publishes a rate against', () => {
    expect(facts('Bamboo screening to side boundary').material).toBeUndefined();
  });
});

describe('height', () => {
  it("reads the trade's own shorthand, case-sensitively", () => {
    expect(facts('20L of 1.8H colorbond').heightMm).toBe(1800);
    expect(facts('Fence H-1800 to boundary').heightMm).toBe(1800);
  });

  it('normalises metres, centimetres and millimetres onto one scale', () => {
    expect(facts('1.8 metres high').heightMm).toBe(1800);
    expect(facts('180cm high').heightMm).toBe(1800);
    expect(facts('Height: 1800').heightMm).toBe(1800);
  });

  it('counts the inches on a feet-and-inches height', () => {
    // 5'6" is 1676mm. Dropping the inches quietly shortens the fence by half a paling.
    expect(facts(`5'6" high fence`).heightMm).toBe(1676);
  });
});

describe('length', () => {
  it("reads the trade's own shorthand and the spelled-out units", () => {
    expect(facts('20L of 1.8H colorbond').lengthMeters).toBe(20);
    expect(facts('25 lineal metres of paling fence').lengthMeters).toBe(25);
    expect(facts('30lm of colorbond').lengthMeters).toBe(30);
  });

  it('refuses a range outright rather than picking an end of it', () => {
    // "20 to 30 metres" prices a job nobody described. Better to read nothing and let the
    // customer be asked which it is.
    expect(facts('20 to 30 metres of paling fence').lengthMeters).toBeUndefined();
    expect(facts('between 20 and 30 metres of fence').lengthMeters).toBeUndefined();
    expect(facts('Fence run 20-30m').lengthMeters).toBeUndefined();
  });

  it('will not read a height as a run', () => {
    // The 3m floor: nobody books a two metre run of fence, so a lone "1.8m" is the height.
    expect(facts('Colorbond fence 1.8m').lengthMeters).toBeUndefined();
  });

  it('reads a run written in millimetres back into metres', () => {
    expect(facts('1800 high x 25000 long').lengthMeters).toBe(25);
  });
});

describe('removal of the old fence', () => {
  it('reads a removal that is being quoted for, and what is coming out', () => {
    expect(facts('Disposal of 25m of old timber fence').removal).toBe('timber');
    expect(facts('Remove existing colorbond fence and cart away').removal).toBe('metal');
  });

  it('reads it said the other way round too', () => {
    expect(facts('Existing 25m paling fence to be dismantled and taken to tip').removal).toBe('timber');
  });

  it('does not price a demolition nobody asked for', () => {
    expect(facts('No disposal of the old fence').removal).toBeUndefined();
    expect(facts('Excludes removal of existing fence').removal).toBeUndefined();
  });

  it('stays silent when the page never mentions an old fence', () => {
    // Silence is not "there isn't one" - the customer still gets asked.
    expect(facts('Supply and install 20m of new colorbond fence').removal).toBeUndefined();
  });
});

describe('site conditions', () => {
  it('reads every condition named, in the schema vocabulary', () => {
    expect(facts('Sloped block, rock expected when digging').conditions).toEqual(['sloped', 'rock']);
    expect(facts('Tight site access, dig by hand').conditions).toEqual(['restricted_access', 'hand_dig']);
  });

  it('reads a stated easy access as a real EMPTY answer, not as silence', () => {
    expect(facts('Access: easy, flat block').conditions).toEqual([]);
    expect(facts('Good site access throughout').conditions).toEqual([]);
  });

  it('leaves it unset when the page says nothing either way', () => {
    expect(facts('Supply and install 20m of colorbond').conditions).toBeUndefined();
  });
});

describe('the total they were quoted', () => {
  it('takes the largest total and never the subtotal', () => {
    const quote = 'Subtotal $4,000.00\nGST $400.00\nTotal $4,400.00';
    expect(facts(quote).existingPrice).toBe(4400);
  });

  it('needs a dollar sign, so a column heading is not read as a figure', () => {
    expect(facts('Item  Qty  Total\nPaling  20  95').existingPrice).toBeUndefined();
  });

  it('is read the same way whatever the trade', () => {
    // Nothing about this pattern is about fences - it is the one fact every trade's quote carries
    // the same way, which is why it survives the move to a generic reader untouched.
    expect(facts('Total: $12,750').existingPrice).toBe(12750);
  });
});

describe('the job address', () => {
  it('prefers a labelled job address', () => {
    const quote = 'Bayside Fencing Pty Ltd\nSite Address: 12 Smith St, Berwick VIC 3806\n';
    expect(suburb(quote)).toBe('12 Smith St, Berwick VIC 3806');
  });

  it('will not take an address off the letterhead', () => {
    // The contractor's own address would send the job to whichever suburb the fencer trades from.
    const quote = 'Bayside Fencing Pty Ltd, 9 Trade Way, Dandenong VIC 3175\nQuote for a new fence';
    expect(suburb(quote)).toBeNull();
  });

  it('ignores a label with nothing findable after it', () => {
    expect(suburb('Site Address: TBC')).toBeNull();
  });

  it('falls back to an unlabelled Australian address on a line of its own', () => {
    // Recorded as it behaves, not as it reads: the unlabelled pattern starts at a capitalised word,
    // so the street NUMBER is left behind - "40 Kangan Drive…" comes back as "Kangan Drive…". It is
    // only ever a head start for the Google picker, which finds the street either way, so this is
    // pinned rather than fixed. A labelled address (the case above) keeps its number.
    expect(suburb('Job for the property at\n40 Kangan Drive Berwick VIC 3806\n')).toBe(
      'Kangan Drive Berwick VIC 3806',
    );
  });
});

describe('several documents at once', () => {
  it('keeps what they agree on and drops what they contradict', () => {
    /* Two quotes for the same fence. They agree on the fence and disagree on the price, so the
       fence is kept and the price is not - rather than the old all-or-nothing, which threw away
       the agreement along with the disagreement. */
    const both = asDocuments(
      ['quote-a.pdf', 'Colorbond 1.8H, 20L\nTotal $4,400'],
      ['quote-b.pdf', 'Colorbond 1.8H, 20L\nTotal $5,100'],
    );
    expect(read(both).docFacts).toEqual({ material: 'colorbond', heightMm: 1800, lengthMeters: 20 });
  });

  it('lets a document that says nothing take nothing away', () => {
    /* The tiling case this was really costing. A customer attaches the quote AND three photographs
       of the bathroom; the photographs transcribe to nothing, and the quote used to have every
       figure on it discarded for the company it arrived in. */
    const withPhotos = asDocuments(
      ['quote.pdf', 'Colorbond 1.8H, 20L\nTotal $4,400'],
      ['bathroom.jpg', ''],
      ['floor.jpg', ''],
    );
    expect(read(withPhotos).docFacts).toEqual({
      material: 'colorbond',
      heightMm: 1800,
      lengthMeters: 20,
      existingPrice: 4400,
    });
  });

  it('reads nothing at all out of a described photo', () => {
    /* The guard the whole photo feature rests on.
       What this reader produces is trusted with no further check - `mergeAndDecide` runs
       `mentioned()` over the MODEL's claims and deliberately not over these, because a copy of a
       page cannot invent a figure. A description is the model saying what it thinks it can see, so
       read here it would arrive on the brief wearing the clothes of a fact off the customer's own
       quote, with the one check that might have caught it switched off.

       Written with every tempting word in it on purpose: a real description will name a room and a
       tile, and none of it may be read. */
    const described = asDocuments([
      `bathroom.jpg${DESCRIBED}`,
      'A bathroom. Porcelain tiles on the walls, about 12m2 of floor. Total $5,000.',
    ]);
    expect(readFor('tiling', described).docFacts).toEqual({});
    expect(readFor('tiling', described).docSuburbHint).toBeNull();
  });

  it('reads the quote and skips the photo when both arrive', () => {
    // The realistic tiling attachment. The quote is copied and trusted; the photo is not.
    const both = asDocuments(
      ['quote.pdf', 'Retile ensuite. Supply and install 600x600 porcelain.\nTotal $5,720'],
      [`bathroom.jpg${DESCRIBED}`, 'A bathroom with ceramic tiles, roughly 30m2.'],
    );
    expect(readFor('tiling', both).docFacts).toEqual({
      jobType: 'ensuite',
      tileType: 'large_format_600x600',
      supply: 'supply_and_install',
      existingPrice: 5720,
    });
  });

  it('does not read a filename as content', () => {
    // A header is not something the customer wrote. Read as one, this filename is a job address
    // and a fence type at the same time.
    const named = asDocuments(['Colorbond-Quote-Berwick-VIC-3806.pdf', 'Total $4,400']);
    expect(read(named).docFacts).toEqual({ existingPrice: 4400 });
    expect(read(named).docSuburbHint).toBeNull();
  });
});

describe('when it steps back entirely', () => {
  it('reads nothing from an empty transcript', () => {
    expect(read('')).toEqual({ docFacts: {}, docSuburbHint: null });
  });

  it('reads further than the model does, so a long quote keeps its total', () => {
    /* The reader and the model used to share one 4,000-character budget. That budget is about
       tokens, and this costs none - while the total, the one figure worth the most, sits at the
       BOTTOM of a page. A room-by-room quote had its first line read and its total cut off. */
    const long = 'Colorbond 1.8H\n' + 'filler line\n'.repeat(500) + 'Total $4,400';
    expect(long.length).toBeGreaterThan(4000);
    expect(facts(long).existingPrice).toBe(4400);
  });

  it('still stops somewhere, because an uploaded text file can be enormous', () => {
    const enormous = 'x'.repeat(20_000) + '\nTotal $4,400';
    expect(facts(enormous).existingPrice).toBeUndefined();
  });
});

/**
 * The two things that DID move when the reader stopped being fencing-only. Both are written down
 * here rather than argued away, because "nothing changed" is only worth saying if the exceptions
 * are named.
 */
describe('what changed when the reader learned about trades', () => {
  const tiling = (text: string) => readFor('tiling', text);

  it('reads a tiling document for tiling, not for fences', () => {
    /* Before, fencing's hints ran over every attachment whatever the conversation was about. This
       line says "timber", which would have come back as `material: timber_pine` - dropped in
       silence afterwards, because tiling has no `material` field at all. It is now read for the
       fields tiling actually has, and "timber substrate" is correctly nothing to a tiler's
       checklist. */
    const quote = 'Retile bathroom floor, timber substrate to be levelled\nTotal $4,850';
    expect(tiling(quote).docFacts).toEqual({
      jobType: 'bathroom',
      conditions: ['uneven_substrate'],
      existingPrice: 4850,
    });
  });

  it('still reads the two facts a tiling brief was already getting', () => {
    // `restricted_access` is published by both trades, so fencing's hint really did land on tiling
    // briefs. Taking it away would have been a silent loss - see the note on tiling's conditions.
    expect(tiling('Ensuite retile, tight site access').docFacts.conditions).toEqual(['restricted_access']);
    expect(tiling('Laundry retile, easy access throughout').docFacts.conditions).toEqual([]);
  });

  it('leaves a plain job address alone for every trade', () => {
    /* The letterhead guard is built by splicing `TRADE_WORDS[trade].mentions` into a shared pattern,
       so a trade whose words were written carelessly - anything matching the empty string, say -
       would match every line on the page and swallow the job address whole. Nothing would log and
       no screen would change; the picker would just stop being prefilled for that one trade.
       Checked across every trade so the twentieth is checked the day it is added. */
    for (const trade of TRADES) {
      const found = readFor(trade, 'Job at\n12 Smith St Berwick VIC 3806').docSuburbHint;
      expect(found, `${trade} swallowed a job address that names no business`).toBe('Smith St Berwick VIC 3806');
    }
  });

  it('knows a business by the trade it is in, not by two spellings of one', () => {
    /* The letterhead guard used to look for "fencing" and "fences" written out. It now asks
       `TRADE_WORDS[trade].mentions`, which is the one place a trade's own words live - so it also
       catches "Fencers", which the old pair missed. A wider guard is the right direction here: its
       whole job is to not send the job to the address of whoever wrote the quote. */
    expect(suburb('Berwick Fencers\nBerwick VIC 3806')).toBeNull();
    // And a tiler's letterhead is caught for a tiler, which no spelling of "fences" ever would.
    expect(readFor('tiling', 'Pakenham Tiling\nPakenham VIC 3810').docSuburbHint).toBeNull();
  });
});

/**
 * Tiling, read off a quote the customer already holds.
 *
 * Written entirely as data on `TILING_FIELDS` - not one line of `attachmentFacts.ts` moved to make
 * this section pass, which is the only real proof that the reader is generic rather than fencing's
 * reader with a parameter bolted on.
 */
describe('tiling', () => {
  const tiling = (text: string) => readFor('tiling', text).docFacts;

  describe('the job', () => {
    it('reads the room, because in this trade the room is the job', () => {
      expect(tiling('Retile bathroom, floor and walls').jobType).toBe('bathroom');
      expect(tiling('Ensuite retile').jobType).toBe('ensuite');
      expect(tiling('Kitchen splashback').jobType).toBe('kitchen_splashback');
    });

    it('lets the room beat the surface when a quote names both', () => {
      // A tiler quotes the bathroom; "floor and wall" describes what is in it, not a different job.
      expect(tiling('Bathroom floor and wall retile').jobType).toBe('bathroom');
      expect(tiling('Bathroom floor tiling only').jobType).toBe('bathroom');
    });

    it('falls back to the surface when no room was named', () => {
      expect(tiling('Floor tiling to living area').jobType).toBe('floor_only');
      expect(tiling('Feature wall tiling to hallway').jobType).toBe('wall_only');
    });
  });

  describe('the tile', () => {
    it('reads a size as the tile it is', () => {
      // A business publishes large-format as its own rate row, so reading "600x600 porcelain" as
      // porcelain would look up a rate the customer was never quoted.
      expect(tiling('600x600 porcelain to bathroom floor').tileType).toBe('large_format_600x600');
      expect(tiling('Large format 600 x 1200mm tiles').tileType).toBe('large_format_600x1200');
    });

    it('reads a size written the other way round', () => {
      expect(tiling('1200x600 tiles to floor').tileType).toBe('large_format_600x1200');
    });

    it('takes the specific tile over the generic one', () => {
      expect(tiling('Glass mosaic splashback').tileType).toBe('glass_mosaic');
      expect(tiling('Outdoor porcelain to alfresco').tileType).toBe('outdoor_porcelain');
      expect(tiling('Marble floor tiling').tileType).toBe('natural_stone');
      expect(tiling('Subway tile splashback').tileType).toBe('subway');
    });

    it('reads plain porcelain as porcelain', () => {
      expect(tiling('Porcelain tiles to the balcony').tileType).toBe('porcelain');
    });

    it('reads the tile going down, not the one coming up', () => {
      /* A quote names both tiles in one line, and `tileType` picks the rate row the customer is
         quoted against - so reading the tile being TAKEN AWAY prices a job nobody described.
         Both orders, because first-match-wins made this right by luck in one direction and wrong in
         the other: "remove porcelain, lay ceramic" came back as porcelain. */
      expect(tiling('Remove existing ceramic tiles and lay porcelain').tileType).toBe('porcelain');
      expect(tiling('Remove existing porcelain and lay ceramic').tileType).toBe('ceramic');
      expect(tiling('Old mosaic to be stripped out, new subway tiles installed').tileType).toBe('subway');
    });

    it('reads nothing when the only tile named is the one being removed', () => {
      // They have not said what is going down. Silence is the honest answer; they get asked.
      expect(tiling('Remove existing ceramic tiles and cart away').tileType).toBeUndefined();
    });
  });

  describe('waterproofing', () => {
    it('is not answered by the room alone', () => {
      /* THE trap of this trade. Four of waterproofing's five answers are also jobType answers, so
         without the `requires` gate this quote would claim a waterproofing answer it never gave -
         and waterproofing is regulated work nobody should be assumed into. */
      const quote = 'Retile bathroom, floor and walls';
      expect(tiling(quote).jobType).toBe('bathroom');
      expect(tiling(quote).waterproofing).toBeUndefined();
    });

    it('is answered when the page actually says so', () => {
      expect(tiling('Bathroom retile including waterproofing').waterproofing).toBe('bathroom');
      expect(tiling('Shower waterproofing membrane').waterproofing).toBe('shower');
    });

    it('reads a stated exclusion as the answer it is', () => {
      expect(tiling('Bathroom retile. Waterproofing not included.').waterproofing).toBe('none');
      expect(tiling('No waterproofing to the laundry').waterproofing).toBe('none');
    });
  });

  describe('who supplies the tiles', () => {
    it('reads the standard phrases', () => {
      expect(tiling('Supply and install porcelain to bathroom').supply).toBe('supply_and_install');
      expect(tiling('Labour only, 20m2').supply).toBe('labour_only');
      expect(tiling('Client to supply tiles').supply).toBe('labour_only');
    });

    it('lets the qualified statement win over the standard phrase', () => {
      // "Supply and lay" is in there, but the tiles are the customer's - charging them for tiles
      // would be adding a cost the quote never had.
      expect(tiling("Supply and lay client's own tiles").supply).toBe('labour_only');
    });

    it('stays silent when the page never says', () => {
      expect(tiling('Retile bathroom floor').supply).toBeUndefined();
    });
  });

  describe('the old tiles', () => {
    it('reads what is coming up, not what is going down', () => {
      // Both tiles are named on one line. The old one is the answer.
      expect(tiling('Remove existing ceramic tiles and lay porcelain').removal).toBe('ceramic');
      expect(tiling('Existing mosaic to be stripped out').removal).toBe('mosaic');
    });

    it('reads a removal whose kind the page never states', () => {
      expect(tiling('Remove existing tiles and cart away').removal).toBe('any');
    });

    it('does not price a demolition nobody asked for', () => {
      expect(tiling('No removal of the existing tiles').removal).toBeUndefined();
      expect(tiling('Excludes removal of existing tiles').removal).toBeUndefined();
    });

    it('stays silent when the page never mentions old tiles', () => {
      expect(tiling('Supply and install porcelain to new bathroom').removal).toBeUndefined();
    });
  });

  it('reads a whole tiling quote at once', () => {
    const quote = [
      'Pakenham Tiling Co  ABN 98 765 432 109',
      'Site Address: 8 Kangan Drive, Berwick VIC 3806',
      '',
      'Retile ensuite - floor and walls',
      'Supply and install 600x600 porcelain',
      'Remove existing ceramic tiles and cart away',
      'Waterproofing to shower included',
      'Restricted site access - second storey',
      '',
      'Subtotal $5,200.00',
      'Total $5,720.00',
    ].join('\n');

    expect(tiling(quote)).toEqual({
      jobType: 'ensuite',
      tileType: 'large_format_600x600',
      supply: 'supply_and_install',
      removal: 'ceramic',
      waterproofing: 'shower',
      conditions: ['restricted_access', 'second_storey'],
      existingPrice: 5720,
    });
  });

  describe('how much of it', () => {
    it('reads a stated area', () => {
      expect(tiling('Retile bathroom floor, 12m2').areaSqm).toBe(12);
      expect(tiling('Area: 18 sqm').areaSqm).toBe(18);
      expect(tiling('24 square metres of floor tiling').areaSqm).toBe(24);
    });

    it('works a room out from its two sides', () => {
      expect(tiling('Bathroom 3.5m x 4.2m').areaSqm).toBe(14.7);
    });

    it('does not read a rate as an area', () => {
      // "$65 per m2" and "$65/m2" are what the tiler charges, not the size of anybody's floor.
      expect(tiling('Floor tiling at $65 per m2').areaSqm).toBeUndefined();
      expect(tiling('Porcelain floor $72/m2').areaSqm).toBeUndefined();
    });

    it('does not read a tile size as a room', () => {
      // 600 x 1200mm is a tile. Read as a room it is 720,000 square metres.
      expect(tiling('Supply and install 600 x 1200mm porcelain').areaSqm).toBeUndefined();
    });

    it('refuses a page with more than one area on it', () => {
      /* THE tiling refusal. Nothing on the page says which of these the customer is asking about,
         and summing, or taking the first, both produce a number that looks exactly like one they
         gave us by the time it reaches a price. */
      expect(tiling('Bathroom 6m2, Laundry 4m2, Kitchen 2m2').areaSqm).toBeUndefined();
      expect(tiling('12m2 to the floor and 8m2 to the walls').areaSqm).toBeUndefined();
    });

    it('refuses a range', () => {
      expect(tiling('Approximately 20-25m2').areaSqm).toBeUndefined();
      expect(tiling('Between 20 and 25 square metres').areaSqm).toBeUndefined();
    });

    it('keeps an area that is only restated once beside its own rate', () => {
      // The commonest real line of all: one area, then the rate it is charged at.
      expect(tiling('Bathroom floor 12m2 @ $65 per m2 = $780').areaSqm).toBe(12);
    });
  });

  describe('site conditions', () => {
    it('reads each surcharge a tiler publishes separately', () => {
      expect(tiling('Second storey, no lift').conditions).toEqual(['second_storey']);
      expect(tiling('Tile to staircase').conditions).toEqual(['stairs']);
      expect(tiling('Small powder room').conditions).toEqual(['small_room']);
      expect(tiling('Floor levelling required before tiling').conditions).toEqual(['uneven_substrate']);
    });

    it('reads a stated easy access as a real EMPTY answer', () => {
      expect(tiling('Ground floor, easy site access').conditions).toEqual([]);
    });
  });
});

describe('a whole quote, read at once', () => {
  it('fills in everything the page actually states and nothing it does not', () => {
    const quote = [
      'Bayside Fencing Pty Ltd  ABN 12 345 678 901',
      'Site Address: 12 Smith St, Berwick VIC 3806',
      '',
      'Supply and install 20L of 1.8H Colorbond fencing',
      'Disposal of 20m of old timber fence',
      'Sloped block',
      '',
      'Subtotal $4,000.00',
      'Total $4,400.00',
    ].join('\n');

    expect(facts(quote)).toEqual({
      material: 'colorbond',
      heightMm: 1800,
      lengthMeters: 20,
      removal: 'timber',
      conditions: ['sloped'],
      existingPrice: 4400,
    });
    expect(suburb(quote)).toBe('12 Smith St, Berwick VIC 3806');
  });
});

/**
 * The other half of the same guard, on the other path.
 *
 * `readAttachmentFacts` refusing to read a description stops the REGEX from laundering a guess into
 * a fact. It does nothing about the MODEL, which is handed the same transcript and told by its
 * briefing that it may fill a field from what "the attachment states outright" - and `mentioned()`,
 * the check that asks whether the customer really wrote a value, would find the model's own
 * sentence sitting in the haystack and confirm it.
 *
 * So the evidence text and the model's context are both split the same way, by these two.
 */
describe('what counts as the customer`s own words', () => {
  const transcript = asDocuments(
    ['quote.pdf', 'Colorbond 1.8H, 20L'],
    [`bathroom.jpg${DESCRIBED}`, 'A bathroom with porcelain tiles, about 12m2.'],
  );

  it('leaves a described photo out of the evidence', () => {
    const evidence = withoutDescriptions(transcript);
    expect(evidence).toContain('Colorbond 1.8H, 20L');
    expect(evidence).not.toContain('porcelain');
    expect(evidence).not.toContain('12m2');
  });

  it('keeps the description available to read, under its own label', () => {
    // It is not evidence, and it is not nothing: the model should be able to say "the cracked tiles"
    // back to somebody who sent a photo of cracked tiles.
    const described = onlyDescriptions(transcript);
    expect(described).toContain('A bathroom with porcelain tiles');
    expect(described).toContain(DESCRIBED);
    expect(described).not.toContain('Colorbond');
  });

  it('splits a transcript with no photos in it into all evidence and no description', () => {
    const plain = asDocuments(['quote.pdf', 'Colorbond 1.8H, 20L']);
    expect(withoutDescriptions(plain)).toContain('Colorbond');
    expect(onlyDescriptions(plain)).toBe('');
  });
});

/**
 * Kitchen's hints, and the two orderings the whole trade turns on.
 *
 * Nothing in the compiler can see any of this. A hint that reads the wrong half of a sentence fills
 * a field with a real-looking wrong value, and the customer is never asked - so what a pattern must
 * NOT match is tested at least as hard as what it must.
 */
const kitchen = (text: string) => readFor('kitchen', text).docFacts;

describe('kitchen: who is buying the cabinets', () => {
  /* The most expensive read in this trade. A kitchen package is $8,950 where a room of tiles is a
     few hundred, so getting this backwards adds a five-figure line to a quote that was only ever
     for fitting. `labour_only` is ordered first for exactly this sentence. */
  it('reads a supply-and-fit sentence about the CUSTOMER’S cabinets as labour only', () => {
    expect(kitchen("Supply and install the client's own cabinets").supply).toBe('labour_only');
    expect(kitchen('Installation only - customer-supplied kitchen').supply).toBe('labour_only');
    expect(kitchen('Cabinets by others').supply).toBe('labour_only');
    expect(kitchen('Excludes the cabinetry').supply).toBe('labour_only');
  });

  it('reads a genuine supply-and-install sentence as one', () => {
    expect(kitchen('Supply and install new kitchen cabinetry').supply).toBe('supply_and_install');
    expect(kitchen('We supply the cabinets and fit them').supply).toBe('supply_and_install');
    expect(kitchen('Standard custom kitchen cabinetry package').supply).toBe('supply_and_install');
  });

  it('says nothing when the page does not', () => {
    expect(kitchen('Standard kitchen installation $2,850').supply).toBeUndefined();
  });
});

describe('kitchen: the size, which is what finds the price', () => {
  it('reads a layout as the size it implies', () => {
    expect(kitchen('U-shaped kitchen with island').kitchenSize).toBe('large');
    expect(kitchen('Galley kitchen, single run').kitchenSize).toBe('small');
    expect(kitchen('L-shaped kitchen installation').kitchenSize).toBe('standard');
  });

  it('reads the plain size words too', () => {
    expect(kitchen('Large Kitchen Installation Price: $4,250').kitchenSize).toBe('large');
    expect(kitchen('Small Kitchen Installation Price: $1,950').kitchenSize).toBe('small');
    expect(kitchen('Medium Kitchen Installation Price: $2,850').kitchenSize).toBe('standard');
  });

  /* A quantity is not a size, and this trade has no quantity. "12 square metres" and "nine
     cabinets" both look like answers and neither one is: a small kitchen in a big room is still a
     small kitchen. Nothing here may fill the field. */
  it('refuses a measurement or a cabinet count', () => {
    expect(kitchen('Kitchen floor area 14 square metres').kitchenSize).toBeUndefined();
    expect(kitchen('Nine base cabinets and four wall cabinets').kitchenSize).toBeUndefined();
  });
});

describe('kitchen: the job, and what is coming out', () => {
  /* `install_only` is ordered first because its sentence contains the other two trades' words -
     "install the new kitchen the customer supplied" is not a new-kitchen job. */
  it('reads an install-only job as one, however much else the sentence says', () => {
    expect(kitchen('Installation only of owner-supplied flat-pack kitchen').jobType).toBe('install_only');
    expect(kitchen('Flat-pack kitchen install').jobType).toBe('install_only');
  });

  it('tells a replacement from a new kitchen', () => {
    expect(kitchen('Remove existing kitchen and install new cabinetry').jobType).toBe('replacement');
    expect(kitchen('New kitchen to new build').jobType).toBe('new_kitchen');
  });

  it('reads a removal only when one is actually being quoted', () => {
    expect(kitchen('Full kitchen demolition $1,650').removal).toBe('full_demolition');
    expect(kitchen('Remove existing kitchen cabinets').removal).toBe('cabinets_only');
    // No removal mentioned at all is not the same as "there is nothing to remove".
    expect(kitchen('Standard kitchen installation $2,850').removal).toBeUndefined();
  });

  /**
   * A negated sentence closes the gate rather than answering it, and kitchen behaves exactly as
   * tiling does here - verified against both, not assumed.
   *
   * `none` would be defensible and is deliberately not what happens: `negatedBy` runs on the
   * `requires` gate, so "no kitchen removal" reads as "this page is not talking about a removal"
   * and the customer is asked. The safe direction is the one that asks. What this rules out is the
   * damaging read - pricing a $1,650 demolition off a sentence that says there is none.
   */
  it('leaves a negated removal unread rather than pricing one, the same way tiling does', () => {
    for (const line of ['No kitchen removal required', 'Kitchen to remain', 'Nothing to remove']) {
      expect(kitchen(line).removal, line).toBeUndefined();
    }
  });
});

describe('kitchen: the benchtop gate', () => {
  /* "Stone" and "timber" are all over a kitchen page - a timber door, a stone splashback - so the
     field is gated on the word benchtop itself, the same way tiling gates waterproofing. */
  it('does not read a benchtop out of a sentence that is not about one', () => {
    expect(kitchen('Timber-look cabinet doors and a stone splashback').benchtop).toBeUndefined();
  });

  it('reads one when the sentence is about a benchtop', () => {
    expect(kitchen('Stone Benchtop Installation Price: $1,250').benchtop).toBe('stone');
    expect(kitchen('Laminate benchtop installation $850').benchtop).toBe('laminate');
    expect(kitchen('Benchtop not included - by others').benchtop).toBe('none');
  });
});
