import type { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { z, type ZodType } from 'zod';
import { env, isProd, logger } from './config.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      uid?: string;
    }
  }
}

/** Every failure in this API is one of these. The code is what the frontend switches on. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (m: string, d?: unknown) => new AppError(400, m, 'bad_request', d);
export const unauthorized = (m = 'Bearer token required') => new AppError(401, m, 'unauthorized');
export const notFound = (m = 'Not found') => new AppError(404, m, 'not_found');
export const unprocessable = (m: string) => new AppError(422, m, 'unprocessable');

/**
 * Two response shapes exist in this API and no others. Every response is built here, which is what
 * actually makes the shape identical every time - one builder, not a validator after the fact.
 */
export function send(req: Request, res: Response, data: unknown, meta?: unknown, status = 200): void {
  res.status(status).json({ ok: true, requestId: req.requestId, data, ...(meta ? { meta } : {}) });
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  req.requestId = req.header('x-request-id') ?? randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}

/** One log line per finished request, with the id that is also in the response. */
export function requestLog(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    const line = { requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - started };
    if (res.statusCode >= 500) logger.error(line, 'request');
    else logger.info(line, 'request');
  });
  next();
}

/**
 * Identity comes from a verified token, never from the request body - that was the n8n hole where
 * anyone with the URL could overwrite a stranger's prices.
 *
 * Firebase is not connected yet, so REQUIRE_AUTH=false plus an x-debug-uid header is how local and
 * Postman testing signs in. With REQUIRE_AUTH=true nothing gets through until Firebase is wired up.
 */
export function auth(req: Request, _res: Response, next: NextFunction): void {
  if (!env.REQUIRE_AUTH) {
    const debugUid = req.header('x-debug-uid')?.trim();
    if (debugUid) {
      req.uid = debugUid;
      return next();
    }
    return next(unauthorized('Send an x-debug-uid header (REQUIRE_AUTH is off)'));
  }
  next(new AppError(501, 'Firebase auth is not connected yet', 'not_implemented'));
}

export const validateBody =
  <T>(schema: ZodType<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(badRequest('Invalid request body', z.treeifyError(result.error)));
    req.body = result.data;
    next();
  };

/** Two model calls per submission - this is a cost ceiling as much as abuse control. */
export const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.uid ?? ipKeyGenerator(req.ip ?? ''),
  message: { ok: false, error: { code: 'rate_limited', message: 'Too many submissions, try later' } },
});

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const known = err instanceof AppError;
  const status = known ? err.status : 500;

  if (!known || status >= 500) logger.error({ err, requestId: req.requestId }, 'request failed');

  res.status(status).json({
    ok: false,
    requestId: req.requestId,
    error: {
      code: known ? err.code : 'internal_error',
      message: known || !isProd ? (err as Error).message : 'Something went wrong',
      ...(known && err.details && !isProd ? { details: err.details } : {}),
    },
  });
}
