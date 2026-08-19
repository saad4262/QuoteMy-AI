import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { assertPromptBudgets, promptSizes } from './prompts/index.js';

// A fat SOP fails the boot, not next month's bill (docs/FLOW.md 13).
assertPromptBudgets();

const server = createApp().listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, provider: env.AI_PROVIDER, store: env.STORE, prompts: promptSizes() },
    'quotemy-ai api listening',
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
  });
}
