import { randomUUID } from 'node:crypto';
import { logger } from '../config.js';
import { getRepository, type BusinessRepository, type QuoteResultDoc } from '../store.js';
import type { ChatResponse } from './schemas.js';

/**
 * The finished quote, written where the frontend can listen for it.
 *
 * Until now a chat turn existed only as an HTTP response body. That works for a browser that made
 * the request and not at all for a voice call, where nothing on screen asked for anything - so the
 * result has to land somewhere a page can watch. Same arrangement the business side already has
 * with `description/lastaireview`.
 *
 * Called from the route rather than from `runFencingChat`, deliberately. Persistence is a transport
 * concern; keeping it out of the orchestration means the pipeline stays a pure function of its
 * input, which is what lets the golden conversations drive it turn after turn with nothing to
 * clean up between them.
 */

/**
 * A turn that produced a result, one way or the other.
 *
 * A failure is a result too - "nobody covering your suburb came in under $2,000" arrives as
 * `type: 'result'` with an empty `results` array and a `noMatchReason`, and that is exactly what
 * the customer needs to see. The frontend has to render both.
 */
export const isFinal = (response: ChatResponse): boolean => response.type === 'result';

export async function saveChatResult(
  response: ChatResponse,
  repo: BusinessRepository = getRepository(),
): Promise<string | null> {
  if (!isFinal(response)) return null;

  // Generated here, never taken from the caller. The document is world-readable, so this id is the
  // whole of the access control - an id anyone could guess would hand them a stranger's quote.
  const resultId = randomUUID();

  // `_ui` is how the conversation remembers itself, not part of the quote. It carries no secret,
  // but a results page has no use for a paging cursor.
  const { _ui: _ignored, ...checklist } = response.checklist;

  const doc: QuoteResultDoc = {
    displayState: 'ready',
    sessionId: response.sessionId,
    trade: response.trade,
    intent: response.intent,
    message: response.message,
    results: response.results,
    comparison: response.comparison ?? null,
    alternatives: response.alternatives ?? null,
    checklist,
    checklistDisplay: response.checklistDisplay,
    noMatchReason: response.noMatchReason ?? null,
    updatedAt: new Date().toISOString(),
  };

  try {
    await repo.saveQuoteResult(resultId, doc);
    return resultId;
  } catch (err) {
    // The customer has their answer in the response body either way. Failing the turn over a write
    // they may never need would be the worse trade - so this is reported, not thrown.
    logger.error({ err, sessionId: response.sessionId }, 'could not save the quote result');
    return null;
  }
}
