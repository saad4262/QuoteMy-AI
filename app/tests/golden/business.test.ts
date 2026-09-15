import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MockAiClient } from '../../src/ai.js';
import { clearGeocodeCache } from '../../src/geocode.js';
import { runOnboarding } from '../../src/pipeline.js';
import type { BusinessBody } from '../../src/schemas.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { TRADES, type Trade } from '../../src/vocab.js';
import { clearVocabularyCache } from '../../src/vocabulary.js';

/**
 * The safety net for the business side, and the counterpart to `golden.test.ts`.
 *
 * The chat has fourteen snapshotted conversations; submission -> review -> extraction ->
 * verification had nothing, and that is the half about to be refactored per trade. `verify.ts` is
 * the file `CLAUDE.md` singles out for source-quote checking and plausibility bounds, under a
 * standing instruction that accuracy there matters more than speed - so it does not get taken apart
 * on the strength of a green suite alone. `DYNAMIC-SCHEMA-PLAN.md` step 2 is the precedent: three
 * deliberate breaks proved two conversations had been passing for the wrong reason.
 *
 * What is snapshotted is the whole `data` block: every rate that survived, every figure that was
 * dropped and the sentence-level reason a business is given for it, the coverage counts, and on the
 * reject path every fix. That is the entire `VerifiedResult` plus the review that let it through.
 *
 * Two things are deliberately left out.
 *   - `admin.sourceText`, because it is the fixture read back. It lives in git already, and
 *     `tests/unit/sanitize.test.ts` covers what sanitising does to it.
 *   - `meta`, because its `tokensIn` is the length of the prompt. Moving a paragraph from one
 *     prompt file to another would move every snapshot here while changing nothing a business sees.
 *     Prompt size has its own guard in `assertPromptBudgets()`.
 *
 * WHAT THIS NET DOES NOT HOLD, stated plainly because a snapshot that looks like it covers
 * something it does not is worse than no snapshot at all (`DYNAMIC-SCHEMA-PLAN.md` step 2).
 * `MockAiClient` extracts RATES only - it says so itself in the `notUsed` line it returns - so
 * gates, removals, site-condition surcharges, build specs, extras and the long tail all come back
 * at zero here whatever the fixture says. Those are held by `tests/unit/verify.test.ts`, which
 * drives `verifyExtraction` directly with a handwritten extraction: the quote gate, the bounds
 * gate, the closed vocabulary, duplicate rates, the taller-costs-less warning, removal dearer than
 * install, spec merging and a surcharge stated two ways. Between the two, every branch of
 * verification is covered. Neither is sufficient on its own.
 */

interface Submission {
  name: string;
  file: string;
  /** Why this fixture is in the net - what a later refactor could silently drop. */
  why: string;
  /** `Trade` rather than a hand-written union, which said `'fencing' | 'tiling'` while kitchen shipped. */
  trade?: Trade;
}

