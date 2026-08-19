import type { Request, Response } from 'express';
import { onboardingService } from '../services/onboarding.service.js';
import { getRepository } from '../models/index.js';
import type { OnboardingBody } from '../validators/onboarding.validator.js';
import type { Trade } from '../shared/vocab.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/respond.js';

/** Controllers do HTTP only: identity in, service call, envelope out. No business logic. */
export const onboardingController = {
  async submit(req: Request, res: Response) {
    const uid = requireUid(req);
    const body = req.body as OnboardingBody;
    const result = await onboardingService.run(uid, body);
    sendSuccess(req, res, result.data, { ...result.meta });
  },

  async profile(req: Request, res: Response) {
    const uid = requireUid(req);
    const trade = req.params.trade as Trade;
    const repo = getRepository();

    const [pricing, capabilities, submissions] = await Promise.all([
      repo.getPricing(uid, trade),
      repo.getCapabilities(uid, trade),
      repo.listSubmissions(uid, trade),
    ]);

    if (!pricing) throw AppError.notFound('No pricing has been submitted for this trade yet');

    sendSuccess(
      req,
      res,
      { pricing, capabilities, submissions },
      { trade, store: repo.kind, live: pricing.status === 'confirmed' },
    );
  },

  /**
   * The human confirmation step. This is the ONLY thing that makes prices live, and it exists as an
   * explicit action by the business - the pipeline never sets confirmedAt (CONTEXT.md 7.3).
   */
  async confirm(req: Request, res: Response) {
    const uid = requireUid(req);
    const trade = req.params.trade as Trade;
    const repo = getRepository();

    const current = await repo.getPricing(uid, trade);
    if (!current) throw AppError.notFound('No pricing has been submitted for this trade yet');
    if (current.status === 'unverified') {
      throw AppError.badRequest('These prices could not be verified, so they cannot be confirmed - send an updated price list first');
    }
    if (current.status === 'confirmed') {
      return sendSuccess(req, res, { pricing: current, alreadyConfirmed: true }, { trade });
    }

    const confirmed = await repo.confirm(uid, trade, new Date().toISOString());
    sendSuccess(req, res, { pricing: confirmed, alreadyConfirmed: false }, { trade, live: true });
  },
};

function requireUid(req: Request): string {
  if (!req.uid) throw AppError.unauthorized();
  return req.uid;
}
