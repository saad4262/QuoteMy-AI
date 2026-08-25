import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { env } from './config.js';

/**
 * The only file that talks to Firebase, the same way src/ai.ts is the only one that talks to
 * OpenAI. One place to audit for credential handling, one place to change.
 *
 * Lazy on purpose: tests, typecheck and every mock run must never need a service account, and
 * `STORE=memory` should not touch this file at all.
 *
 * The Admin SDK bypasses security rules entirely. That is why this service can write the documents
 * a business is forbidden to write - and it is also why nothing here should ever accept a path or
 * a uid it has not derived itself.
 */

let app: App | null = null;

/**
 * The key reaches us one of two ways, and never through the repo: a file on disk, or - where the
 * host has no writable disk, as on Vercel - the same JSON base64 encoded into an env var.
 */
function serviceAccountJson(): ServiceAccount & { project_id: string } {
  if (env.FIREBASE_SERVICE_ACCOUNT_B64) {
    return JSON.parse(Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
  }
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    return JSON.parse(readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  }
  throw new Error('Neither FIREBASE_SERVICE_ACCOUNT_B64 nor GOOGLE_APPLICATION_CREDENTIALS is set');
}

function firebase(): App {
  if (app) return app;

  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }

  const serviceAccount = serviceAccountJson();
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: env.FIREBASE_PROJECT_ID ?? serviceAccount.project_id,
    storageBucket: env.FIREBASE_STORAGE_BUCKET ?? `${serviceAccount.project_id}.firebasestorage.app`,
  });
  return app;
}

export const db = (): Firestore => getFirestore(firebase());

export const bucket = () => getStorage(firebase()).bucket();

/** Downloads a file by its storage PATH, not a download URL - works on a private bucket. */
export async function downloadFile(path: string): Promise<Buffer> {
  const [contents] = await bucket().file(path).download();
  return contents;
}
