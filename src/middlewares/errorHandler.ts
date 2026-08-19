import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/respond.js';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound('Route not found'));
}

// Four args: Express only treats this as an error handler with the signature intact.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const known = err instanceof AppError;
  const status = known ? err.status : 500;

  if (!known || status >= 500) logger.error({ err, path: req.path, requestId: req.requestId }, 'request failed');
  else logger.warn({ code: err.code, path: req.path, requestId: req.requestId }, err.message);

  sendError(
    req,
    res,
    status,
    known ? err.code : 'internal_error',
    known || !isProd ? (err as Error).message : 'Something went wrong',
    known ? err.details : undefined,
  );
}
