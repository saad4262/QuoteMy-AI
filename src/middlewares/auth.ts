import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

declare global {
  namespace Express {
    interface Request {
      uid?: string;
    }
  }
}

/**
 * The whole reason this service exists (docs/PLAN.md, "the security hole"): the caller's identity
 * comes from a verified Firebase ID token, never from the body.
 *
 * Firebase itself is not connected yet. With REQUIRE_AUTH=false - local and Postman only - an
 * x-debug-uid header stands in for a verified token, so the pipeline can be exercised end to end.
 * With REQUIRE_AUTH=true nothing gets through without a real token, and that header is ignored.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!env.REQUIRE_AUTH) {
      const debugUid = req.header('x-debug-uid');
      if (debugUid) {
        req.uid = debugUid.trim();
        return next();
      }
    }

    if (!token) throw AppError.unauthorized('Bearer token required');

    if (!env.FIREBASE_PROJECT_ID) {
      throw new AppError(500, 'Auth is required but Firebase is not configured', 'internal_error');
    }

    const { auth } = await import('../config/firebase.js');
    const decoded = await auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    next(err instanceof AppError ? err : AppError.unauthorized('Token verification failed'));
  }
}
