/**
 * Republish a trade's `schema/{trade}` document from the compiled vocabulary.
 *
 *   npx tsx scripts/resync-schema.ts home_renovation           show what would change
 *   npx tsx scripts/resync-schema.ts home_renovation --write   actually write it
 *
 * WHY THIS HAS TO EXIST, AND WHY IT IS NOT AUTOMATIC.
 *
 * `seedTradeSchemas()` runs at boot and SEEDS - it writes the document when there is none and then
 * never touches it again ("already published - leave it exactly as it is"). That is deliberate: the
 * customer chat reads its options, labels and questions from Firestore at runtime, so a business
 * can add a material there and have it survive every restart without a deploy. The document belongs
 * to whoever maintains it, not to the code.
 *
 * The cost of that is the thing this script fixes. Adding a value to `vocab.ts` changes what the
 * BUSINESS side accepts and nothing at all about what the CUSTOMER is offered - the published
 * document still holds the old list, and the new option simply never appears on anybody's screen.
 * Found the hard way: `single_trade` was added, typechecked, tested and shipped to the review
 * prompts, and a customer asking to have a room painted was still shown four options with no
 * honest answer among them.
 *
 * So it is a deliberate command, run by a person, that says out loud what it will overwrite -
 * because overwriting is exactly what it does, and anything edited in Firestore by hand is lost.
 */
import { CUSTOMER_CORE, CUSTOMER_LABELS, TRADE_QUESTIONS } from '../src/messages.js';
import { db } from '../src/firebase.js';
import { TRADES, type Trade } from '../src/vocab.js';

const named = process.argv[2];
const write = process.argv.includes('--write');

if (!named || !(TRADES as readonly string[]).includes(named)) {
  console.error(`\n  usage: npx tsx scripts/resync-schema.ts <trade> [--write]\n  trades: ${TRADES.join(', ')}\n`);
  process.exit(1);
}
const trade = named as Trade;

const ref = db().collection('schema').doc(trade);
const snap = await ref.get();

if (!snap.exists) {
  console.log(`\n  schema/${trade} does not exist yet - the next boot will seed it. Nothing to do.\n`);
  process.exit(0);
}

const publishedCore = (snap.get('core') ?? {}) as Record<string, string[]>;
const compiledCore = Object.fromEntries(
  Object.entries(CUSTOMER_CORE[trade]).map(([name, values]) => [name, [...values]]),
) as Record<string, string[]>;

console.log(`\n  schema/${trade}\n`);
let drifted = 0;
for (const list of new Set([...Object.keys(publishedCore), ...Object.keys(compiledCore)])) {
  const live = publishedCore[list] ?? [];
  const code = compiledCore[list] ?? [];
  const added = code.filter((v) => !live.includes(v));
  const gone = live.filter((v) => !code.includes(v));
  if (!added.length && !gone.length) continue;
  drifted += 1;
  console.log(`  ${list}`);
  /* "only in Firestore" is NOT presented as an error. It is very often a value somebody added on
     purpose, and this script is about to delete it - which is the whole reason it prints first. */
  for (const v of added) console.log(`      + ${v}   (in the code, missing from the published document)`);
  for (const v of gone) console.log(`      - ${v}   (in Firestore only - WILL BE LOST)`);
}

if (!drifted) {
  console.log('  already matches the compiled vocabulary. Nothing to do.\n');
  process.exit(0);
}

if (!write) {
  console.log('\n  nothing written. Re-run with --write to publish this.\n');
  process.exit(0);
}

await ref.set(
  {
    core: compiledCore,
    labels: CUSTOMER_LABELS[trade],
    questions: TRADE_QUESTIONS[trade],
    updatedAt: new Date().toISOString(),
  },
  { merge: true },
);
/* `fields` is deliberately NOT rewritten here. It carries the checklist's shape - what is asked, in
   what order, with what depends on what - and republishing it from code would silently undo a
   published change to the conversation itself. Vocabulary is what this script is for. */
console.log(`\n  published. The chat caches for 5 minutes, so it may take that long to appear.\n`);
