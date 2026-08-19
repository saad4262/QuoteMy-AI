import { randomUUID } from 'node:crypto';
import { getAiClient, type AiClient, type StageUsage } from './ai.js';
import { env } from './config.js';
import { AppError, unprocessable } from './http.js';
import { assertSomethingArrived, readSource, stripProvenance, type UploadedFile } from './ingest.js';
import { extractionPrompt, reviewPrompt, wrapDescription } from './prompts.js';
import { extractionSchema, reviewSchema, type BusinessBody } from './schemas.js';
import { LABELS, MESSAGES } from './messages.js';
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
 *   ingest -> sanitise -> mechanical gate -> review -> [reject]  or  extract -> verify -> store
 */
export async function runOnboarding(
  uid: string,
  input: BusinessBody,
  files: UploadedFile[] = [],
  deps: { ai?: AiClient; repo?: BusinessRepository } = {},
) {
  const ai = deps.ai ?? getAiClient();
  const repo = deps.repo ?? getRepository();
  const stages: StageUsage[] = [];

  // --- stage 0: ingest --------------------------------------------------------------------
  // Typed text and attached files become one transcript. From here on there is a single code
  // path, and quote verification is unchanged: this transcript IS "what the business wrote".
  const source = await readSource(input.text, files, { ai });
  if (source.usage) stages.push(source.usage);
  assertSomethingArrived(source);

  const text = sanitizeText(source.text);
  assertSubmittable(stripProvenance(text));

  const submissionId = randomUUID();
  const spend = () => Number(stages.reduce((sum, s) => sum + s.costUsd, 0).toFixed(6));

  // `meta` is request telemetry - how the answer was produced, not part of the answer.
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
      id: submissionId,
      uid,
      trade: input.trade,
      approved: false,
      status: 'unverified',
      ratesSaved: 0,
      createdAt: now(),
    });

    const fixes = review.data.fixes;

    // Nothing is written to the profile on the reject path - an incomplete price list must not
    // overwrite figures the business already had approved.
    return {
      data: {
        approved: false,
        status: 'unverified',
        // Two audiences, two blocks. `business` is what the tradesperson's screen renders;
        // `admin` never reaches them - the full written report is an internal artifact.
        business: {
          opening: MESSAGES.rejected.opening,
          fixes,
          source: { documents: source.documents },
          nextStep: MESSAGES.rejected.nextStep,
        },
        admin: {
          submissionId,
          decision: 'rejected',
          fixCounts: {
            missing: fixes.filter((f) => f.kind === 'missing').length,
            unclear: fixes.filter((f) => f.kind === 'unclear').length,
          },
          sourceText: text,
          textChars: text.length,
        },
      },
      meta: meta(),
    };
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
  // Matched against the transcript with the [filename] headers removed, so a header can never
  // stand in for a source quote.
  const verified = verifyExtraction(extraction.data, stripProvenance(text), input.trade);

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
    id: submissionId,
    uid,
    trade: input.trade,
    approved: true,
    status: verified.status,
    ratesSaved: verified.ratesKept,
    createdAt: at,
  });

  // --- stage 5: answer ------------------------------------------------------------------------
  const message = verified.status === 'verified' ? MESSAGES.approved : MESSAGES.nothingUsable;

  return {
    data: {
      approved: true,
      status: verified.status,
      business: {
        opening: message.opening,
        // Their own fields, structured. The screen already shows these - it does not need a
        // markdown table repeating them back.
        pricing: verified.pricing,
        capabilities: verified.capabilities,
        ratesSaved: verified.ratesKept,
        // Anything we could not keep, in plain English. They do need to know this.
        notUsed: verified.unmapped,
        // Slug -> human label, so the screen shows "Treated pine" and never keeps its own copy
        // of a list that would drift from vocab.ts.
        labels: LABELS,
        // What we read, and how. `readBy: "model"` means a figure was read off a document rather
        // than taken from the bytes - worth the business glancing at.
        source: { documents: source.documents },
        nextStep: message.nextStep,
      },
      admin: {
        submissionId,
        decision: 'approved',
        coverage: verified.coverage,
        // The transcript everything was checked against - the artifact to look at when a figure
        // comes out wrong.
        sourceText: text,
        textChars: text.length,
      },
    },
    meta: meta(),
  };
}
