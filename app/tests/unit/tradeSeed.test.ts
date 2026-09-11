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
const written: Record<string, Record<string, unknown>> = {};
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
        set: (ref: { path: string }, data: Record<string, unknown>) => {
          transactions.push(ref.path);
          written[ref.path] = data;
        },
      });
    },
  }),
}));

beforeEach(() => {
  transactions.length = 0;
  reads.length = 0;
  for (const key of Object.keys(written)) delete written[key];
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

  /**
   * What gets published is the CUSTOMER's list, not the extraction vocabulary.
   *
   * These are two different lists that happen to hold similar values, and the document is read by
   * exactly one side: the chat builds every multiple choice from it. Seeded from `vocab.ts`, the
   * removal question opened with "Ceramic tiles" instead of "Yes, take them up" - `any` is last in
   * the vocabulary and first on a screen - and offered "Adhesive only", which is a line on a price
   * list rather than anything a customer looking at a tiled floor would pick. Fencing's opened with
   * "Timber fence" for the same reason. Nothing errored; the questions were just wrong.
   */
  it('publishes what the customer is offered, not what the extractor accepts', async () => {
    const { FirestoreRepository } = await import('../../src/firestore.store.js');
    const { CUSTOMER_CORE } = await import('../../src/messages.js');
    const { TRADE_VOCAB } = await import('../../src/vocab.js');

    letWritesFinish();
    await new FirestoreRepository().seedTradeSchemas();

    for (const trade of TRADES) {
      const core = written[`schema/${trade}`]?.core as Record<string, string[]>;
      expect(core, trade).toEqual(CUSTOMER_CORE[trade]);
      // The answer to "is there any to take up?" comes first, because that is the question asked.
      expect(core.removes?.[0], trade).toBe('any');
    }

    // A value the extractor accepts but no customer would ever pick stays out of the choices.
    expect(TRADE_VOCAB.tiling.core.removes).toContain('adhesive');
    expect((written['schema/tiling']?.core as Record<string, string[]>).removes).not.toContain('adhesive');
  });

  /**
   * Firestore cannot hold an array directly inside an array, and it does not half-accept one: the
   * whole document is rejected.
   *
   * This shipped. `docHints.values` is a list of `[value, /pattern/]` pairs, and `publishable`
   * dropped the pattern and left `[["small"], ["large"]]` behind - so every `schema/{trade}` write
   * carrying `fields` was refused. Nothing broke visibly because the write is caught and logged as
   * a warning, and because fencing's and tiling's documents predate `fields` and are therefore
   * never rewritten. Kitchen was the first trade seeded after `fields` existed, so it was the first
   * whose document simply never appeared - and a customer typing "i need kitchen trade" was asked
   * to choose between Fencing and Tiling, because a trade with no document is not published.
   *
   * Checked by walking what is actually written rather than by asserting on `docHints`, so any
   * future spec key that cannot survive the trip is caught the first time it is added.
   */
  it('writes nothing Firestore will refuse', async () => {
    const { FirestoreRepository } = await import('../../src/firestore.store.js');

    letWritesFinish();
    await new FirestoreRepository().seedTradeSchemas();

    const nested: string[] = [];
    const walk = (value: unknown, path: string, insideArray: boolean): void => {
      if (Array.isArray(value)) {
        if (insideArray) nested.push(path);
        value.forEach((entry, i) => walk(entry, `${path}[${i}]`, true));
        return;
      }
      if (value && typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) walk(entry, `${path}.${key}`, false);
      }
    };

    for (const trade of TRADES) {
      const doc = written[`schema/${trade}`];
      expect(doc, `${trade} was never written`).toBeTruthy();
      walk(doc, `schema/${trade}`, false);
    }

    expect(nested, 'an array inside an array - Firestore rejects the whole document').toEqual([]);
  });

  /** The other half of the same rule: what cannot be published is not published at all. */
  it('leaves out the keys the reader takes from the code anyway', async () => {
    const { FirestoreRepository } = await import('../../src/firestore.store.js');

    letWritesFinish();
    await new FirestoreRepository().seedTradeSchemas();

    for (const trade of TRADES) {
      const fields = written[`schema/${trade}`]?.fields as Record<string, unknown>[];
      expect(fields?.length, trade).toBeGreaterThan(0);
      // A husk is worse than an absence: `structurallyUsable` overrides it from the code regardless.
      for (const field of fields) {
        expect(field, `${trade}.${String(field.key)}`).not.toHaveProperty('docHints');
        expect(field, `${trade}.${String(field.key)}`).not.toHaveProperty('namedBy');
      }
      // What a document IS for still goes out.
      expect(fields.every((f) => typeof f.key === 'string'), trade).toBe(true);
    }
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
