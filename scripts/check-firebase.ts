/**
 * Is the key the right one, and can we actually reach this project?
 *
 * Run this BEFORE flipping STORE=firestore. The first key tried here was for a different project
 * entirely - it authenticated perfectly and returned an empty database, which looks identical to
 * "nothing has been created yet". This says which project it is and whether anything is in it.
 *
 *   npm run firebase:check
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './serviceAccount.json';

let sa: { project_id: string; client_email: string };
try {
  sa = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  console.error(`\n  Could not read ${keyPath}`);
  console.error('  Put the service account key there, or set GOOGLE_APPLICATION_CREDENTIALS.\n');
  process.exit(1);
}

const bucketName = process.env.FIREBASE_STORAGE_BUCKET ?? `${sa.project_id}.firebasestorage.app`;
initializeApp({ credential: cert(sa as never), projectId: sa.project_id, storageBucket: bucketName });

console.log(`\n  project      ${sa.project_id}`);
console.log(`  service acct ${sa.client_email}`);
console.log(`  bucket       ${bucketName}\n`);

const db = getFirestore();

const businesses = await db.collection('businesses').limit(5).get();
console.log(`  businesses/  ${businesses.size} document(s) found${businesses.size ? '' : '  <-- is this the right project?'}`);

for (const doc of businesses.docs) {
  const name = doc.get('businessName') ?? '(no businessName)';
  const collections = await doc.ref.listCollections();
  console.log(`    ${doc.id}  ${name}  [${collections.map((c) => c.id).join(', ') || 'no subcollections'}]`);
}

// The one the service will actually read from.
const raws = await db.collectionGroup('description').limit(5).get();
const pending = raws.docs.filter((d) => d.ref.id === 'raw' && d.get('status') === 'pending');
console.log(`\n  description/raw docs   ${raws.docs.filter((d) => d.ref.id === 'raw').length}`);
console.log(`  waiting on us          ${pending.length}`);
for (const doc of pending) console.log(`    ${doc.ref.path}`);

try {
  const [exists] = await getStorage().bucket().exists();
  console.log(`\n  storage bucket         ${exists ? 'reachable' : 'NOT FOUND - check FIREBASE_STORAGE_BUCKET'}`);
} catch (err) {
  console.log(`\n  storage bucket         could not be checked: ${(err as Error).message}`);
}

console.log('\n  If the project and businesses look right, set STORE=firestore and WORKER_ENABLED=true.\n');
process.exit(0);
