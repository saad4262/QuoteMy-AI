import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/** Onboarding runs two model calls per request — this is a cost ceiling as much as abuse control. */
export const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Per business once authenticated; ipKeyGenerator normalises IPv6 for the anonymous case.
  keyGenerator: (req) => req.uid ?? ipKeyGenerator(req.ip ?? ''),
  message: { ok: false, error: { code: 'rate_limited', message: 'Too many submissions, try later' } },
});
