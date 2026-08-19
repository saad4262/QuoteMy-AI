import { Router } from 'express';
import { getAiClient } from '../ai/client.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { onboardingBodySchema } from '../validators/onboarding.validator.js';
import { reviewSchema } from '../schemas/review.js';
import { extractionSchema } from '../schemas/extraction.js';
import { extractionPrompt, reviewPrompt, wrapDescription } from '../prompts/index.js';
import { verifyExtraction } from '../validation/verify.js';
import { assertSubmittable, sanitizeText } from '../services/sanitize.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';
import type { OnboardingBody } from '../validators/onboarding.validator.js';

/**
 * Single-stage routes, mounted only when ENABLE_DEV_ROUTES=true. They exist because you cannot
 * improve a prompt you can only run end to end (docs/FLOW.md 2). Nothing is stored here.
 */
export const devRoutes = Router();

devRoutes.use(requireAuth);

devRoutes.post(
  '/review',
  validateBody(onboardingBodySchema),
  asyncHandler(async (req, res) => {
    const { trade, text: rawText } = req.body as OnboardingBody;
    const text = sanitizeText(rawText);
    assertSubmittable(text);

    const ai = await getAiClient();
    const result = await ai.callStructured({
      name: 'review',
      schema: reviewSchema,
      system: reviewPrompt(trade),
      user: wrapDescription(trade, text),
      maxOutputTokens: 4000,
    });
    sendSuccess(req, res, { review: result.data }, { trade, model: ai.model, stages: [result.usage] });
  }),
);

devRoutes.post(
  '/extract',
  validateBody(onboardingBodySchema),
  asyncHandler(async (req, res) => {
    const { trade, text: rawText } = req.body as OnboardingBody;
    const text = sanitizeText(rawText);
    assertSubmittable(text);

    const ai = await getAiClient();
    const result = await ai.callStructured({
      name: 'extraction',
      schema: extractionSchema,
      system: extractionPrompt(trade),
      user: wrapDescription(trade, text),
      maxOutputTokens: 8000,
    });
    const verified = verifyExtraction(result.data, text, trade);

    sendSuccess(
      req,
      res,
      { raw: result.data, verified },
      { trade, model: ai.model, stages: [result.usage], coverage: verified.coverage },
    );
  }),
);

devRoutes.post(
  '/sanitize',
  validateBody(onboardingBodySchema),
  asyncHandler(async (req, res) => {
    const { text } = req.body as OnboardingBody;
    const clean = sanitizeText(text);
    sendSuccess(req, res, { original: text.length, sanitized: clean.length, text: clean });
  }),
);