const SUBMISSIONS: Submission[] = [
  {
    name: '01 a complete price list, approved and extracted',
    file: 'description-COMPLETE-fencing.txt',
    why: 'the approved path end to end - 20 rates surviving the quote gate, the height band keys code builds from the number, enabledMaterials, the coverage counts, and the shape of the screen a business sees',
  },
  {
    name: '02 detailed and well written, but not publishable',
    file: 'description-GOOD-southeast-fencing.txt',
    why: 'one non-price item missing is still blocking, and a rejected submission writes NOTHING to the profile - an incomplete list must never overwrite figures already approved',
  },
  {
    name: '03 longer and friendlier than the good one, and almost unpriced',
    file: 'description-BAD-daves-fencing.txt',
    why: 'ranges, POA and "from" on core rates are all caught, while "from $1,450" on a gate motor is NOT - that carve-out is the false rejection this fixture produced once, and rule 4a exists because of it',
  },
  {
    name: '04 a complete tiling price list, approved and extracted',
    file: 'description-COMPLETE-tiling.txt',
    trade: 'tiling',
    why: 'the second trade end to end - per-m2 rates and a per-job bathroom package surviving in one table, tiling\'s own couldNotUse wording, and no fencing field anywhere in the response',
  },
  {
    name: '10 twenty-six years on the tools, and not one rate a customer can be quoted from',
    file: 'description-BAD-tiling.txt',
    trade: 'tiling',
    why: 'this trade\'s characteristic failure, and the first tiling fixture that is REJECTED. An hourly rate is a real and defensible way for a tiler to work, and it cannot answer "18 square metres of porcelain" - so the whole document is honest, complete, priced throughout, and quotes nobody. It is also the only fixture on this trade reaching the not_a_price_list outcome rather than needs_updates, and the day-ranges ("2 days, could be 9") must be caught as ranges rather than read as rates',
  },
  {
    name: '05 a complete kitchen price list, approved and extracted',
    file: 'description-COMPLETE-kitchen.txt',
    trade: 'kitchen',
    why: 'the trade with no unit to measure - per-job prices keyed by size and per-item cabinet prices surviving in one table, the four cabinet types kept apart by their labels rather than collapsed into one rate priced four times, and no fencing or tiling field anywhere in the response',
  },
  {
    name: '11 nine hundred kitchens, priced by a measurement this trade does not use',
    file: 'description-BAD-kitchen.txt',
    trade: 'kitchen',
    why: 'this trade\'s characteristic failure, and the first kitchen fixture that is REJECTED. K1 says plainly that a kitchen is not priced by the metre, and the lineal metre is exactly how the cabinetry industry advertises - so this is the failure a real business is most likely to send in, written by somebody who is not wrong about their own trade. Nothing here can answer "a large kitchen" without the customer first measuring their own walls, which is the sum CLAUDE.md #4 forbids the model to do for them',
  },
  {
    name: '06 a complete retaining wall price list, approved and extracted',
    file: 'description-COMPLETE-retaining-wall.txt',
    trade: 'retaining_wall',
    why: 'the trade that publishes the SAME WALL TWICE - nine rates split across two supply columns, each one keeping the column it was written under, so a $145 installation rate and a $285 supply-and-install rate for the same timber sleeper wall survive as two rates and not as one priced twice. Also the per-hour and per-post groundworks staying OUT of the quotable rates, and enabledWallTypes rather than enabledMaterials, which is what stops the whole document being read back as a fence',
  },
  {
    name: '07 impressive, detailed, and almost none of it quotable',
    file: 'description-THIN-retaining-wall.txt',
    trade: 'retaining_wall',
    why: 'ranges, POA and "from" on core rates are all caught, while "from $850" on an engineering certificate and "from $150" on a site inspection are NOT - that is rule 4a, the carve-out fencing\'s gate motor already produced one false rejection over. Also the supply rule: this business says it can do either model and prices neither of them separately, which is the failure that reads as thorough and quotes nobody',
  },
  {
    name: '08 a complete decking price list, approved and extracted',
    file: 'description-COMPLETE-decking.txt',
    trade: 'decking',
    why: 'the trade with THREE quantities in one quote - sixteen per-square-metre rates split across four height headings that carry DOWN the page, a balustrade kept in linear metres along the deck edge, and stairs counted in flights. Also enabledDeckMaterials rather than enabledMaterials, which is what stops the whole document being read back out of Firestore as a fence',
  },
  {
    name: '09 nineteen years of decks, and a balustrade priced by the wrong thing',
    file: 'description-THIN-decking.txt',
    trade: 'decking',
    why: 'two failures this trade makes and no other can. A balustrade at "$180 per square metre of deck" is priced against the floor behind it rather than the edge it runs along, and "most backyard decks don\'t need a permit anyway" is a claim about somebody else\'s site that nobody may make. Ranges and POA on the boards are caught too, while "from $890" on engineering and "from $350" on design are NOT - rule 4a again',
  },
  {
    name: '12 a complete renovation price list, approved and extracted',
    file: 'description-COMPLETE-renovation.txt',
    trade: 'home_renovation',
    why: 'the trade where a price with NO UNIT is the correct shape of a rate, not a defect. Eighty-six of this list\'s lines carry no unit at all, and every one of them must survive - rule 2a, on the trade that rule was written for. What this fixture proves beyond that is the four-way sort: rooms at flat prices, surfaces per square metre, items each and labour by the hour all sit in one column of dollar amounts, and only the unit beside the number tells them apart. "Kitchen renovation labour $4,850" must become a rate and "Kitchen cabinet installation $2,850" must not, though both name the same room',
  },
  {
    name: '13 thirty-one years of renovations, and every price charged by the hour',
    file: 'description-BAD-renovation.txt',
    trade: 'home_renovation',
    why: 'this trade\'s characteristic failure, and the cleanest example of it in the suite. Charging for your time is an honest, defensible way to renovate a house and it cannot answer "what does my bathroom cost" - so the document is complete, priced throughout, and quotes nobody. It produces exactly ONE fix, which makes it the tightest test of the rejectedNotQuotable wording: the prices are all there and none is quotable. It also guards the negation in the structural-claim check - this business says it will NOT tell you a wall can come out until it has looked, which is the rule obeyed perfectly, and a careless check flags it as the rule broken',
  },
];

