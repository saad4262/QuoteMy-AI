import { randomUUID } from 'node:crypto';
import { getAiClient, type AiClient, type StageUsage } from './ai.js';
import { env } from './config.js';
import { AppError, unprocessable } from './http.js';
import { extractionPrompt, reviewPrompt, wrapDescription } from './prompts.js';
import { extractionSchema, reviewSchema, type BusinessBody } from './schemas.js';
import { buildApprovalReport, buildRejectionReport } from './report.js';
import { getRepository, SCHEMA_VERSION, type BusinessRepository } from './store.js';
import { verifyExtraction } from './verify.js';

const FENCE = /<<<\s*(?:END\s*)?DESCRIPTION\s*>>>/gi;
// Control characters, zero-width joiners and bidi overrides: a classic way to hide instructions
// from a human reviewer while the model still reads them.
const INVISIBLE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]',
  'g',
);

export function sanitizeText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(FENCE, '') // it must not be able to close the fence and speak as the system
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Mechanical facts, checked before a single token is paid for. Judgement - wrong trade, no prices,
 * off-topic - stays in the review prompt, where it belongs.
 */
export function assertSubmittable(text: string): void {
  if (text.length > env.MAX_TEXT_CHARS) {
    throw new AppError(413, `Your description is too long - keep it under ${env.MAX_TEXT_CHARS} characters`, 'payload_too_large');
  }
  if (!text) throw unprocessable('Send your pricing details and we will take a look');
  if (text.length < env.MIN_TEXT_CHARS) {
    throw unprocessable('That is too short to be a price list - send your rates and we will take a look');
  }
  if (!/\d/.test(text)) {
    throw unprocessable('We could not find any prices in that - send your rates with the numbers included');
  }
}

/**
 * The pipeline. Every step's successor is known before it runs, so this is a pipeline and not an
 * agent - there is no tool for the model to skip and no branch for it to choose.
 *
 *   sanitise -> mechanical gate -> review -> [reject]  or  extract -> verify -> store -> report
 */
export async function runOnboarding(
  uid: string,
  input: BusinessBody,
  deps: { ai?: AiClient; repo?: BusinessRepository } = {},
) {
  const ai = deps.ai ?? getAiClient();
  const repo = deps.repo ?? getRepository();
  const stages: StageUsage[] = [];

  const text = sanitizeText(input.text);
  assertSubmittable(text);

  const spend = () => Number(stages.reduce((sum, s) => sum + s.costUsd, 0).toFixed(6));
  const meta = () => ({
    trade: input.trade,
    model: ai.model,
    store: repo.kind,
    schemaVersion: SCHEMA_VERSION,
    stages,
    costUsd: spend(),
  });
  const guardCost = () => {
    if (spend() > env.MAX_COST_PER_REQUEST_USD) {
      throw new AppError(429, 'This submission exceeded its processing budget', 'cost_limit');
    }
  };

  // --- stage 1: review ---------------------------------------------------------------------
  const review = await ai.callStructured({
    name: 'review',
    schema: reviewSchema,
    system: reviewPrompt(input.trade),
    user: wrapDescription(input.trade, text),
    maxOutputTokens: 4000,
  });
  stages.push(review.usage);
  guardCost();

  const now = () => new Date().toISOString();

  if (!review.data.approved) {
    await repo.addSubmission({
      id: randomUUID(),
      uid,
      trade: input.trade,
      approved: false,
      status: 'unverified',
      ratesSaved: 0,
      createdAt: now(),
    });
    // Nothing is written to the profile on the reject path - an incomplete price list must not
    // overwrite figures the business already had approved.
    return { data: { approved: false, status: 'unverified', ...buildRejectionReport(review.data) }, meta: meta() };
  }

  // --- stage 2: extract --------------------------------------------------------------------
  const extraction = await ai.callStructured({
    name: 'extraction',
    schema: extractionSchema,
    system: extractionPrompt(input.trade),
    user: wrapDescription(input.trade, text),
    maxOutputTokens: 8000,
  });
  stages.push(extraction.usage);
  guardCost();

  // --- stage 3: verify (no model involved) -------------------------------------------------
  const verified = verifyExtraction(extraction.data, text, input.trade);

  // --- stage 4: store ----------------------------------------------------------------------
  const at = now();
  await repo.savePricing(uid, {
    ...verified.pricing,
    trade: input.trade,
    status: verified.status,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: at,
    // Re-submitting always clears a previous confirmation: the business confirms the NEW figures.
    confirmedAt: null,
  });
  await repo.saveCapabilities(uid, {
    ...verified.capabilities,
    trade: input.trade,
    unmapped: verified.unmapped,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: at,
  });
  await repo.addSubmission({
    id: randomUUID(),
    uid,
    trade: input.trade,
    approved: true,
    status: verified.status,
    ratesSaved: verified.ratesKept,
    createdAt: at,
  });

  // --- stage 5: report ---------------------------------------------------------------------
  return {
    data: {
      approved: true,
      status: verified.status,
      ...buildApprovalReport(verified, review.data.opening),
      pricing: verified.pricing,
      capabilities: verified.capabilities,
      couldNotUnderstand: verified.unmapped,
      ratesSaved: verified.ratesKept,
    },
    meta: { ...meta(), coverage: verified.coverage },
  };
}
