import { env, logger } from './config.js';
import { AppError } from './http.js';
import { filesFromStorage } from './ingest.js';
import { MESSAGES } from './messages.js';
import { runOnboarding } from './pipeline.js';
import { getRepository, type ReviewDoc } from './store.js';
import type { Trade } from './vocab.js';

/**
 * Reading a submission the frontend has already saved, and writing the answer back.
 *
 * Nothing here waits on an HTTP request: the frontend saved to Firestore, nudged us, and is
 * listening to `description/lastaireview`. If the nudge never arrives the sweeper finds the same
 * submission on its next tick, which is the point of keeping the work state in Firestore.
 */

const GIVE_UP = MESSAGES.failed;

export async function processSubmission(uid: string, trade: Trade): Promise<void> {
  const repo = getRepository();
  const claimed = await repo.claimSubmission(uid, trade, env.WORKER_STALE_MS, env.WORKER_MAX_ATTEMPTS);
  if (!claimed) return; // already answered, or another runner has it

  const attempts = claimed.aiAttempts ?? 1;
  const lastAttempt = attempts >= env.WORKER_MAX_ATTEMPTS;

  try {
    // The previous review, if the business has been here before. It is context for the wording,
    // never a substitute for judging what is in front of us - see prompts/review.system.md.
    const previous = await repo.getLastReview(uid, trade);
    const previousReview =
      previous && previous.submissionId !== claimed.submissionId ? previous : null;

    const files = await filesFromStorage(claimed.files ?? []);
    const result = await runOnboarding(
      uid,
      { action: 'submit', businessUid: uid, trade, text: claimed.text ?? '' },
      files,
      { submissionId: claimed.submissionId, previousReview },
    );

    await repo.saveReview(uid, trade, reviewFromResult(claimed.submissionId, result));
    await repo.completeSubmission(uid, trade, result.data.approved ? 'accepted' : 'rejected');
  } catch (err) {
    // Their problem, not ours: an unreadable file or text over the limit is something the business
    // can act on, so it gets a real answer and the submission is finished, not retried.
    if (isClientFault(err)) {
      const message = err instanceof AppError ? err.message : GIVE_UP.opening;
      await repo.saveReview(uid, trade, {
        displayState: 'ready',
        submissionId: claimed.submissionId,
        decision: 'not_a_price_list',
        approved: false,
        status: 'unverified',
        opening: message,
        nextStep: GIVE_UP.nextStep,
        fixes: [],
        notUsed: [],
        error: message,
      });
      await repo.completeSubmission(uid, trade, 'rejected');
      return;
    }

    logger.error({ err, uid, trade, submissionId: claimed.submissionId, attempts }, 'submission failed');

    if (lastAttempt) {
      await repo.saveReview(uid, trade, failedReview(claimed.submissionId));
      await repo.completeSubmission(uid, trade, 'failed');
      return;
    }

    // Hand it straight back so the next tick retries in minutes. Leaving it in `processing` would
    // make every retry wait out the stale window instead - half an hour of an empty panel.
    await repo.requeueSubmission(uid, trade);
  }
}

function failedReview(submissionId: string): ReviewDoc {
  return {
    displayState: 'ready',
    submissionId,
    decision: 'failed',
    approved: false,
    status: 'unverified',
    opening: GIVE_UP.opening,
    nextStep: GIVE_UP.nextStep,
    fixes: [],
    notUsed: [],
    error: GIVE_UP.opening,
  };
}

function isClientFault(err: unknown): boolean {
  if (!(err instanceof AppError)) return false;
  return err.status === 413 || err.status === 415 || err.status === 422 || err.code === 'cost_limit';
}

/** The API's `data` object, flattened into the document the frontend listens to. */
function reviewFromResult(
  submissionId: string,
  result: Awaited<ReturnType<typeof runOnboarding>>,
): ReviewDoc {
  const { data, meta } = result;
  const business = data.business as Record<string, unknown>;
  const admin = data.admin as Record<string, unknown>;

  return {
    displayState: 'ready',
    submissionId,
    decision: (admin.decision as ReviewDoc['decision']) ?? 'failed',
    approved: data.approved as boolean,
    status: data.status as ReviewDoc['status'],
    business,
    admin: { ...admin, submissionId },
    model: meta.model,
    costUsd: meta.costUsd,
    error: null,
  };
}

/**
 * A missing Firestore index is a setup step, not a crash, and it repeats every tick until someone
 * does it. Forty lines of grpc stack every two minutes buries everything else in the log and reads
 * like the service is broken when it is running perfectly well - so it gets one line, with the
 * thing to actually do, and then goes quiet.
 */
let indexWarningShown = false;

function reportTickFailure(err: unknown): void {
  const e = err as { code?: number; message?: string };
  const missingIndex = e?.code === 9 && /index/i.test(e.message ?? '');

  if (!missingIndex) {
    logger.error({ err }, 'worker tick failed');
    return;
  }

  if (indexWarningShown) return; // said once; saying it 720 times a day helps nobody
  indexWarningShown = true;

  const link = /https:\/\/\S+/.exec(e.message ?? '')?.[0];
  logger.warn(
    { create: link },
    'Sweeper is off: Firestore needs a collection-group index on description.status. ' +
      'Open the link above, or run: firebase deploy --only firestore:indexes. ' +
      'Everything else keeps working - only the retry safety net is down.',
  );
}

/**
 * The sweeper. Its whole job is that a submission is never lost because one HTTP call failed, or
 * because this process died halfway through a review.
 */
export function startWorker(): void {
  logger.info(
    { intervalMs: env.WORKER_INTERVAL_MS, staleMs: env.WORKER_STALE_MS, maxAttempts: env.WORKER_MAX_ATTEMPTS },
    'worker started',
  );

  let running = false;

  const tick = async () => {
    if (running) return; // a slow batch must not overlap the next tick
    running = true;
    try {
      const pending = await getRepository().findPending(env.WORKER_BATCH, env.WORKER_STALE_MS);
      for (const item of pending) {
        await processSubmission(item.uid, item.trade);
      }
    } catch (err) {
      reportTickFailure(err);
    } finally {
      running = false;
    }
  };

  void tick();
  setInterval(() => void tick(), env.WORKER_INTERVAL_MS);
}
