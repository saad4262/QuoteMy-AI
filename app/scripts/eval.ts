/**
 * Score the pipeline against fixtures whose correct output is known.
 *
 *   npm run eval            mock provider: free, deterministic, catches regressions
 *   npm run eval -- --live  the real model: what actually ships, costs about $0.10
 *
 * Run it before and after any change to a prompt, a rule or the schema. A number that went down is
 * the only honest way to know a change made things worse - reading one output and nodding is how
 * this project already shipped one false rejection.
 */
import { readFileSync } from 'node:fs';
import { setAiClient, MockAiClient } from '../src/ai.js';
import { MemoryRepository, setRepository } from '../src/store.js';
import { runOnboarding } from '../src/pipeline.js';
import { clearVocabularyCache } from '../src/vocabulary.js';
import { EXPECTATIONS, type Expectation } from '../tests/eval/expected.ts';

const live = process.argv.includes('--live');
if (!live) setAiClient(new MockAiClient());

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

/**
 * The price for one rate, out of whichever shape this trade stores its rates in.
 *
 * Two layouts exist and both are correct. Fencing nests a plain number under a height band
 * (`rates.timber_pine['1.8m'] = 85`) because a band is a key. Every trade after it keys a LIST of
 * rows by its bucket (`rates.ground_level = [{ material, pricePerSqm }]`) because the row carries
 * more than a price - a tile type, a nullable size, a label, a unit. Flattening either into the
 * other was the alternative and it loses something real each way.
 *
 * So the expectation file writes bucket/row/price for all five, and the knowledge of which field
 * names a row lives here, in ONE place, rather than as five near-identical scoring branches.
 */
/* `jobType` is home renovation's, and it is the field that finds a row in a trade whose rates are
   keyed by room and carry no unit at all. Without it `rateAt` returns undefined for every
   renovation rate and the whole trade scores zero while looking like a model failure. */
const ROW_NAMES = ['tileType', 'size', 'wallType', 'material', 'heightBand', 'jobType', 'label'] as const;
const ROW_PRICES = ['price', 'pricePerMetre', 'pricePerSqm'] as const;

const slug = (v: unknown) => String(v).trim().toLowerCase().replace(/[\s-]+/g, '_');

function rateAt(rates: Record<string, unknown> | undefined, bucket: string, row: string): unknown {
  const inBucket = rates?.[bucket];
  if (inBucket === undefined || inBucket === null) return undefined;

  // Fencing: the bucket is itself a map of band -> price.
  if (!Array.isArray(inBucket)) return (inBucket as Record<string, unknown>)[row];

  const hit = (inBucket as Record<string, unknown>[]).find((r) =>
    ROW_NAMES.some((name) => r[name] != null && slug(r[name]) === row),
  );
  if (!hit) return undefined;
  return ROW_PRICES.map((name) => hit[name]).find((v) => typeof v === 'number');
}

const eq = (name: string, got: unknown, want: unknown): Check => ({
  name,
  ok: JSON.stringify(got) === JSON.stringify(want),
  detail: JSON.stringify(got) === JSON.stringify(want) ? undefined : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
});

async function score(e: Expectation): Promise<Check[]> {
  setRepository(new MemoryRepository());
  clearVocabularyCache();

  const text = readFileSync(`tests/fixtures/${e.file}`, 'utf8');
  /* The fixture's own trade, not fencing's. This was hardcoded while fencing was the only trade
     scored here, and it is the line that decides which SOP and which extraction schema the
     submission meets - a tiling price list sent through it would have been reviewed against
     fencing's rules and rejected for saying nothing about fence heights. */
  const { data } = await runOnboarding('eval', { action: 'submit', businessUid: 'eval', trade: e.trade ?? 'fencing', text });
  const business = data.business as Record<string, any>;

  const checks: Check[] = [eq('approved', data.approved, e.approved)];
  if (!e.pricing || !data.approved) return checks;

  const p = business.pricing;
  const want = e.pricing;

  if (want.gstIncluded !== undefined) checks.push(eq('gstIncluded', p.gstIncluded, want.gstIncluded));
  if (want.minimumCharge !== undefined) checks.push(eq('minimumCharge', p.minimumCharge, want.minimumCharge));
  if (want.baseLocation !== undefined) checks.push(eq('serviceArea.baseLocation', p.serviceArea.baseLocation, want.baseLocation));
  if (want.radiusKm !== undefined) checks.push(eq('serviceArea.radiusKm', p.serviceArea.radiusKm, want.radiusKm));
  if (want.gateCount !== undefined) checks.push(eq('gates', p.gates.length, want.gateCount));
  if (want.siteConditionCount !== undefined) checks.push(eq('siteConditions', p.siteConditions.length, want.siteConditionCount));

  if (want.removals) {
    const got = [...p.removals].sort((a: any, b: any) => a.removes.localeCompare(b.removes));
    checks.push(eq('removals', got, [...want.removals].sort((a, b) => a.removes.localeCompare(b.removes))));
  }

  if (want.counts) {
    for (const [field, n] of Object.entries(want.counts)) {
      checks.push(eq(`${field} count`, Array.isArray(p[field]) ? p[field].length : undefined, n));
    }
  }

  // Rates are scored one band at a time: "18 of 20 correct" is far more useful than "rates: wrong".
  if (want.rates) {
    for (const [material, bands] of Object.entries(want.rates)) {
      for (const [band, price] of Object.entries(bands)) {
        checks.push(eq(`rate ${material} ${band}`, rateAt(p.rates, material, band), price));
      }
    }
    /* Nothing came back that was not asked for. Only meaningful where the bucket is a plain map of
       band -> price: a row-list bucket carries rows this file deliberately does not enumerate -
       tiling's per-job packages sit in the same array as its per-m2 rates - and calling those
       "invented" would report a correct extraction as a fault. */
    const extra = Object.entries(p.rates ?? {})
      .filter(([, b]) => b && !Array.isArray(b))
      .flatMap(([m, b]) =>
        Object.keys(b as object).filter((band) => want.rates?.[m]?.[band] === undefined).map((band) => `${m} ${band}`),
      );
    checks.push({ name: 'no invented rates', ok: extra.length === 0, detail: extra.join(', ') || undefined });
  }

  return checks;
}

let passed = 0;
let total = 0;

console.log(`\n  provider: ${live ? 'openai (live)' : 'mock'}\n`);

for (const e of EXPECTATIONS) {
  const checks = await score(e);
  const ok = checks.filter((c) => c.ok).length;
  passed += ok;
  total += checks.length;

  console.log(`  ${e.file}   ${ok}/${checks.length}`);
  for (const c of checks.filter((c) => !c.ok)) console.log(`      FAIL  ${c.name}  ${c.detail ?? ''}`);
}

const pct = Math.round((passed / total) * 100);
console.log(`\n  score  ${passed}/${total}  (${pct}%)\n`);
process.exit(passed === total ? 0 : 1);
