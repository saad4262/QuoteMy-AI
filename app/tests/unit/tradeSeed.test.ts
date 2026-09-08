import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TRADES } from '../../src/vocab.js';

/**
 * The seed that publishes `schema/{trade}` has to have LANDED before anything asks which trades
 * are published.
 *
 * This was a real outage and an invisible one. The seed was fire-and-forget from `initialize()`,
 * which is correct on a long-running server and wrong on a serverless one: the instance is frozen
 * the moment the response is sent, so a write nobody is waiting on never commits. `schema/tiling`
 * was therefore missing in production, `listPublishedTrades` returned fencing alone, and every
 * tiling customer - including one who had explicitly asked for tiling, and one whose frontend had
 * sent `trade: "tiling"` - was routed into fencing and told "I only do fencing quotes here".
 *
 * Nothing errored anywhere. The routing code was right, the frontend was right, and one missing
 * document made a whole trade unreachable, which is why this is worth a test of its own.
 */

const transactions: string[] = [];
const reads: string[] = [];
/** Resolved by the test when it wants the seed's write to be allowed to finish. */
let letWritesFinish: () => void;
let writesFinished: Promise<void>;

vi.mock('../../src/firebase.js', () => ({
  db: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        path: `${name}/${id}`,
        async get() {
          reads.push(`${name}/${id}`);
          // Only what the seed has already written exists - exactly Firestore's own behaviour.
          return { exists: transactions.includes(`${name}/${id}`), data: () => ({}), get: () => undefined };
        },
      }),
    }),
    async runTransaction(fn: (tx: unknown) => Promise<void>) {
      await writesFinished; // held open, so a reader that does not wait reads an empty collection
      await fn({
        get: async (ref: { path: string }) => ({ exists: false, get: () => undefined, data: () => ({}) }),
        set: (ref: { path: string }) => transactions.push(ref.path),
      });
    },
  }),
}));

beforeEach(() => {
  transactions.length = 0;
  reads.length = 0;
  writesFinished = new Promise<void>((resolve) => {
    letWritesFinish = resolve;
  });
  vi.resetModules();
});

describe('publishing every trade before anybody reads the list', () => {
  it('waits for the seed rather than reading an empty collection', async () => {
    const { FirestoreRepository } = await import('../../src/firestore.store.js');
    const repo = new FirestoreRepository();

    // How a serverless cold start actually goes: the seed is started, nothing awaits it, and a
    // request arrives while it is still in flight.
    void repo.seedTradeSchemas();
    const pending = repo.listPublishedTrades();

    expect(reads).toEqual([]); // must not have read anything yet - this is the whole fix

    letWritesFinish();
    expect(await pending).toEqual([...TRADES]);
    // Every trade, not just the one that happened to exist already.
    for (const trade of TRADES) expect(transactions).toContain(`schema/${trade}`);
  });

  it('seeds once per instance, however many turns read the list', async () => {
    const { FirestoreRepository } = await import('../../src/firestore.store.js');
    const repo = new FirestoreRepository();

    letWritesFinish();
    await repo.listPublishedTrades();
    await repo.listPublishedTrades();
    await repo.listPublishedTrades();

    // One write per trade in total. A seed repeated per request would be a write on every turn.
    expect(transactions).toEqual(TRADES.map((trade) => `schema/${trade}`));
  });
});
