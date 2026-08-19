import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { onboardingLimiter } from '../middlewares/rateLimit.js';
import { onboardingBodySchema, tradeParamSchema } from '../validators/onboarding.validator.js';
import { onboardingController } from '../controllers/onboarding.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const businessRoutes = Router();

businessRoutes.use(requireAuth);

// review -> extract -> verify -> store
businessRoutes.post(
  '/onboarding',
  onboardingLimiter,
  validateBody(onboardingBodySchema),
  asyncHandler(onboardingController.submit),
);

// what is stored right now, plus the submission history
businessRoutes.get('/profile/:trade', validateParams(tradeParamSchema), asyncHandler(onboardingController.profile));

// the human confirmation that makes prices live
businessRoutes.post(
  '/profile/:trade/confirm',
  validateParams(tradeParamSchema),
  asyncHandler(onboardingController.confirm),
);
