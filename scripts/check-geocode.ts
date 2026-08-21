/**
 * Does the geocoding key work from THIS process?
 *
 * The trap worth catching: a Google Maps key made for the frontend is usually restricted by HTTP
 * referrer, and a referrer-restricted key fails from a server with REQUEST_DENIED - which reads
 * like a billing or permissions problem and is neither. This says so outright.
 *
 *   npm run geocode:check
 */
import { geocode } from '../src/geocode.js';
import { env } from '../src/config.js';

if (!env.GEOCODING_API_KEY) {
  console.error('\n  GEOCODING_API_KEY is not set in .env');
  console.error('  Until it is, serviceArea.resolved stays null - which is safe, just not useful.\n');
  process.exit(1);
}

// Three spellings of one place: they must all land on the same point, from one lookup.
const inputs = ['Berwick', 'Berwick VIC 3806', '  berwick  '];

console.log('');
for (const input of inputs) {
  const r = await geocode(input);
  console.log(
    `  ${JSON.stringify(input).padEnd(20)} ${
      r ? `${r.suburb}, ${r.state} ${r.postcode}  ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : 'not resolved'
    }`,
  );
}

// All of them, not just the ends - the middle one is the postcode case, which is the one that
// used to come back as a different suburb entirely.
const all = await Promise.all(inputs.map((i) => geocode(i)));
const first = all[0];
const same =
  all.every((r) => r) &&
  new Set(all.map((r) => `${r!.suburb}|${r!.lat.toFixed(3)}|${r!.lng.toFixed(3)}`)).size === 1;

console.log(`\n  all three spellings agree  ${same ? 'yes' : 'NO - they resolve to different places'}`);
console.log(`  ${first ? 'Working. serviceArea.resolved will be filled in from now on.' : 'Not working - see the message above.'}\n`);
process.exit(first ? 0 : 1);
