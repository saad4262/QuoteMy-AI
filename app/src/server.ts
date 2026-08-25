import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, logger } from './config.js';
import { errorHandler, notFound, requestId, requestLog } from './http.js';
import { FirestoreRepository } from './firestore.store.js';
import { assertPromptBudgets, promptSizes } from './prompts.js';
import { routes } from './routes.js';
import { TRADES } from './vocab.js';
import { setRepository } from './store.js';
import { startWorker } from './worker.js';

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

/**
 * Everything that must happen before the first request, on any host: prompt budgets checked, the
 * store wired up. No port and no worker, because a serverless host owns the first and cannot run
 * the second - see api/index.ts.
 */
export function initialize(): void {
  assertPromptBudgets();

  if (env.STORE === 'firestore') {
    const repo = new FirestoreRepository();
    setRepository(repo);
    // Publish each trade's vocabulary so the customer side always has a document to read, even for
    // a trade no business has extended yet.
    for (const trade of TRADES) {
      void repo.syncTradeSchema(trade).catch((err) => logger.warn({ err, trade }, 'could not publish trade schema'));
    }
  }
}

// Only start listening when run directly, so tests can import createApp without a port - and so a
// serverless host, which imports this module to get the app, never tries to bind one.
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  initialize();
  if (env.WORKER_ENABLED) startWorker();

  const server = createApp().listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, provider: env.AI_PROVIDER, store: env.STORE, prompts: promptSizes() },
      'api listening',
    );
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
