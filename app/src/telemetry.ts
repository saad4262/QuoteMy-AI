/**
 * Ships the log lines this service already writes to the observability stack. It adds no log line
 * of its own and changes none of them - `observability/` is the other half of this.
 *
 * INERT BY DEFAULT. With `TELEMETRY_URL` or `TELEMETRY_SECRET` unset - which is every test run,
 * every Postman session and any checkout that has not been told otherwise - `createTelemetry()`
 * returns null and `config.ts` builds exactly the logger it built before this file existed. There
 * is no half-on state.
 *
 * WHY IT DOES NOT IMPORT `config.ts`: config builds the logger, and the logger needs this. Reading
 * `process.env` directly is what keeps that from being a cycle. For the same reason nothing here
 * logs through `logger` - a telemetry failure reported through the pipe that is failing is a
 * failure nobody reads.
 *
 * WHY A LOST LINE IS NOT A LOST LINE: this is a SECOND destination. stdout still gets everything,
 * so a batch dropped here is still in Vercel's own log view. That is what makes it safe for this
 * to give up quickly rather than retry into a customer's response time.
 */

const SERVICE = 'quotemy-api';

/** Push without waiting for the request to end once the buffer is this deep. */
const MAX_BUFFER = 200;

/**
 * Past this the oldest lines go, rather than the buffer growing without bound.
 *
 * Only reachable when the far end is down AND this process stays alive - a long-running host with
 * a broken tunnel. Dropping the oldest is the right end to drop from: the newest lines are the
 * ones describing whatever is going wrong right now.
 */
const MAX_PENDING = 2000;

/** A telemetry pipe must never be the reason a customer waits. */
const PUSH_TIMEOUT_MS = 3000;

/** One complaint a minute at most. A broken pipe must not become a second flood of its own. */
const COMPLAIN_EVERY_MS = 60_000;

type Line = [string, string];

export interface Telemetry {
  /** A pino destination. Pino calls `write` with one finished JSON line at a time. */
  readonly stream: { write(line: string): void };
  /** Send whatever is buffered. Resolves when the attempt is over, success or not. */
  flush(): Promise<void>;
}

/**
 * Which deployment this is, for the `env` label.
 *
 * Vercel sets VERCEL_ENV to production, preview or development. Anything else is somebody's
 * machine. Three or four values, which is what a label is allowed to be - see the label rule in
 * `observability/README.md`.
 */
const deploymentEnv = (): string => process.env.VERCEL_ENV || process.env.TELEMETRY_ENV || 'local';

/**
 * Strictly increasing nanosecond timestamps.
 *
 * Loki keys entries by timestamp within a stream, and a millisecond clock hands out the same value
 * to every line written in the same tick - which, on the burst of lines one request produces, is
 * most of them. Nudging each collision forward by a nanosecond keeps them all.
 */
let lastNs = 0n;
function nowNs(): string {
  let ns = BigInt(Date.now()) * 1_000_000n;
  if (ns <= lastNs) ns = lastNs + 1n;
  lastNs = ns;
  return ns.toString();
}

/**
 * Vercel's own "do not freeze until this finishes".
 *
 * The platform freezes an instance the moment it answers, so a push started after the response is
 * killed mid-flight - `controller.ts` documents the same trap costing submissions their answer.
 * `waitUntil` is the supported way out of it, and it is read off the request context rather than
 * imported so that no dependency is added for something that is absent everywhere else.
 *
 * Null off Vercel, where nothing freezes and a promise simply runs.
 */
type WaitUntil = (promise: Promise<unknown>) => void;

function waitUntil(): WaitUntil | null {
  try {
    const ctx = (globalThis as Record<symbol, unknown>)[Symbol.for('@vercel/request-context')] as
      | { get?: () => { waitUntil?: WaitUntil } | undefined }
      | undefined;
    const fn = ctx?.get?.()?.waitUntil;
    return typeof fn === 'function' ? fn : null;
  } catch {
    return null;
  }
}

export function createTelemetry(): Telemetry | null {
  const url = (process.env.TELEMETRY_URL ?? '').trim();
  const secret = (process.env.TELEMETRY_SECRET ?? '').trim();

  // Tests must never reach outside the process, whatever a stray .env happens to carry.
  if (process.env.NODE_ENV === 'test') return null;
  if (!url || !secret) return null;

  const endpoint = url.replace(/\/+$/, '') + '/loki/api/v1/push';
  const labels = { service: SERVICE, env: deploymentEnv() };

  let pending: Line[] = [];
  let inFlight: Promise<void> | null = null;
  let dropped = 0;
  let complainedAt = 0;

  const complain = (what: string) => {
    const now = Date.now();
    if (now - complainedAt < COMPLAIN_EVERY_MS) return;
    complainedAt = now;
    // console, not logger: see the file header. stdout still has every line this failed to ship.
    console.error(`[telemetry] ${what}${dropped ? ` (${dropped} lines dropped so far)` : ''}`);
  };

  async function push(batch: Line[]): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-telemetry-key': secret },
        body: JSON.stringify({ streams: [{ stream: labels, values: batch }] }),
        signal: controller.signal,
      });
      if (!res.ok) {
        dropped += batch.length;
        complain(`push refused with ${res.status}`);
      }
    } catch (err) {
      dropped += batch.length;
      complain(`push failed: ${(err as Error)?.message ?? 'unknown'}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async function flush(): Promise<void> {
    // One push at a time. Two overlapping ones interleave badly on a slow link and buy nothing.
    if (inFlight) await inFlight.catch(() => {});
    if (!pending.length) return;

    const batch = pending;
    pending = [];
    inFlight = push(batch).finally(() => {
      inFlight = null;
    });
    await inFlight;
  }

  return {
    stream: {
      write(line: string) {
        pending.push([nowNs(), line.endsWith('\n') ? line.slice(0, -1) : line]);
        if (pending.length > MAX_PENDING) {
          const lost = pending.length - MAX_PENDING;
          pending = pending.slice(lost);
          dropped += lost;
          complain('buffer full, dropping the oldest lines');
        }
        // Long before that: push early rather than let one request build a huge batch.
        if (pending.length >= MAX_BUFFER) void flush();
      },
    },
    flush,
  };
}

/**
 * The one instance, created when `config.ts` builds the logger. Null means telemetry is off, and
 * every export below is then a no-op that costs a null check.
 */
let telemetry: Telemetry | null = null;

export function setTelemetry(instance: Telemetry | null): void {
  telemetry = instance;
}

export const telemetryEnabled = (): boolean => telemetry !== null;

/**
 * Ship what this request produced, and never make the request wait for it.
 *
 * Called from `requestLog` once the response has finished, so the request's own summary line is
 * already in the buffer. On Vercel the push is handed to `waitUntil` so the instance stays awake
 * for it; anywhere else it is simply a promise nobody is waiting on. Either way this returns
 * immediately and cannot throw.
 */
export function flushTelemetry(): void {
  if (!telemetry) return;
  try {
    const promise = telemetry.flush();
    const hold = waitUntil();
    if (hold) hold(promise);
    else void promise.catch(() => {});
  } catch {
    // Telemetry is never allowed to be the thing that breaks a request.
  }
}
