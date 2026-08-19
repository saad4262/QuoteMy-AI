import { Router } from 'express';
import { businessRoutes } from './onboarding.routes.js';
import { devRoutes } from './dev.routes.js';
import { env } from '../config/env.js';
import { promptSizes } from '../prompts/index.js';
import { CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, TAGS, TRADES, UNITS, BOUNDS } from '../shared/vocab.js';
import { sendSuccess } from '../utils/respond.js';
import { AppError } from '../utils/AppError.js';

export const routes = Router();

routes.get('/health', (req, res) => sendSuccess(req, res, { status: 'ok', uptime: process.uptime() }));

routes.get('/ready', (req, res) =>
  sendSuccess(req, res, {
    status: 'ok',
    provider: env.AI_PROVIDER,
    model: env.AI_PROVIDER === 'mock' ? 'mock' : env.OPENAI_MODEL,
    store: env.STORE,
    prompts: promptSizes(),
  }),
);

/** The frontend renders its tick-boxes from this, so the enums can never drift apart. */
routes.get('/vocab/:trade', (req, res) => {
  if (!(TRADES as readonly string[]).includes(req.params.trade ?? '')) {
    throw AppError.notFound(`No vocabulary for trade "${req.params.trade}"`);
  }
  sendSuccess(req, res, {
    trade: req.params.trade,
    materials: MATERIALS,
    gateTypes: GATE_TYPES,
    conditions: CONDITIONS,
    removes: REMOVES,
    units: UNITS,
    tags: TAGS,
    bounds: BOUNDS,
  });
});

routes.use('/business', businessRoutes);

if (env.ENABLE_DEV_ROUTES) routes.use('/dev', devRoutes);
