import { Router } from 'express';
import { business } from './controller.js';
import { env } from './config.js';
import { send, submitLimiter, validateBody } from './http.js';
import { promptSizes } from './prompts.js';
import { businessBody } from './schemas.js';

export const routes = Router();

/** Is the server up, and which model is actually live. */
routes.get('/health', (req, res) =>
  send(req, res, {
    status: 'ok',
    uptime: process.uptime(),
    provider: env.AI_PROVIDER,
    model: env.AI_PROVIDER === 'mock' ? 'mock' : env.OPENAI_MODEL,
    prompts: promptSizes(),
  }),
);

/**
 * Everything the business side does goes here. The `action` field in the body picks the job:
 *   submit  (default) - send a price list for approval
 *   profile           - read back what is stored
 *   confirm           - the business confirms the figures, which makes them live
 *   review / extract  - one stage only, for prompt tuning (ENABLE_DEV_ROUTES=true)
 */
routes.post('/business', submitLimiter, validateBody(businessBody), business);
