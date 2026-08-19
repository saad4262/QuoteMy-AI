import 'dotenv/config';
import { z } from 'zod';

// Fail at boot, not on the first request that needs a missing key.
const schema = z.object({
  PORT: z.coerce.number().default(8787),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGINS: z.string().default('*'),
  ENABLE_DEV_ROUTES: z.stringbool().default(false),

  // --- model ---
  AI_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.6-terra'),
  MODEL_TIMEOUT_MS: z.coerce.number().default(45_000),
  MAX_COST_PER_REQUEST_USD: z.coerce.number().default(0.5),

  // --- input limits ---
  MIN_TEXT_CHARS: z.coerce.number().default(40),
  MAX_TEXT_CHARS: z.coerce.number().default(60_000),

  // --- storage: in-memory until Firebase is wired up ---
  STORE: z.enum(['memory', 'firestore']).default('memory'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  N8N_WEBHOOK_BASE: z.url().optional(),

  // true  = every /api route requires a valid Firebase ID token
  // false = local dev only; requests may pass x-debug-uid instead
  REQUIRE_AUTH: z.stringbool().default(true),
});

// An empty value in .env means "not set", not "the empty string" - otherwise a blank optional
// key fails validation and takes the whole boot down with it.
const raw = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''),
);

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  console.error('Invalid environment:', JSON.stringify(z.treeifyError(parsed.error), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
  console.error('AI_PROVIDER=openai but OPENAI_API_KEY is not set');
  process.exit(1);
}
if (env.STORE === 'firestore' && !env.FIREBASE_PROJECT_ID) {
  console.error('STORE=firestore but FIREBASE_PROJECT_ID is not set');
  process.exit(1);
}
