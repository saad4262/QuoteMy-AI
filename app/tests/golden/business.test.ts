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
    name: '05 a complete kitchen price list, approved and extracted',
    file: 'description-COMPLETE-kitchen.txt',
    trade: 'kitchen',
    why: 'the trade with no unit to measure - per-job prices keyed by size and per-item cabinet prices surviving in one table, the four cabinet types kept apart by their labels rather than collapsed into one rate priced four times, and no fencing or tiling field anywhere in the response',
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
  tiling: 1,
  kitchen: 1,
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
