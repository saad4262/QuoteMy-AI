import type { Request, Response } from 'express';
import { getAiClient } from './ai.js';
import { env } from './config.js';
import { badRequest, notFound, send } from './http.js';
import { assertSubmittable, runOnboarding, sanitizeText } from './pipeline.js';
import { extractionPrompt, reviewPrompt, wrapDescription } from './prompts.js';
import { extractionSchema, reviewSchema, type BusinessBody } from './schemas.js';
import { getRepository } from './store.js';
import { verifyExtraction } from './verify.js';

/**
 * One route, one handler. `action` in the body decides what happens, so the frontend calls a single
 * URL for everything the business side does.
 */
export async function business(req: Request, res: Response) {
  const body = req.body as BusinessBody;

  switch (body.action) {
    case 'submit':
      return submit(req, res, body);
    case 'profile':
      return profile(req, res, body);
    case 'confirm':
      return confirm(req, res, body);
    case 'review':
    case 'extract':
      if (!env.ENABLE_DEV_ROUTES) throw notFound(`Action "${body.action}" is not available`);
      return devStage(req, res, body);
  }
}

/** The main one: review -> extract -> verify -> store. */
async function submit(req: Request, res: Response, body: BusinessBody) {
  const result = await runOnboarding(body.businessUid, body);
  send(req, res, result.data, result.meta);
}

/** What is stored right now, plus every attempt this business has made. */
async function profile(req: Request, res: Response, body: BusinessBody) {
  const repo = getRepository();
  const pricing = await repo.getPricing(body.businessUid, body.trade);
  if (!pricing) throw notFound('Nothing has been submitted for this trade yet');

  const capabilities = await repo.getCapabilities(body.businessUid, body.trade);
  const submissions = await repo.listSubmissions(body.businessUid, body.trade);

  send(req, res, { pricing, capabilities, submissions }, { trade: body.trade, live: pricing.status === 'confirmed' });
}

/**
 * The business saying "yes, these figures are right". This is the ONLY thing that makes prices
 * live - the pipeline never sets confirmedAt.
 */
async function confirm(req: Request, res: Response, body: BusinessBody) {
  const repo = getRepository();
  const current = await repo.getPricing(body.businessUid, body.trade);

  if (!current) throw notFound('Nothing has been submitted for this trade yet');
  if (current.status === 'unverified') {
    throw badRequest('These prices could not be verified, so they cannot be confirmed - send an updated price list first');
  }
  if (current.status === 'confirmed') {
    return send(req, res, { pricing: current, alreadyConfirmed: true }, { trade: body.trade, live: true });
  }

  const confirmed = await repo.confirm(body.businessUid, body.trade, new Date().toISOString());
  send(req, res, { pricing: confirmed, alreadyConfirmed: false }, { trade: body.trade, live: true });
}

/** One stage at a time, for tuning a prompt. Nothing is stored. ENABLE_DEV_ROUTES only. */
async function devStage(req: Request, res: Response, body: BusinessBody) {
  const text = sanitizeText(body.text);
  assertSubmittable(text);

  const ai = getAiClient();
  const { trade } = body;

  if (body.action === 'review') {
    const result = await ai.callStructured({
      name: 'review',
      schema: reviewSchema,
      system: reviewPrompt(trade),
      user: wrapDescription(trade, text),
      maxOutputTokens: 4000,
    });
    return send(req, res, { review: result.data }, { trade, model: ai.model, stages: [result.usage] });
  }

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
