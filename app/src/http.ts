import type { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { MulterError } from 'multer';
import { randomUUID } from 'node:crypto';
import { z, type ZodType } from 'zod';
import { isProd, logger } from './config.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
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
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  message: { ok: false, error: { code: 'rate_limited', message: 'Too many submissions, try later' } },
});

/** multer rejects oversized or too-many uploads before we see them; say so in our own words. */
function fromMulter(err: unknown): AppError | null {
  if (!(err instanceof MulterError)) return null;
  const message =
    err.code === 'LIMIT_FILE_SIZE'
      ? 'That file is too large - keep each one under 20 MB'
      : err.code === 'LIMIT_FILE_COUNT'
        ? 'Send up to 6 files at a time'
        : 'We could not read that upload - try attaching it again';
  return new AppError(413, message, 'payload_too_large');
}

export function errorHandler(rawErr: unknown, req: Request, res: Response, _next: NextFunction): void {
  const err = fromMulter(rawErr) ?? rawErr;
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
