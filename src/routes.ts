import { Router } from 'express';
import * as c from './controller.js';
import { env } from './config.js';
import { auth, notFound, send, submitLimiter, validateBody } from './http.js';
import { promptSizes } from './prompts.js';
import { submitBody } from './schemas.js';
import { BOUNDS, CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, TAGS, TRADES, UNITS } from './vocab.js';

export const routes = Router();

// --- open ---------------------------------------------------------------------------------
routes.get('/health', (req, res) => send(req, res, { status: 'ok', uptime: process.uptime() }));

routes.get('/ready', (req, res) =>
  send(req, res, {
    status: 'ok',
    provider: env.AI_PROVIDER,
    model: env.AI_PROVIDER === 'mock' ? 'mock' : env.OPENAI_MODEL,
    prompts: promptSizes(),
  }),
);

/** The frontend renders its tick-boxes from this, so the enums can never drift apart. */
routes.get('/vocab/:trade', (req, res) => {
  if (!(TRADES as readonly string[]).includes(req.params.trade ?? '')) {
    throw notFound(`No vocabulary for trade "${req.params.trade}"`);
  }
  send(req, res, {
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

// --- signed in ----------------------------------------------------------------------------
routes.post('/business/onboarding', auth, submitLimiter, validateBody(submitBody), c.submit);
routes.get('/business/profile/:trade', auth, c.profile);
routes.post('/business/profile/:trade/confirm', auth, c.confirm);

// --- prompt tuning, off in production -----------------------------------------------------
if (env.ENABLE_DEV_ROUTES) {
  routes.post('/dev/review', auth, validateBody(submitBody), c.devReview);
  routes.post('/dev/extract', auth, validateBody(submitBody), c.devExtract);
}
