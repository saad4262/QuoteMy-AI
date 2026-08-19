import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';
import { env } from './env.js';

/**
 * Firebase is not wired up yet - only token verification uses it, and only when REQUIRE_AUTH=true.
 * Lazy on purpose: tests, typecheck and local mock runs never need credentials.
 */
function app() {
  const existing = getApps()[0];
  if (existing) return existing;

  const credential = env.GOOGLE_APPLICATION_CREDENTIALS
    ? cert(JSON.parse(readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')))
    : applicationDefault();

  return initializeApp({ credential, projectId: env.FIREBASE_PROJECT_ID });
}

export const auth = () => getAuth(app());
