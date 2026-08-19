import { Router } from 'express';
import multer from 'multer';
import { business } from './controller.js';
import { env } from './config.js';
import { send, submitLimiter, validateBody } from './http.js';
import { LIMITS } from './ingest.js';
import { promptSizes } from './prompts.js';
import { businessBody } from './schemas.js';

/**
 * Files stay in memory: nothing is written to disk, so nothing is left behind and nothing can be
 * executed. multer ignores requests that are not multipart, so the JSON body keeps working exactly
 * as before. The limits here are a first line - ingest.ts checks them again with better messages.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITS.perFile, files: LIMITS.count },
});

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
 *   submit  (default) - send details for approval, as text, files, or both
 *   profile           - read back what is stored
 *   confirm           - the business confirms the figures, which makes them live
 *   review / extract  - one stage only, for prompt tuning (ENABLE_DEV_ROUTES=true)
 *
 * Send it as JSON, or as multipart/form-data with the same fields plus one or more `files`.
 */
routes.post('/business', submitLimiter, upload.array('files', LIMITS.count), validateBody(businessBody), business);
