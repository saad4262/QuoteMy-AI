/**
 * Does the image search work from THIS process, and is what comes back worth showing?
 *
 * Two things worth seeing with your own eyes, because neither shows up as an error: whether the key
 * is live, and whether the photos are spread across sites rather than being one fencing company's
 * gallery four times over. The second is the whole reason `spread()` exists, and a dashboard cannot
 * tell you about it.
 *
 *   npm run pictures:check
 */
import { env } from '../src/config.js';
import { findPictures, imageQuery } from '../src/client/pictures.js';

if (!env.SERPER_API_KEY) {
  console.error('\n  SERPER_API_KEY is not set in .env');
  console.error('  Until it is, "show me colorbond" is answered in words instead - safe, just plainer.\n');
  process.exit(1);
}

/* One on the list, one that is not, and one that leans on the fence already chosen. The middle one
   is the case pictures matter most in: nobody here prices post and rail, and the customer still
   deserves to see what they just named. */
const asks: [string, string | null][] = [
  ['show me what colorbond looks like', null],
  ['have you got a picture of post and rail', null],
  ['what colours does it come in', 'Treated pine'],
];

console.log('');
let worked = 0;

for (const [question, material] of asks) {
  const images = await findPictures(question, material);
  const sites = [...new Set(images.map((image) => image.sourceName))];

  console.log(`  ${JSON.stringify(question)}`);
  console.log(`    searched for  ${imageQuery(question, material)}`);
  console.log(`    found         ${images.length} photo(s) from ${sites.length} site(s)`);
  if (images.length) {
    worked += 1;
    for (const image of images) console.log(`      ${image.sourceName.padEnd(28)} ${image.width}x${image.height}`);
  }
  console.log('');
}

/* Credits are the only honest proof the call left the building - a cached or empty answer looks
   identical from in here. Three questions, three credits, and the dashboard should say so. */
console.log(`  ${worked} of ${asks.length} came back with photos`);
console.log('  Each question above spent one Serper credit. Check serper.dev to confirm the count moved.');
console.log(
  worked
    ? '  Working. A customer who asks to see something now gets photos instead of a paragraph.\n'
    : '  Not working - the key may be wrong, or the searches genuinely found nothing usable.\n',
);
process.exit(worked ? 0 : 1);
