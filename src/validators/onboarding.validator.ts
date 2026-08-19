import { z } from 'zod';
import { TRADES } from '../shared/vocab.js';

/**
 * businessUid is deliberately NOT accepted from the body - it comes from the verified ID token
 * (src/middlewares/auth.ts). Accepting it from the body is the n8n security hole.
 */
export const onboardingBodySchema = z.object({
  trade: z.enum(TRADES).default('fencing'),
  text: z.string(),
});

export const tradeParamSchema = z.object({
  trade: z.enum(TRADES),
});

export type OnboardingBody = z.infer<typeof onboardingBodySchema>;