/**
 * The checklist the compiler writes. A fourth trade added to `TRADES` is a type error on this
 * object, and the only way to satisfy it is to decide - out loud, in a diff - whether that trade
 * gets a fixture here. Kitchen shipped without one because nothing anywhere said it was missing.
 *
 * Zero is a legal answer, but it has to be typed deliberately.
 */
const FIXTURES_PER_TRADE: Record<Trade, number> = {
  fencing: 3,
  /* Two, and the rejected one is the point - the same reason retaining wall and decking have one.
     This trade's characteristic failure is a tiler who charges by the hour: every figure on the
     page is firm, and none of them can be multiplied by a customer's square metres. */
  tiling: 2,
  /* Two, for the same reason, and this trade's rejected fixture is the one a real business is
     likeliest to send: cabinetry is advertised by the lineal metre everywhere, and K1 says this
     trade is not priced by the metre. Only a REJECTED fixture proves that rule still fires. */
  kitchen: 2,
  /* Two, and the rejected one is the point. This trade's characteristic failure is a price list
     that reads as thorough and cannot quote anybody - per-metre rates with no supply model against
     them - and only a fixture that gets REJECTED proves the reviewer catches it. */
  retaining_wall: 2,
  /* Two, and the rejected one carries this trade's two characteristic failures: a balustrade priced
     by the deck's area instead of its edge, and a business telling customers a permit is probably
     not needed. Neither is visible in an approved fixture. */
  decking: 2,
  /* Two, and this trade needed the rejected one more than any before it. A renovator's list is
     mostly numbers with no unit beside them, so the approved fixture is the proof that rule 2a
     holds at scale - and the rejected one is the proof that "no unit" and "not quotable" are still
     different things, because the business that fails here has a unit on every single line. */
  home_renovation: 2,
};

/**
 * One submission, rendered for reading in review rather than only for diffing - the same reason
 * `golden.test.ts` writes a file per conversation instead of one inline blob.
 */
