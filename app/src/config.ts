import { z } from 'zod';
import pino from 'pino';

// Node reads .env itself since v20 - no dotenv package needed.
try {
  process.loadEnvFile();
} catch {
  // no .env file: fine, we fall back to real environment variables
}

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGINS: z.string().default('*'),
  ENABLE_DEV_ROUTES: z.stringbool().default(false),

  // mock = deterministic offline reader, no API key, no spend
  AI_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.6-terra'),
  MODEL_TIMEOUT_MS: z.coerce.number().default(45_000),
  MAX_COST_PER_REQUEST_USD: z.coerce.number().default(0.5),
  /**
   * A ceiling on what the customer chat can spend in a day, across everybody.
   *
   * Rate limits bound how fast one caller can go; they cannot bound a distributed flood, where
   * every individual caller looks reasonable. This is the one control that does, because the
   * damage from that is measured in dollars rather than requests. At roughly $0.0003 a turn,
   * $25 is about 80,000 turns - far past any real day's traffic, and far short of a surprise.
   */
  MAX_CHAT_SPEND_PER_DAY_USD: z.coerce.number().default(25),

  // Resolves serviceArea.baseLocation to a point so the customer side can match by distance.
  // Unset means the field stays null - never a guessed coordinate.
  GEOCODING_API_KEY: z.string().optional(),

  MIN_TEXT_CHARS: z.coerce.number().default(40),
  MAX_TEXT_CHARS: z.coerce.number().default(60_000),

  // memory    = in-process, cleared on restart. Tests and Postman use this and need no credentials.
  // firestore = the real thing; the frontend writes submissions, this service answers them.
  STORE: z.enum(['memory', 'firestore']).default('memory'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // The sweeper. Its whole job is that a submission is never lost because one HTTP call failed.
  WORKER_ENABLED: z.stringbool().default(false),
  WORKER_INTERVAL_MS: z.coerce.number().default(120_000),
  WORKER_MAX_ATTEMPTS: z.coerce.number().default(3),
  WORKER_STALE_MS: z.coerce.number().default(600_000),
  WORKER_BATCH: z.coerce.number().default(5),
});

// An empty value in .env means "not set", not "the empty string".
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));
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

if (env.STORE === 'firestore' && !env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('STORE=firestore but GOOGLE_APPLICATION_CREDENTIALS is not set');
  process.exit(1);
}

// The sweeper reads and writes Firestore. Enabling it against the memory store would busy-loop
// over nothing, which looks like it is working and is not.
if (env.WORKER_ENABLED && env.STORE !== 'firestore') {
  console.error('WORKER_ENABLED=true requires STORE=firestore');
  process.exit(1);
}

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProd ? {} : { transport: { target: 'pino-pretty' } }),
  redact: ['req.headers.authorization', 'apiKey', 'OPENAI_API_KEY'],
});
