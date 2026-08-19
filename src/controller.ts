import type { Request, Response } from 'express';
import { getAiClient } from './ai.js';
import { badRequest, notFound, send, unauthorized } from './http.js';
import { runOnboarding, sanitizeText, assertSubmittable } from './pipeline.js';
import { extractionPrompt, reviewPrompt, wrapDescription } from './prompts.js';
import { extractionSchema, reviewSchema, type SubmitBody } from './schemas.js';
import { getRepository } from './store.js';
import { verifyExtraction } from './verify.js';
import { TRADES, type Trade } from './vocab.js';

/** Controllers do HTTP only: identity in, work out, response out. No business logic lives here. */

const uidOf = (req: Request): string => {
  if (!req.uid) throw unauthorized();
  return req.uid;
};

const tradeOf = (req: Request): Trade => {
  const trade = String(req.params.trade ?? '');
  if (!(TRADES as readonly string[]).includes(trade)) throw notFound(`We do not handle "${trade}" yet`);
  return trade as Trade;
};

export async function submit(req: Request, res: Response) {
  const result = await runOnboarding(uidOf(req), req.body as SubmitBody);
  send(req, res, result.data, result.meta);
}

export async function profile(req: Request, res: Response) {
  const uid = uidOf(req);
  const trade = tradeOf(req);
  const repo = getRepository();

  const pricing = await repo.getPricing(uid, trade);
  if (!pricing) throw notFound('No pricing has been submitted for this trade yet');

  const capabilities = await repo.getCapabilities(uid, trade);
  const submissions = await repo.listSubmissions(uid, trade);

  send(req, res, { pricing, capabilities, submissions }, { trade, live: pricing.status === 'confirmed' });
}

/**
 * The human confirmation step. This is the ONLY thing that makes prices live, and it exists as an
 * explicit action by the business - the pipeline never sets confirmedAt.
 */
export async function confirm(req: Request, res: Response) {
  const uid = uidOf(req);
  const trade = tradeOf(req);
  const repo = getRepository();

  const current = await repo.getPricing(uid, trade);
  if (!current) throw notFound('No pricing has been submitted for this trade yet');
  if (current.status === 'unverified') {
    throw badRequest('These prices could not be verified, so they cannot be confirmed - send an updated price list first');
  }
  if (current.status === 'confirmed') {
    return send(req, res, { pricing: current, alreadyConfirmed: true }, { trade, live: true });
  }

  const confirmed = await repo.confirm(uid, trade, new Date().toISOString());
  send(req, res, { pricing: confirmed, alreadyConfirmed: false }, { trade, live: true });
}

/** One stage at a time, for tuning a prompt. Mounted only when ENABLE_DEV_ROUTES=true. */
export async function devReview(req: Request, res: Response) {
  const { trade, text } = cleanBody(req);
  const ai = getAiClient();
  const result = await ai.callStructured({
    name: 'review',
    schema: reviewSchema,
    system: reviewPrompt(trade),
    user: wrapDescription(trade, text),
    maxOutputTokens: 4000,
  });
  send(req, res, { review: result.data }, { trade, model: ai.model, stages: [result.usage] });
}

export async function devExtract(req: Request, res: Response) {
  const { trade, text } = cleanBody(req);
  const ai = getAiClient();
  const result = await ai.callStructured({
    name: 'extraction',
    schema: extractionSchema,
    system: extractionPrompt(trade),
    user: wrapDescription(trade, text),
    maxOutputTokens: 8000,
  });
  send(req, res, { raw: result.data, verified: verifyExtraction(result.data, text, trade) }, {
    trade,
    model: ai.model,
    stages: [result.usage],
  });
}

function cleanBody(req: Request) {
  const { trade, text } = req.body as SubmitBody;
  const clean = sanitizeText(text);
  assertSubmittable(clean);
  return { trade, text: clean };
}