async function runSubmission(submission: Submission, repo: MemoryRepository): Promise<string> {
  const text = readFileSync(`tests/fixtures/${submission.file}`, 'utf8');

  const input: BusinessBody = {
    action: 'submit',
    businessUid: 'golden-business',
    trade: submission.trade ?? 'fencing',
    text,
  };

  const result = await runOnboarding('golden-business', input, [], {
    repo,
    // Generated with randomUUID() in the pipeline, so it has to be pinned or every run differs.
    submissionId: 'golden-submission',
  });

  const { sourceText: _sourceText, ...admin } = result.data.admin as Record<string, unknown>;

  return [
    `# ${submission.name}`,
    '',
    `Guards: ${submission.why}`,
    '',
    `Fixture: \`tests/fixtures/${submission.file}\` (${text.length} characters)`,
    '',
    '## what the business is told',
    '',
    '```json',
    JSON.stringify({ approved: result.data.approved, status: result.data.status, business: result.data.business }, null, 2),
    '```',
    '',
    '## what was recorded',
    '',
    '```json',
    JSON.stringify(admin, null, 2),
    '```',
    '',
  ].join('\n');
}

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('golden business submissions', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    // Both are process-wide caches with a five-minute TTL, so one submission must never be
    // answered out of another's - `loadVocabulary` and `geocode` are reached through the global
    // repository rather than through `deps`.
    clearVocabularyCache();
    clearGeocodeCache();
  });

  for (const submission of SUBMISSIONS) {
    it(submission.name, async () => {
      const transcript = await runSubmission(submission, repo);
      await expect(transcript).toMatchFileSnapshot(`./__snapshots__/business-${slugOf(submission.name)}.md`);
    });
  }

  it('has the fixtures every trade was signed off with', () => {
    const counted = Object.fromEntries(TRADES.map((trade) => [trade, 0])) as Record<Trade, number>;
    for (const submission of SUBMISSIONS) counted[submission.trade ?? 'fencing'] += 1;
    expect(counted).toEqual(FIXTURES_PER_TRADE);
  });
});

/**
 * The offline reviewer has to be as hard to satisfy as the rule it mirrors.
 *
 * It was not. K5 names four preparation items and asks for each; `reviewKitchen` tested a single
 * loose pattern, so fixture 05 - which carried two of the four - came back approved here while the
 * real model correctly asked for the other two on a live submission. A green suite said the
 * business side worked and a business was told to go and edit its price list.
 *
 * Pinned in both directions, because only one of them fails loudly: a gap must be named, and the
 * blanket "quoted after the site measure" must still be enough on its own.
 */
describe('the offline reviewer, held to K5', () => {
  const reviewSchema = z.object({
    outcome: z.string(),
    fixes: z.object({ kind: z.string(), what: z.string(), example: z.string().nullable() }).array(),
    alsoWorthAdding: z.string().array(),
  });

  const review = async (body: string) => {
    const result = await new MockAiClient().callStructured({
      name: 'review',
      system: '',
      user: 'Trade: kitchen\n<<<DESCRIPTION>>>\n' + body,
      schema: reviewSchema,
    } as never);
    return (result as { data: z.infer<typeof reviewSchema> }).data;
  };

  const prepFix = (fixes: { what: string }[]) => fixes.find((f) => /preparation|levelling|plaster/i.test(f.what))?.what;
  const complete = () => readFileSync('tests/fixtures/description-COMPLETE-kitchen.txt', 'utf8');

  it('passes the fixture, which must therefore price all four', async () => {
    const result = await review(complete());
    expect(prepFix(result.fixes)).toBeUndefined();
    expect(result.outcome).toBe('approved');
  });

  it('names the ones that are missing, rather than waving two of four through', async () => {
    const twoOfFour = complete()
      .replace('Minor floor preparation $350.\n', '')
      .replace(' Wall plaster repair $420.', '');

    const result = await review(twoOfFour);
    expect(result.outcome).toBe('needs_updates');
    expect(prepFix(result.fixes)).toBe('Add prices or site-measure wording for floor preparation, plaster repair.');
  });

  it('takes "quoted after the site measure" as the answer to all four', async () => {
    const blanket = complete().replace(
      /Minor wall preparation[\s\S]*?Wall plaster repair \$420\.\n/,
      'All preparation is quoted after the site measure.\n',
    );

    expect(prepFix((await review(blanket)).fixes)).toBeUndefined();
  });
});
