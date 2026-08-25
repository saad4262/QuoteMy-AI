import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { chatLimitHandler } from './errors.js';

/**
 * Chat is limited per CONVERSATION, not per address.
 *
 * Two reasons an IP limit is the wrong tool for a chatbot. Behind a load balancer every request
 * arrives wearing the balancer's address, so the limiter quietly becomes a global one and the
 * first busy hour locks everybody out. And a household, an office or a phone network share one
 * address between many real people, none of whom did anything wrong.
 *
 * 40 a minute is far more than anyone types - it is sized to catch a client stuck in a loop, not
 * a fast talker. Nobody should ever meet this while having a conversation.
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const sessionId = (req.body as { sessionId?: unknown } | undefined)?.sessionId;
    return typeof sessionId === 'string' && sessionId.trim() ? `s:${sessionId.trim()}` : ipKeyGenerator(req.ip ?? '');
  },
  handler: chatLimitHandler('too_fast'),
});

/**
 * The backstop the per-session limit cannot provide: a session id is chosen by the caller, so
 * anyone scripting this can mint a fresh one per request and never meet the limit above.
 *
 * Sized for a shared address - a house, an office, a phone network - so it stays generous for
 * real people while a script runs out of room. Around 30 full conversations an hour.
 */
export const chatIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: chatLimitHandler('rate_limited'),
});
