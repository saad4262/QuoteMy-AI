import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

/**
 * Two response shapes exist in this API and no others. The envelope is validated on the way out, so
 * a contract break is our loud 500 rather than the frontend's silent mystery (docs/FLOW.md 4).
 */
const successEnvelope = z.object({
  ok: z.literal(true),
  requestId: z.string(),
  data: z.record(z.string(), z.unknown()),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const errorEnvelope = z.object({
  ok: z.literal(false),
  requestId: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export function sendSuccess(
  req: Request,
  res: Response,
  data: Record<string, unknown>,
  meta?: Record<string, unknown>,
  status = 200,
): void {
  const body = { ok: true as const, requestId: req.requestId, data, ...(meta ? { meta } : {}) };
  const parsed = successEnvelope.safeParse(body);

  if (!parsed.success) {
    logger.error({ requestId: req.requestId, error: z.treeifyError(parsed.error) }, 'response_contract_violation');
    res.status(500).json({
      ok: false,
      requestId: req.requestId,
      error: { code: 'response_contract_violation', message: 'The server produced a malformed response' },
    });
    return;
  }

  res.status(status).json(parsed.data);
}

export function sendError(
  req: Request,
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body = {
    ok: false as const,
    requestId: req.requestId,
    error: { code, message, ...(details !== undefined && !isProd ? { details } : {}) },
  };
  res.status(status).json(errorEnvelope.parse(body));
}
