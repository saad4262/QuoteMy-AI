import { Router } from 'express';
import multer from 'multer';
import { business } from './controller.js';
import { fencingChat } from './client/controller.js';
import { chatBody } from './client/schemas.js';
import { chatIpLimiter, chatLimiter } from './client/limits.js';
import { chatSpendToday } from './client/spend.js';
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
    store: env.STORE,
    prompts: promptSizes(),
    chatSpend: chatSpendToday(),
  }),
);

/**
 * Everything the business side does goes here. The `action` field in the body picks the job:
 *   submit  (default) - send details for approval, as text, files, or both
 *   process           - frontend already wrote Firestore; nudge this service to read it
 *   profile           - read back what is stored
 *   confirm           - the business confirms the figures, which makes them live
 *   review / extract  - one stage only, for prompt tuning (ENABLE_DEV_ROUTES=true)
 *
 * Send it as JSON, or as multipart/form-data with the same fields plus one or more `files`.
 */
routes.post('/business', submitLimiter, upload.array('files', LIMITS.count), validateBody(businessBody), business);

/**
 * The customer side: one turn of the fencing quote chat per call. No `action` switch here - every
 * request is the same conversation, one message further along. `sessionId` plus the client-echoed
 * `knownChecklist` (see `client/schemas.ts`) is the whole of the session state; nothing is kept
 * server-side between calls.
 *
 * Send it as JSON, or as multipart/form-data with the same fields plus an optional attached PDF or
 * photo of an existing quote.
 */
routes.post(
  '/client/fencing-chat',
  upload.array('files', LIMITS.count),
  validateBody(chatBody),
  // Order matters: both limiters key off the parsed body, so they run after multer and validation.
  chatIpLimiter,
  chatLimiter,
  fencingChat,
);
