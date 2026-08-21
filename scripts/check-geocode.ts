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

const first = await geocode(inputs[0]!);
const last = await geocode(inputs[2]!);
const same = first && last && first.lat === last.lat && first.lng === last.lng;

console.log(`\n  cache: all three spellings agree  ${same ? 'yes' : 'NO - check the cache key'}`);
console.log(`  ${first ? 'Working. serviceArea.resolved will be filled in from now on.' : 'Not working - see the message above.'}\n`);
process.exit(first ? 0 : 1);
