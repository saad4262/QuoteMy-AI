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

const eq = (name: string, got: unknown, want: unknown): Check => ({
  name,
  ok: JSON.stringify(got) === JSON.stringify(want),
  detail: JSON.stringify(got) === JSON.stringify(want) ? undefined : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
});

async function score(e: Expectation): Promise<Check[]> {
  setRepository(new MemoryRepository());
  clearVocabularyCache();

  const text = readFileSync(`tests/fixtures/${e.file}`, 'utf8');
  const { data } = await runOnboarding('eval', { action: 'submit', businessUid: 'eval', trade: 'fencing', text });
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

  // Rates are scored one band at a time: "18 of 20 correct" is far more useful than "rates: wrong".
  if (want.rates) {
    for (const [material, bands] of Object.entries(want.rates)) {
      for (const [band, price] of Object.entries(bands)) {
        checks.push(eq(`rate ${material} ${band}`, p.rates?.[material]?.[band], price));
      }
    }
    const extra = Object.entries(p.rates ?? {}).flatMap(([m, b]) =>
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
