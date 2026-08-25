import type { Request, Response } from 'express';
import type { Checklist } from './schemas.js';

/**
 * A failed turn, in the same shape as a good one.
 *
 * The chat used to answer success with a flat object and failure with a `{ ok, error }` envelope,
 * so the only thing a client could reasonably do with any failure was print "something went
 * wrong" - eleven distinct error codes, none of which ever reached a customer.
 *
 * Two fields carry the weight. `retryable` answers the only question the UI actually has: is
 * sending this same message again worth a try? And `checklist` is handed straight back, because a
 * client that does `checklist = response.checklist` would otherwise lose the entire brief to one
 * bad second.
 */
export interface ChatErrorResponse {
  type: 'error';
  code: string;
  message: string;
  retryable: boolean;
  sessionId: string | null;
  options: never[];
  checklist: Partial<Checklist>;
  checklistComplete: false;
  results: never[];
}

/** Retryable means "the same message, sent again, might work" - not "the customer should retype it". */
const RETRYABLE = new Set(['upstream_busy', 'upstream_unavailable', 'upstream_timeout', 'schema_violation', 'internal_error']);

/**
 * Written to be read by a customer, not a developer. The provider's own wording never appears
 * here - it can echo prompt content back out.
 */
const CUSTOMER_MESSAGE: Record<string, string> = {
  upstream_busy: "We're a bit busy right now — give that another go in a moment.",
  upstream_unavailable: 'Something went wrong on our end — mind trying that again?',
  upstream_timeout: 'That took longer than it should have — try sending it again.',
  schema_violation: 'Something went wrong on our end — mind trying that again?',
  internal_error: 'Something went wrong on our end — mind trying that again?',
  at_capacity: "We're at capacity right now — please try again a little later.",
  too_fast: "That's a lot of messages at once — give it a second.",
  rate_limited: 'Too many messages from this connection — try again shortly.',
  payload_too_large: 'That file is too big — send one under 20 MB.',
  unsupported_file_type: "We can't read that kind of file — send a PDF, a photo, a Word file or plain text.",
  bad_request: "Something about that request wasn't right — please try again.",
};

/** `''` and unparsable JSON both mean "nothing sent yet" - never a reason to fail the request. */
export function asObject<T>(value: string | undefined): T | null {
  if (!value?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export function chatError(req: Request, code: string): ChatErrorResponse {
  const body = req.body as { sessionId?: string; knownChecklist?: string } | undefined;
  return {
    type: 'error',
    code,
    message: CUSTOMER_MESSAGE[code] ?? CUSTOMER_MESSAGE.internal_error!,
    retryable: RETRYABLE.has(code),
    sessionId: body?.sessionId ?? null,
    options: [],
    checklist: asObject<Partial<Checklist>>(body?.knownChecklist) ?? {},
    checklistComplete: false,
    results: [],
  };
}

/** For express-rate-limit, which otherwise answers in its own shape. */
export const chatLimitHandler = (code: string) => (req: Request, res: Response) => {
  res.status(429).json(chatError(req, code));
};
