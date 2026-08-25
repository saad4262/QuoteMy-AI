import type { IncomingMessage, ServerResponse } from 'node:http';
import { logger } from '../src/config.js';
import { initialize } from '../src/server.js';
import { sweepOnce } from '../src/worker.js';

/**
 * The sweeper, as a scheduled request.
 *
 * WORKER_ENABLED starts a setInterval, which needs a process that stays alive - serverless has no
 * such thing, so on Vercel the schedule lives in vercel.json and calls this instead. Same sweep,
 * different clock.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when that variable is set. Without the check
 * this is a public URL that anyone can use to make the service do work.
 */
initialize();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

  try {
    const processed = await sweepOnce();
    logger.info({ processed }, 'cron sweep finished');
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ ok: true, processed }));
  } catch (err) {
    logger.error({ err }, 'cron sweep failed');
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false }));
  }
}
