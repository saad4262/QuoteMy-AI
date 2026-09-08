import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The nudge that runs a business's submission must not answer before the work is done.
 *
 * It used to: `void processSubmission(...)` and an immediate `accepted: true`. On a server that
 * outlives its own request that is correct. On Vercel the instance is frozen the moment the
 * response is sent, so the pipeline died before `claimSubmission` wrote a single field - and the
 * business watched "We are reading your details" for ever while the submission sat at `pending`.
 *
 * Nothing errored, and it was intermittent: a submission survived only when another request
 * happened to keep the instance warm. That is exactly the shape of bug a test has to hold down,
 * because reproducing it by hand means catching a cold start.
 */

const started: string[] = [];
let finish: () => void;
let finished: Promise<void>;

vi.mock('../../src/worker.js', () => ({
  processSubmission: async (uid: string, trade: string) => {
    started.push(`${uid}/${trade}`);
    await finished;
  },
  startWorker: () => undefined,
  sweepOnce: async () => 0,
}));

const { createApp } = await import('../../src/server.js');
const { MemoryRepository, setRepository } = await import('../../src/store.js');

/** A store that answers `firestore`, which is all the nudge asks of it. */
class NudgeableRepository extends MemoryRepository {
  override readonly kind = 'firestore' as const;
  override async getDescription() {
    return { uid: 'biz-1', trade: 'tiling' as const, text: 'a price list', status: 'pending' as const, submissionId: 'sub-1', files: [], createdAt: '', updatedAt: '' };
  }
}

const app = createApp();

beforeEach(() => {
  started.length = 0;
  setRepository(new NudgeableRepository());
  finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
});

describe('the process nudge', () => {
  it('does not answer until the pipeline has finished', async () => {
    let answered = false;
    const call = request(app)
      .post('/api/v1/business')
      .send({ action: 'process', businessUid: 'biz-1', trade: 'tiling' })
      .then((res) => {
        answered = true;
        return res;
      });

    // Long enough for a fire-and-forget handler to have answered several times over.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(started).toEqual(['biz-1/tiling']); // the work did start
    expect(answered).toBe(false); // and the response is still waiting on it

    finish();
    const res = await call;
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ accepted: true, submissionId: 'sub-1' });
  });

  /* A pipeline that throws has already written whatever answer it could. The nudge still answers,
     because the submission is left `pending` for the sweeper and a 500 here tells the business
     nothing it can act on. */
  it('still answers when the pipeline throws', async () => {
    setRepository(
      new (class extends NudgeableRepository {
        override async getDescription() {
          return { ...(await super.getDescription()), submissionId: 'sub-2' };
        }
      })(),
    );
    finish();
    finished = Promise.reject(new Error('model timed out'));
    finished.catch(() => undefined); // handled below, by the route

    const res = await request(app).post('/api/v1/business').send({ action: 'process', businessUid: 'biz-1', trade: 'tiling' });
    expect(res.status).toBe(200);
    expect(res.body.data.submissionId).toBe('sub-2');
  });
});
