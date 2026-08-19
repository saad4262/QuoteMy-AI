import { randomUUID } from 'node:crypto';
import { getAiClient } from '../ai/client.js';
import type { AiClient, StageUsage } from '../ai/types.js';
import { env } from '../config/env.js';
import { extractionPrompt, reviewPrompt, wrapDescription } from '../prompts/index.js';
import { extractionSchema } from '../schemas/extraction.js';
import { reviewSchema } from '../schemas/review.js';
import { buildApprovalReport } from '../report/approval.js';
import { buildRejectionReport } from '../report/rejection.js';
import { getRepository, SCHEMA_VERSION, type BusinessRepository } from '../models/index.js';
import type { Trade } from '../shared/vocab.js';
import { verifyExtraction } from '../validation/verify.js';
import { AppError } from '../utils/AppError.js';
import { assertSubmittable, sanitizeText } from './sanitize.js';

export interface OnboardingInput {
  trade: Trade;
  text: string;
}

export interface OnboardingMeta {
  trade: Trade;
  model: string;
  store: string;
  schemaVersion: number;
  stages: StageUsage[];
  costUsd: number;
  coverage?: Record<string, number>;
}

export interface OnboardingOutput {
  data: Record<string, unknown>;
  meta: OnboardingMeta;
}

export interface OnboardingDeps {
  ai?: AiClient;
  repo?: BusinessRepository;
}

/**
 * The pipeline. Every step's successor is known before it runs, so this is a pipeline and not an
 * agent - there is no tool for the model to skip and no branch for it to choose (docs/PLAN.md 3).
 *
 *   sanitise -> mechanical gate -> review -> [reject]  or  extract -> verify -> store -> report
 */
export const onboardingService = {
  async run(uid: string, input: OnboardingInput, deps: OnboardingDeps = {}): Promise<OnboardingOutput> {
    const ai = deps.ai ?? (await getAiClient());
    const repo = deps.repo ?? getRepository();
    const stages: StageUsage[] = [];

    const text = sanitizeText(input.text);
    assertSubmittable(text);

    const spend = () => Number(stages.reduce((sum, s) => sum + s.costUsd, 0).toFixed(6));
    const guardCost = () => {
      if (spend() > env.MAX_COST_PER_REQUEST_USD) {
        throw new AppError(429, 'This submission exceeded its processing budget', 'cost_limit');
      }
    };
    const meta = (): OnboardingMeta => ({
      trade: input.trade,
      model: ai.model,
      store: repo.kind,
      schemaVersion: SCHEMA_VERSION,
      stages,
      costUsd: spend(),
    });

    // --- stage 1: review -------------------------------------------------------------------
    const review = await ai.callStructured({
      name: 'review',
      schema: reviewSchema,
      system: reviewPrompt(input.trade),
      user: wrapDescription(input.trade, text),
      maxOutputTokens: 4000,
    });
    stages.push(review.usage);
    guardCost();

    if (!review.data.approved) {
      const report = buildRejectionReport(review.data);
      await repo.addSubmission({
        id: randomUUID(),
        uid,
        trade: input.trade,
        approved: false,
        status: 'unverified',
        ratesSaved: 0,
        createdAt: new Date().toISOString(),
      });
      // Nothing is written to the profile on the reject path - an incomplete price list must not
      // overwrite figures the business already had approved.
      return { data: { approved: false, status: 'unverified', ...report }, meta: meta() };
    }

    // --- stage 2: extract ------------------------------------------------------------------
    const extraction = await ai.callStructured({
      name: 'extraction',
      schema: extractionSchema,
      system: extractionPrompt(input.trade),
      user: wrapDescription(input.trade, text),
      maxOutputTokens: 8000,
    });
    stages.push(extraction.usage);
    guardCost();

    // --- stage 3: verify (no model involved) -----------------------------------------------
    const verified = verifyExtraction(extraction.data, text, input.trade);

    // --- stage 4: store --------------------------------------------------------------------
    const now = new Date().toISOString();
    await repo.savePricing(uid, {
      ...verified.pricing,
      trade: input.trade,
      status: verified.status,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: now,
      // Re-submitting always clears any previous confirmation: the business confirms the NEW
      // figures, never inherits approval of the old ones (CONTEXT.md 7.3).
      confirmedAt: null,
    });
    await repo.saveCapabilities(uid, {
      ...verified.capabilities,
      trade: input.trade,
      unmapped: verified.unmapped,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: now,
    });
    await repo.addSubmission({
      id: randomUUID(),
      uid,
      trade: input.trade,
      approved: true,
      status: verified.status,
      ratesSaved: verified.ratesKept,
      createdAt: now,
    });

    // --- stage 5: report -------------------------------------------------------------------
    const report = buildApprovalReport(verified, review.data.opening);

    return {
      data: {
        approved: true,
        status: verified.status,
        ...report,
        pricing: verified.pricing,
        capabilities: verified.capabilities,
        couldNotUnderstand: verified.unmapped,
        ratesSaved: verified.ratesKept,
      },
      meta: { ...meta(), coverage: verified.coverage },
    };
  },
};
