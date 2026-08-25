import { env, logger } from '../config.js';
import { AppError } from '../http.js';

/**
 * What the customer chat has spent today, and the ceiling it stops at.
 *
 * Rate limits answer "how fast can one caller go". This answers "how much can this cost us",
 * which is a different question and the only one that holds up against a flood spread across
 * many addresses and many session ids, where no single caller looks unreasonable.
 *
 * In memory, so it resets on deploy and each instance counts its own. That is deliberate for now:
 * a shared counter needs Redis, and an approximate ceiling enforced everywhere beats an exact one
 * that does not exist yet. Worth revisiting when this runs on more than a couple of instances.
 */

let spentToday = 0;
let day = today();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function roll(): void {
  const now = today();
  if (now !== day) {
    day = now;
    spentToday = 0;
  }
}

/** Called before the model, so a day already over budget costs nothing more. */
export function assertWithinDailyBudget(): void {
  roll();
  if (spentToday < env.MAX_CHAT_SPEND_PER_DAY_USD) return;

  logger.error({ spentToday, ceiling: env.MAX_CHAT_SPEND_PER_DAY_USD }, 'customer chat hit its daily spend ceiling');
  throw new AppError(
    503,
    'We are at capacity right now — please try again a little later',
    'at_capacity',
  );
}

/** Called after, with what the turn actually cost. */
export function recordSpend(usd: number): void {
  roll();
  if (!Number.isFinite(usd) || usd <= 0) return;
  spentToday = Number((spentToday + usd).toFixed(6));

  // One line when a day crosses its halfway mark, so the ceiling is never the first anyone hears
  // of unusual traffic.
  const half = env.MAX_CHAT_SPEND_PER_DAY_USD / 2;
  if (spentToday >= half && spentToday - usd < half) {
    logger.warn({ spentToday, ceiling: env.MAX_CHAT_SPEND_PER_DAY_USD }, 'customer chat past half its daily budget');
  }
}

/** For /health, and for tests. */
export const chatSpendToday = () => ({ day, spentUsd: spentToday, ceilingUsd: env.MAX_CHAT_SPEND_PER_DAY_USD });

/** Tests only. */
export const resetChatSpend = () => {
  spentToday = 0;
  day = today();
};
