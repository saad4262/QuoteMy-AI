/**
 * Is the key the right one, can we reach this project, and can we do the three things the service
 * actually needs?
 *
 * Run this BEFORE flipping STORE=firestore. Two failures have already happened here and both look
 * like something else at first glance:
 *   - a key for a different project authenticates perfectly and returns an empty database, which
 *     is indistinguishable from "nothing has been created yet"
 *   - a key with Storage but no Firestore IAM role fails on the first read with a stack trace that
 *     says nothing about IAM
 * So each capability is probed separately and named.
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
let denied = false;

async function probe(label: string, fn: () => Promise<string>): Promise<boolean> {
  try {
    console.log(`  ${label.padEnd(24)} ok      ${await fn()}`);
    return true;
  } catch (err) {
    const e = err as { code?: number; message?: string };
    if (e.code === 7) denied = true;
    console.log(`  ${label.padEnd(24)} FAILED  ${String(e.message).split('\n')[0]}`);
    return false;
  }
}

const canRead = await probe('firestore read', async () => {
  const snap = await db.collection('businesses').limit(5).get();
  return `businesses/ has ${snap.size} document(s)${snap.size ? '' : '  <-- right project?'}`;
});

await probe('firestore write', async () => {
  const ref = db.collection('_preflight').doc('probe');
  await ref.set({ at: Date.now() });
  await ref.delete();
  return 'wrote and deleted a scratch document';
});

await probe('storage bucket', async () => {
  const [exists] = await getStorage().bucket().exists();
  if (!exists) throw new Error('bucket not found - check FIREBASE_STORAGE_BUCKET');
  return 'reachable';
});

if (denied) {
  console.log(`
  Firestore says PERMISSION_DENIED. The credentials are fine - if Storage passed above, they
  reach the right project. This service account is missing the Firestore IAM role.

    Google Cloud Console -> IAM & Admin -> IAM
    find  ${sa.client_email}
    Edit -> Add another role -> "Cloud Datastore User"   (roles/datastore.user)
    Save, wait about a minute, run this again.

  Note: Firestore security rules are NOT the cause. The Admin SDK bypasses rules entirely; this
  is IAM, one level above them.
`);
  process.exit(1);
}

if (canRead) {
  const raws = (await db.collectionGroup('description').limit(20).get()).docs.filter((d) => d.ref.id === 'raw');
  const pending = raws.filter((d) => d.get('status') === 'pending');
  console.log(`\n  description/raw docs     ${raws.length}`);
  console.log(`  waiting on us            ${pending.length}`);
  for (const doc of pending) console.log(`    ${doc.ref.path}`);

  const businesses = await db.collection('businesses').limit(5).get();
  for (const doc of businesses.docs) {
    const collections = await doc.ref.listCollections();
    console.log(`\n  ${doc.id}  ${doc.get('businessName') ?? '(no businessName)'}`);
    console.log(`    subcollections: ${collections.map((c) => c.id).join(', ') || 'none'}`);
  }
}

console.log('\n  All good. Set STORE=firestore and WORKER_ENABLED=true.\n');
process.exit(0);
