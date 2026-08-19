import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, logger } from './config.js';
import { errorHandler, notFound, requestId, requestLog } from './http.js';
import { assertPromptBudgets, promptSizes } from './prompts.js';
import { routes } from './routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(helmet()); // security headers on every response, one line
  app.use(cors({ origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLog);

  app.use('/api/v1', routes);

  // Anything that matched no route above. Must be an AppError, or errorHandler calls it a 500.
  app.use((req, _res, next) => next(notFound(`No route for ${req.method} ${req.path}`)));
  app.use(errorHandler);

  return app;
}

// Only start listening when run directly, so tests can import createApp without a port.
if (process.env.NODE_ENV !== 'test') {
  assertPromptBudgets(); // a fat SOP fails the boot, not next month's bill

  const server = createApp().listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV, provider: env.AI_PROVIDER, prompts: promptSizes() }, 'api listening');
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
