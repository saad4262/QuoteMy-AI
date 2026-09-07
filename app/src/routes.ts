import { Router } from 'express';
import multer from 'multer';
import { business } from './controller.js';
import { clientChat } from './client/controller.js';
import { createVoiceCall, voiceSession, voiceTurn, voiceTurnBody } from './client/voice/controller.js';
import { chatBody } from './client/schemas.js';
import { chatIpLimiter, chatLimiter, voiceCallLimiter } from './client/limits.js';
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
 * The customer side: one turn of the quote chat per call, for whichever trade the body names. No `action` switch here - every
 * request is the same conversation, one message further along. `sessionId` plus the client-echoed
 * `knownChecklist` (see `client/schemas.ts`) is the whole of the session state; nothing is kept
 * server-side between calls.
 *
 * Send it as JSON, or as multipart/form-data with the same fields plus an optional attached PDF or
 * photo of an existing quote.
 */
/* Two paths, one handler. `/client/fencing-chat` is what the deployed frontend calls and keeps
   working for ever - a rename that breaks a shipped client is not a rename, it is an outage. */
for (const path of ['/client/chat', '/client/fencing-chat']) {
  routes.post(
    path,
    upload.array('files', LIMITS.count),
    validateBody(chatBody),
    // Order matters: both limiters key off the parsed body, so they run after multer and validation.
    chatIpLimiter,
    chatLimiter,
    clientChat,
  );
}

/**
 * The customer side again, spoken. One turn per call, same pipeline, same guards - the only thing
 * that differs is that the words arrive transcribed and leave as words to be read out.
 *
 * `sessionId` is a query parameter rather than part of the body on purpose: the speech agent fills
 * the body from what it heard, and a session id is not something anybody says out loud.
 */
routes.post('/voice/turn', chatIpLimiter, validateBody(voiceTurnBody), voiceTurn);

/** A browser about to start a call asks for a session here, so it never invents one itself. */
routes.post('/voice/create-call', voiceCallLimiter, createVoiceCall);

/* Where a call becomes a chat. The page asks for this when the Retell SDK says the call ended,
   whoever hung up, and carries the conversation on by typing. */
routes.get('/voice/session', chatIpLimiter, voiceSession);
