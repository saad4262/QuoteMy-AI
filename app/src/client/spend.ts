import { env, logger } from '../config.js';
import { AppError } from '../http.js';
import { getRepository, type BusinessRepository } from '../store.js';

/**
 * What the customer chat has spent today, and the ceiling it stops at.
 *
 * Rate limits answer "how fast can one caller go". This answers "how much can this cost us",
 * which is a different question and the only one that holds up against a flood spread across
 * many addresses and many session ids, where no single caller looks unreasonable.
 *
 * The counter is SHARED, in `chatSpend/{day}`. It used to be in-process, which is not a ceiling at
 * all on a platform that runs many instances: every cold start began at zero, so the real limit was
 * $25 multiplied by however many happened to be alive. That was survivable while one chat existed;
 * a second entry point doubles the traffic against it.
 *
 * Still approximate, deliberately. The shared total is re-read at most every 30 seconds, and this
 * instance's own unreported spend is added on top in the meantime, so the ceiling can be overshot
 * by a few turns' worth. Reading it on every turn would put a Firestore round trip in front of
 * every message to save a few dollars in the worst case, which is the wrong trade.
 */

const REFRESH_MS = 30_000;

let day = today();
/** Everyone's spend, as of `checkedAt`. */
let shared = 0;
/** What this instance has recorded since that read - not yet reflected in `shared`. */
let local = 0;
let checkedAt = 0;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function roll(): void {
  const now = today();
  if (now !== day) {
    day = now;
    shared = 0;
    local = 0;
    checkedAt = 0;
  }
}

const spentToday = () => shared + local;

/** Called before the model, so a day already over budget costs nothing more. */
export async function assertWithinDailyBudget(repo: BusinessRepository = getRepository()): Promise<void> {
  roll();

  if (Date.now() - checkedAt >= REFRESH_MS) {
    try {
      shared = await repo.readChatSpend(day);
      // Everything this instance recorded is in that number now.
      local = 0;
      checkedAt = Date.now();
    } catch (err) {
      // A counter we cannot read is not a reason to refuse a conversation. What this instance has
      // spent is still known, so the old per-process ceiling still applies until the read recovers.
      logger.warn({ err }, 'could not read the shared chat spend; falling back to this instance only');
    }
  }

  if (spentToday() < env.MAX_CHAT_SPEND_PER_DAY_USD) return;

  logger.error({ spentToday: spentToday(), ceiling: env.MAX_CHAT_SPEND_PER_DAY_USD }, 'customer chat hit its daily spend ceiling');
  throw new AppError(503, 'We are at capacity right now — please try again a little later', 'at_capacity');
}

/** Called after, with what the turn actually cost. */
export async function recordSpend(usd: number, repo: BusinessRepository = getRepository()): Promise<void> {
  roll();
  if (!Number.isFinite(usd) || usd <= 0) return;

  const before = spentToday();
  local = Number((local + usd).toFixed(6));

  // One line when a day crosses its halfway mark, so the ceiling is never the first anyone hears
  // of unusual traffic.
  const half = env.MAX_CHAT_SPEND_PER_DAY_USD / 2;
  if (spentToday() >= half && before < half) {
    logger.warn({ spentToday: spentToday(), ceiling: env.MAX_CHAT_SPEND_PER_DAY_USD }, 'customer chat past half its daily budget');
  }

  try {
    await repo.addChatSpend(day, usd);
  } catch (err) {
    // The local counter still holds it, so this instance stays honest even while the shared one
    // is unreachable. Losing the write means only that other instances cannot see this turn.
    logger.warn({ err, usd }, 'could not record chat spend against the shared counter');
  }
}

/** For /health, and for tests. Reports the last known shared total plus this instance's own. */
export const chatSpendToday = () => ({ day, spentUsd: spentToday(), ceilingUsd: env.MAX_CHAT_SPEND_PER_DAY_USD });

/** Tests only. */
export const resetChatSpend = () => {
  shared = 0;
  local = 0;
  checkedAt = 0;
  day = today();
};
