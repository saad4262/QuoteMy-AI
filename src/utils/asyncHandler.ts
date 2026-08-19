import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 5 forwards rejected promises itself, but this keeps intent explicit. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
