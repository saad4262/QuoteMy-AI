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

  MIN_TEXT_CHARS: z.coerce.number().default(40),
  MAX_TEXT_CHARS: z.coerce.number().default(60_000),

  // false = local only; an x-debug-uid header stands in for a Firebase token
  REQUIRE_AUTH: z.stringbool().default(true),
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

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProd ? {} : { transport: { target: 'pino-pretty' } }),
  redact: ['req.headers.authorization', 'apiKey', 'OPENAI_API_KEY'],
});
